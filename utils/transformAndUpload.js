import { Readable, PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";

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
 * @param {Object} imageObject
 * @param {string} imageObject.ContentType
 * @param {string} imageObject.Key - Unique identifier of object
 * @param {Object.<string, string>} imageObject.Metadata
 * @param {Readable} imageObject.readableStream
 */
export default async function transformAndUpload(imageObject) {
  const { readableStream, ContentType, Metadata, Key } = imageObject;

  const transformer = sharp().jpeg({ mozjpeg: true });
  const passThroughStream = new PassThrough();

  readableStream.pipe(transformer).pipe(passThroughStream);

  readableStream.on("error", handleStreamError(passThroughStream));
  transformer.on("error", handleStreamError(passThroughStream));

  const [filename, extension] = Key.split(".");
  const minifiedKey = `${filename}-min.${extension}`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: DO_SPACE_BUCKET,
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
    console.log(`Upload progress: ${progress.loaded}/${progress.total || "?"}`);
  });

  return upload.done();
}
