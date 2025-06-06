import "dotenv/config";

import { CronJob, CronTime } from "cron";
import lodash from "lodash";

import createClient from "./utils/createClient.js";
import fetchBucketObjects from "./utils/fetchBucketObjects.js";
import fetchObject from "./utils/fetchObject.js";
import groupObjects from "./utils/groupObjects.js";
import transformAndUpload from "./utils/transformAndUpload.js";

const { differenceBy } = lodash;

const {
  DO_SPACE_ACCESS_KEY_ID,
  DO_SPACE_SECRET_KEY,
  DO_SPACE_BUCKET,
  DO_SPACE_ENDPOINT,
  DO_SPACE_REGION,
} = process.env;

async function handler(done) {
  try {
    const s3Client = createClient({
      endpoint: DO_SPACE_ENDPOINT,
      region: DO_SPACE_REGION,
      accessKeyId: DO_SPACE_ACCESS_KEY_ID,
      secretAccessKey: DO_SPACE_SECRET_KEY,
    });

    const items = await fetchBucketObjects({
      client: s3Client,
      bucket: DO_SPACE_BUCKET,
    });

    const { minified, images } = groupObjects(items);

    const unminified = differenceBy(images, minified, "Key");

    for (const image of unminified) {
      const imageObject = await fetchObject(image.Key, {
        client: s3Client,
        bucket: DO_SPACE_BUCKET,
      });
      await transformAndUpload(imageObject, {
        client: s3Client,
        bucket: DO_SPACE_BUCKET,
      });
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
