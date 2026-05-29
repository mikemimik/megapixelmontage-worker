import test from "node:test";
import assert from "node:assert";
import sharp from "sharp";

import smallifyTask from "./smallify.js";

test("tasks/smallify", async (t) => {
  await t.test("exports", () => {
    assert.equal(typeof smallifyTask, "object", "should export an object");
    assert.ok(smallifyTask["-sm"], "should have -sm property");
    assert.equal(
      typeof smallifyTask["-sm"],
      "function",
      "should export a function"
    );
  });

  await t.test("returns configured Sharp instance", () => {
    const sharpInstance = sharp();
    const result = smallifyTask["-sm"](sharpInstance);

    assert.ok(result, "should return a value");
    assert.equal(
      result.constructor.name,
      "Sharp",
      "should return a Sharp instance"
    );
  });

  await t.test("resizes to 640px width maintaining aspect ratio", async () => {
    const inputImage = sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = smallifyTask["-sm"];
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
    assert.equal(metadata.width, 640, "should resize to 640px width");
    assert.equal(metadata.height, 480, "should maintain aspect ratio (480px height)");
    assert.equal(metadata.format, "jpeg", "should convert to JPEG format");
  });

  await t.test("does not enlarge smaller images", async () => {
    const inputImage = sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = smallifyTask["-sm"];
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
      400,
      "should not enlarge (withoutEnlargement: true)"
    );
    assert.equal(metadata.height, 300, "should maintain original height");
  });

  await t.test("applies quality settings", async () => {
    const inputImage = sharp({
      create: {
        width: 1000,
        height: 800,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = smallifyTask["-sm"];
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
    assert.ok(result.length < 100000, "should compress with quality: 85");
  });
});
