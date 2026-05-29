import test from "node:test";
import assert from "node:assert";
import sharp from "sharp";

import largifyTask from "./largify.js";

test("tasks/largify", async (t) => {
  await t.test("exports", () => {
    assert.equal(typeof largifyTask, "object", "should export an object");
    assert.ok(largifyTask["-lg"], "should have -lg property");
    assert.equal(
      typeof largifyTask["-lg"],
      "function",
      "should export a function"
    );
  });

  await t.test("returns configured Sharp instance", () => {
    const sharpInstance = sharp();
    const result = largifyTask["-lg"](sharpInstance);

    assert.ok(result, "should return a value");
    assert.equal(
      result.constructor.name,
      "Sharp",
      "should return a Sharp instance"
    );
  });

  await t.test("resizes to 1920px width maintaining aspect ratio", async () => {
    const inputImage = sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 4,
        background: { r: 255, g: 255, b: 0, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = largifyTask["-lg"];
    const configured = transformer(sharpInstance);

    const result = await new Promise((resolve, reject) => {
      const buffers = [];
      inputImage.pipe(configured);

      configured.on("data", (chunk) => buffers.push(chunk));
      configured.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      configured.on("error", reject);
    });

    const metadata = await sharp(result).metadata();
    assert.equal(metadata.width, 1920, "should resize to 1920px width");
    // Height should be proportionally scaled: 3000 * (1920/4000) = 1440
    assert.equal(
      metadata.height,
      1440,
      "should maintain aspect ratio (1440px height)"
    );
    assert.equal(metadata.format, "jpeg", "should convert to JPEG format");
  });

  await t.test("does not enlarge smaller images", async () => {
    const inputImage = sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 4,
        background: { r: 255, g: 255, b: 0, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = largifyTask["-lg"];
    const configured = transformer(sharpInstance);

    const result = await new Promise((resolve, reject) => {
      const buffers = [];
      inputImage.pipe(configured);

      configured.on("data", (chunk) => buffers.push(chunk));
      configured.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      configured.on("error", reject);
    });

    const metadata = await sharp(result).metadata();
    assert.equal(
      metadata.width,
      1600,
      "should not enlarge (withoutEnlargement: true)"
    );
    assert.equal(metadata.height, 1200, "should maintain original height");
  });

  await t.test("applies quality settings", async () => {
    const inputImage = sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 4,
        background: { r: 255, g: 255, b: 0, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = largifyTask["-lg"];
    const configured = transformer(sharpInstance);

    const result = await new Promise((resolve, reject) => {
      const buffers = [];
      inputImage.pipe(configured);

      configured.on("data", (chunk) => buffers.push(chunk));
      configured.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      configured.on("error", reject);
    });

    assert.ok(result.length > 0, "should produce output");
    assert.ok(result.length < 250000, "should compress with quality: 90");
  });
});
