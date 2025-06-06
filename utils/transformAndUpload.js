import { Readable, PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";

import { getLogger } from "./logger.js";

/**
 * @param {Readable} stream
 */
function handleStreamError(stream) {
  return (err) => {
    console.error("error:", err);
    stream.emit("error", err);
  };
}

/**
 * @typedef {object} ImageObject
 * @property {string} ContentType
 * @property {Object.<string, string>} Metadata
 * @property {string} Key - Unique identifier of object
 * @property {Readable} readableStream
 */

/**
 * @param {ImageObject} imageObject
 * @param {object} options
 * @param {S3}     options.client - S3 client instance
 * @param {string} options.bucket - Name of the bucket
 */
export default async function transformAndUpload(imageObject, options) {
  const { readableStream, ContentType, Metadata, Key } = imageObject;
  const { client, bucket } = options;
  const logger = getLogger("transformAndUpload");

  logger.trace({ imageObject, options }, "transformAndUpload:params");

  const transformer = sharp().jpeg({ mozjpeg: true });
  const passThroughStream = new PassThrough();

  readableStream.pipe(transformer).pipe(passThroughStream);

  readableStream.on("error", handleStreamError(passThroughStream));
  transformer.on("error", handleStreamError(passThroughStream));

  const [filename, extension] = Key.split(".");
  const minifiedKey = `${filename}-min.${extension}`;

  logger.info({ minifiedKey }, "transforming and uploading image");

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: minifiedKey,
      Body: passThroughStream,
      ContentType,
      Metadata,
      ACL: "public-read",
      ChecksumAlgorithm: "SHA256",
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 5, // 5 MB minimum for multipart parts
  });

  upload.on("httpUploadProgress", (progress) => {
    logger.info({ progress }, "upload progress");
  });

  return upload.done();
}
