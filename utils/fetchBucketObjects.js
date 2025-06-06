import { ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * @typedef {object} ObjectItem
 * @property {string} Key
 */

/**
 * @param {Object} options
 * @param {string} options.bucket
 * @param {Object} options.client
 * @returns {Promise<ObjectItem[]>}
 */
export default async function fetchBucketObjects({ client, bucket }) {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
  });

  const response = await client.send(command);
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
