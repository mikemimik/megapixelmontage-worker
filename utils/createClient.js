import { S3 } from "@aws-sdk/client-s3";

let client = null;

/**
 * @param {Object} options
 * @param {string} options.endpoint - Endpoint url for bucket
 * @param {string} options.region - Region for the bucket
 * @param {string} options.accessKeyId
 * @param {string} options.secretAccessKey
 * @returns {S3}
 */
export default function createClient(options) {
  const { endpoint, region, accessKeyId, secretAccessKey } = options;

  if (client) {
    return client;
  }

  client = new S3({
    forcePathStyle: false,
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return client;
}
