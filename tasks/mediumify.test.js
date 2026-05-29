import test from "node:test";
import assert from "node:assert";
import sharp from "sharp";

import mediumifyTask from "./mediumify.js";

test("tasks/mediumify", async (t) => {
  await t.test("exports", () => {
    assert.equal(typeof mediumifyTask, "object", "should export an object");
    assert.ok(mediumifyTask["-md"], "should have -md property");
    assert.equal(
      typeof mediumifyTask["-md"],
      "function",
      "should export a function"
    );
  });

  await t.test("returns configured Sharp instance", () => {
    const sharpInstance = sharp();
    const result = mediumifyTask["-md"](sharpInstance);

    assert.ok(result, "should return a value");
    assert.equal(
      result.constructor.name,
      "Sharp",
      "should return a Sharp instance"
    );
  });

  await t.test("resizes to 1024px width maintaining aspect ratio", async () => {
    const inputImage = sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = mediumifyTask["-md"];
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
    assert.equal(metadata.width, 1024, "should resize to 1024px width");
    // Height should be proportionally scaled: 2000 * (1024/3000) ≈ 683
    assert.ok(
      Math.abs(metadata.height - 683) <= 1,
      "should maintain aspect ratio (~683px height)"
    );
    assert.equal(metadata.format, "jpeg", "should convert to JPEG format");
  });

  await t.test("does not enlarge smaller images", async () => {
    const inputImage = sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = mediumifyTask["-md"];
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
      800,
      "should not enlarge (withoutEnlargement: true)"
    );
    assert.equal(metadata.height, 600, "should maintain original height");
  });

  await t.test("applies quality settings", async () => {
    const inputImage = sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 },
      },
    }).jpeg();

    const sharpInstance = sharp();
    const transformer = mediumifyTask["-md"];
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
    assert.ok(result.length < 150000, "should compress with quality: 88");
  });
});
