import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

/**
 * @typedef ObjectData
 * @type {object}
 * @property {string} ContentType - ContentType of the object
 * @property {Object.<string, string>} Metadata
 * @property {string} Key - Unique identifier for object
 */

/**
 * @param {string} key - Key for the object being fetched
 * @param {object} options
 * @param {S3}     options.client - S3 client instance
 * @param {string} options.bucket - Name of the bucket
 * @returns {Promise<ObjectData>}
 */
export default async function fetchObject(key, options) {
  const { client, bucket } = options;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  const { $metadata, Body, ContentType, Metadata } = response;

  if ($metadata.httpStatusCode >= 300) {
    throw new Error("bad http status code", { cause: response });
  }

  return {
    readableStream: Body instanceof Readable ? Body : Readable.from(Body),
    ContentType,
    Metadata,
    Key: key,
  };
}
