import "dotenv/config";
import pino from "pino";
import { CronJob, CronTime } from "cron";
import lodash from "lodash";

import createClient from "./utils/createClient.js";
import fetchBucketObjects from "./utils/fetchBucketObjects.js";
import fetchObject from "./utils/fetchObject.js";
import groupObjects from "./utils/groupObjects.js";
import groupDifferences from "./utils/groupDifferences.js";
import transformAndUpload from "./utils/transformAndUpload.js";

import { createLogger, getLogger } from "./utils/logger.js";

import transformationTasks from "./tasks/index.js";

const { differenceBy } = lodash;

const {
  DO_SPACE_ACCESS_KEY_ID,
  DO_SPACE_SECRET_KEY,
  DO_SPACE_BUCKET,
  DO_SPACE_ENDPOINT,
  DO_SPACE_REGION,
  LOG_LEVEL = "info",
} = process.env;

const logger = createLogger({ level: LOG_LEVEL });

/**
 * @typedef {import('sharp').Sharp} Sharp
 * @typedef {function(Sharp): Readable} TransformerFunction
 */

async function handler(done) {
  try {
    const logger = getLogger("handler");

    const s3Client = createClient({
      endpoint: DO_SPACE_ENDPOINT,
      region: DO_SPACE_REGION,
      accessKeyId: DO_SPACE_ACCESS_KEY_ID,
      secretAccessKey: DO_SPACE_SECRET_KEY,
    });

    logger.info("processing started");

    const items = await fetchBucketObjects({
      client: s3Client,
      bucket: DO_SPACE_BUCKET,
    });
    logger.trace({ items }, "fetchBucketObjects:result");

    const { minified, small, medium, large, images } = groupObjects(items);
    logger.trace(
      { minified, small, medium, large, images },
      "groupObjects:result",
    );

    const unminified = differenceBy(images, minified, "Key");
    const unsmall = differenceBy(images, small, "Key");
    const unmedium = differenceBy(images, medium, "Key");
    const unlarge = differenceBy(images, large, "Key");

    logger.debug(
      { unminified, unsmall, unmedium, unlarge },
      "differenceBy:result",
    );

    const groupedDifferences = groupDifferences(images, {
      unminified,
      unsmall,
      unmedium,
      unlarge,
    });

    logger.debug({ groupedDifferences }, "groupDifferences:result");

    for (const [imageKey, tasks] of Object.entries(groupedDifferences)) {
      if (tasks.length === 0) continue;

      const imageObject = await fetchObject(imageKey, {
        client: s3Client,
        bucket: DO_SPACE_BUCKET,
      });

      logger.info({ imageKey, tasks }, "processing image");

      const transformers = Object.fromEntries(
        tasks.map((slug) => [slug, transformationTasks[slug]]),
      );

      await transformAndUpload(imageObject, {
        client: s3Client,
        bucket: DO_SPACE_BUCKET,
        transformers,
      });
    }

    logger.info("processing completed");
    done({
      listedImages: items.length,
      minifiedImages: minified.length,
      totalImages: images.length,
      unminifiedImages: unminified.length,
    });
  } catch (err) {
    logger.error({ err }, "unexpected error occourred");
    throw err;
  }
}

logger.info("job creating");

const MINUTELY_CRON = "*/1 * * * *";
const HOURLY_CRON = "0 */1 * * *";
const EVERY_4TH_HOUR_CRON = "0 */4 */1 * *";

const onComplete = (data) => {
  const logger = getLogger("onComplete");
  logger.info({ data }, "processed information");
};

const errorHandler = (err) => {
  const logger = getLogger("errorHandler");
  logger.error({ err }, "error occurred");
};

// handler(onComplete);

const job = CronJob.from({
  name: "minify-images",
  cronTime: HOURLY_CRON,
  onTick: handler,
  onComplete,
  errorHandler,
  start: false,
  waitForCompletion: true,
  timeZone: "UTC",
});

logger.info(
  {
    job: {
      isActive: job.isActive,
      isCallbackRunning: job.isCallbackRunning,
    },
  },
  "job starting",
);

job.start();

logger.info(
  {
    job: {
      isActive: job.isActive,
      isCallbackRunning: job.isCallbackRunning,
      next: job.nextDates(4),
    },
  },
  "job started",
);
