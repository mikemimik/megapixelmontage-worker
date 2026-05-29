import { Readable, PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";

import { getLogger } from "./logger.js";

/**
 * @typedef {object} ImageObject
 * @property {string} ContentType
 * @property {Object.<string, string>} Metadata
 * @property {string} Key - Unique identifier of object
 * @property {Readable} readableStream
 */

/**
 * @typedef {import('sharp').Sharp} Sharp
 * @typedef {function(Sharp): Sharp} TransformerFunction
 * @typedef {Object.<string, TransformerFunction>} Transformer
 */

/**
 * Transforms an image using multiple transformers in parallel and uploads each result.
 * Uses streams to avoid loading entire images into memory.
 *
 * @param {ImageObject} imageObject - The image object with stream and metadata
 * @param {object}   options
 * @param {S3}       options.client - S3 client instance
 * @param {string}   options.bucket - Name of the bucket
 * @param {Transformer} options.transformers - Map of slug to transformer function
 * @returns {Promise<Array>} Promise that resolves when all uploads complete
 */
export default async function transformAndUpload(imageObject, options) {
  const { readableStream, ContentType, Metadata, Key } = imageObject;
  const { client, bucket, transformers } = options;
  const logger = getLogger("transformAndUpload");

  logger.trace({ imageObject, options }, "transformAndUpload:params");

  const lastDot = Key.lastIndexOf(".");
  const filename = lastDot === -1 ? Key : Key.slice(0, lastDot);
  const extension = lastDot === -1 ? "" : Key.slice(lastDot + 1);

  // Tee stream allows multiple Sharp pipelines to share the same input stream
  const teeStream = new PassThrough();
  const uploadPromises = [];

  logger.info(
    {
      imageKey: Key,
      transformerCount: Object.keys(transformers).length,
      transformers: Object.keys(transformers)
    },
    "starting parallel transformations"
  );

  // Create a separate pipeline for each transformer
  for (const [slug, transformer] of Object.entries(transformers)) {
    const fileKey = extension
      ? `${filename}${slug}.${extension}`
      : `${filename}${slug}`;

    // Create a Sharp instance and configure it with the transformer
    const sharpPipeline = sharp();
    const configuredPipeline = transformer(sharpPipeline);

    // Create output stream for this transformation
    const outputStream = new PassThrough();

    // Handle errors on the output stream
    outputStream.on("error", (err) => {
      logger.error({ err, fileKey }, "output stream error");
    });

    // Forward Sharp errors to the matching output stream so the Upload rejects
    // and sibling pipelines aren't left hanging on the tee.
    configuredPipeline.on("error", (err) => {
      logger.error({ err, fileKey }, "transform pipeline error");
      outputStream.destroy(err);
    });

    // Pipe: teeStream → Sharp (configured) → outputStream → S3 Upload
    teeStream.pipe(configuredPipeline);
    configuredPipeline.pipe(outputStream);

    // Create S3 upload from the output stream
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: fileKey,
        Body: outputStream,
        ContentType,
        Metadata,
        ACL: "public-read",
        ChecksumAlgorithm: "SHA256",
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 5, // 5 MB minimum for multipart parts
    });

    upload.on("httpUploadProgress", (progress) => {
      logger.debug({ progress, fileKey }, "upload progress");
    });

    uploadPromises.push(upload.done());
  }

  // Start streaming: readableStream → teeStream → (all Sharp pipelines in parallel)
  readableStream.pipe(teeStream);

  // Handle errors on the input stream
  readableStream.on("error", (err) => {
    logger.error({ err, Key }, "input stream error");
    teeStream.destroy(err);
  });

  // Wait for all uploads to complete
  logger.debug({ uploadCount: uploadPromises.length }, "waiting for uploads to complete");
  return Promise.all(uploadPromises);
}
