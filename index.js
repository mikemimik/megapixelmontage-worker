import "dotenv/config";

import { Readable, PassThrough } from "node:stream";

import { S3, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import { CronJob, CronTime } from "cron";
import lodash from "lodash";
import sharp from "sharp";

const { differenceBy } = lodash;

const {
  DO_SPACE_ACCESS_KEY_ID,
  DO_SPACE_SECRET_KEY,
  DO_SPACE_BUCKET,
  DO_SPACE_ENDPOINT,
  DO_SPACE_REGION,
} = process.env;

const s3Client = new S3({
  forcePathStyle: false,
  endpoint: DO_SPACE_ENDPOINT,
  region: DO_SPACE_REGION,
  credentials: {
    accessKeyId: DO_SPACE_ACCESS_KEY_ID,
    secretAccessKey: DO_SPACE_SECRET_KEY,
  },
});

async function fetchBucketObjects() {
  const command = new ListObjectsV2Command({
    Bucket: DO_SPACE_BUCKET,
  });

  const response = await s3Client.send(command);
  const { $metadata, Contents } = response;

  if ($metadata.httpStatusCode >= 300) {
    throw new Error("bad http status code", { cause: response });
  }

  return (
    Contents
      // INFO: reduce object
      .map(({ Key }) => ({ Key }))
      // INFO: filter out folders
      .filter(({ Key }) => !Key.endsWith("/"))
  );
}

/**
 * @param {Object} objectData
 * @param {string} objectData.Key
 */
async function fetchObject(objectData) {
  const { Key } = objectData;
  const command = new GetObjectCommand({
    Bucket: DO_SPACE_BUCKET,
    Key,
  });

  const response = await s3Client.send(command);
  const { $metadata, Body, ContentType, Metadata } = response;

  if ($metadata.httpStatusCode >= 300) {
    throw new Error("bad http status code", { cause: response });
  }

  return {
    readableStream: Body instanceof Readable ? Body : Readable.from(Body),
    ContentType,
    Metadata,
    Key,
  };
}

/**
 * @param {Object} imageObject
 * @param {string} imageObject.ContentType
 * @param {string} imageObject.Key
 * @param {Object} imageObject.Metadata
 * @param {Readable} imageObject.readableStream
 */
async function transformAndUpload(imageObject) {
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

/**
 * @param {Readable} stream
 */
function handleStreamError(stream) {
  return (err) => {
    console.error("error:", err);
    stream.emit("error", err);
  };
}

function groupObjects(items) {
  const { minified, images } = items.reduce(
    (acc, item) => {
      const isMinified = item.Key.indexOf("-min") !== -1;
      if (isMinified) {
        //INFO: minified image
        const Key = item.Key.replace("-min", "");
        acc.minified.push({ Key });
      } else {
        acc.images.push(item);
      }
      return acc;
    },
    { minified: [], images: [] },
  );

  return { minified, images };
}

async function handler(done) {
  try {
    const items = await fetchBucketObjects();

    const { minified, images } = groupObjects(items);

    const unminified = differenceBy(images, minified, "Key");

    for (const image of unminified) {
      const imageObject = await fetchObject(image);
      await transformAndUpload(imageObject);
    }
    done();
  } catch (err) {
    console.error(err);
  }
}

const job = CronJob.from({
  name: "minify-images",
  cronTime: "0 */4 */1 * *",
  onTick: handler,
  onComplete: () => {},
  errorHandler: (err) => {},
  start: false,
  waitForCompletion: true,
  timeZone: "UTC",
});
