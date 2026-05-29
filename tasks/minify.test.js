import test from "node:test";
import assert from "node:assert";
import sharp from "sharp";

import minifyTask from "./minify.js";

test("tasks/minify", async (t) => {
  await t.test("exports", () => {
    assert.equal(typeof minifyTask, "object", "should export an object");
    assert.ok(minifyTask["-min"], "should have -min property");
    assert.equal(
      typeof minifyTask["-min"],
      "function",
      "should export a function"
    );
  });

  await t.test("returns configured Sharp instance", () => {
    const sharpInstance = sharp();
    const result = minifyTask["-min"](sharpInstance);

    assert.ok(result, "should return a value");
    assert.equal(
      result.constructor.name,
      "Sharp",
      "should return a Sharp instance"
    );
  });

  await t.test("applies JPEG mozjpeg transformation", async () => {
    const inputImage = sharp({
      create: {
        width: 500,
        height: 300,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    }).jpeg(); // Test with JPEG input since that's what production uses

    const sharpInstance = sharp();
    const transformer = minifyTask["-min"];
    const configured = transformer(sharpInstance);

    // Pipe the test image through the configured pipeline
    const result = await new Promise((resolve, reject) => {
      const buffers = [];
      inputImage.pipe(configured);

      configured.on("data", (chunk) => buffers.push(chunk));
      configured.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      configured.on("error", reject);
    });

    // Verify the output
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, "jpeg", "should convert to JPEG format");
    assert.equal(metadata.width, 500, "should maintain width");
    assert.equal(metadata.height, 300, "should maintain height");
  });

  await t.test("produces compressed output", async () => {
    const inputImage = sharp({
      create: {
        width: 500,
        height: 300,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    }).png(); // Start with PNG

    const sharpInstance = sharp();
    const transformer = minifyTask["-min"];
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

    // JPEG with mozjpeg should produce a reasonably sized file
    assert.ok(
      result.length > 0,
      "should produce output"
    );
    assert.ok(
      result.length < 50000,
      "should compress the image (mozjpeg)"
    );
  });
});
