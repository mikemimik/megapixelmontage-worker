import test, { mock } from "node:test";
import assert from "node:assert";
import EventEmitter from "node:events";

import sharp from "sharp";
import { createMockImport } from "mock-import";

function makeSharpJpegStream() {
  return sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 10, g: 20, b: 30, alpha: 1 },
    },
  }).jpeg();
}

class MockUpload extends EventEmitter {
  constructor(options) {
    super();

    const { client, params, queueSize, partSize } = options;
    const { Bucket, Key, Body, ContentType, Metadata, ACL, ChecksumAlgorithm } =
      params;

    this.bucket = Bucket;
    this.key = Key;
    this.stream = Body;
    this.contentType = ContentType;
    this.metadata = Metadata;
  }

  done() {
    return new Promise((resolve, reject) => {
      this.stream.on("data", (chunk) => {
        // Stream is flowing - we're not buffering in memory
      });

      this.stream.on("end", () => {
        resolve({
          Bucket: this.bucket,
          Key: this.key,
        });
      });

      this.stream.on("error", (err) => {
        reject(err);
      });
    });
  }
}

const { mockImport, reImport, stopAll } = createMockImport(import.meta.url);

test("transformAndUpload", async (t) => {
  await t.test("export", async () => {
    const transformAndUpload = await import("./transformAndUpload.js");
    assert.ok(transformAndUpload.default, "should have a default export");
    assert.equal(typeof transformAndUpload.default, "function");
  });

  // await t.test("success", async (t) => {
  //   mockImport("@aws-sdk/lib-storage", {
  //     Upload: MockUpload,
  //   });
  //
  //   const mockImageObject = {
  //     readableStream: sharp({
  //       create: {
  //         width: 300,
  //         height: 200,
  //         channels: 4,
  //         background: { r: 255, g: 0, b: 0, alpha: 0.5 },
  //       },
  //     }).jpeg(),
  //     ContentType: {},
  //     Metadata: {},
  //     Key: "mock-file.jpg",
  //   };
  //
  //   const mockOptions = {
  //     client: null,
  //     bucket: "mockBucket",
  //     transformers: {
  //       "-min": (sharp) => {
  //         return sharp.clone();
  //       },
  //     },
  //   };
  //
  //   const transformAndUpload = await reImport("./transformAndUpload.js");
  //
  //   console.log("HELLO:", transformAndUpload);
  //
  //   await transformAndUpload.default(mockImageObject, mockOptions);
  //
  //   stopAll();
  // });

  await t.test("parallel execution of multiple transformers", async (t) => {
    // Track upload instances to verify stream usage
    const uploadInstances = [];

    class TrackingMockUpload extends MockUpload {
      constructor(options) {
        super(options);
        uploadInstances.push(this);
      }
    }

    mockImport("@aws-sdk/lib-storage", {
      Upload: TrackingMockUpload,
    });

    // Track which transformers were called and verify they return Sharp instances
    const transformerCalls = [];

    const mockImageObject = {
      readableStream: sharp({
        create: {
          width: 300,
          height: 200,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 },
        },
      }).jpeg(),
      ContentType: "image/jpeg",
      Metadata: { original: "true" },
      Key: "test-image.jpg",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: {
        "-min": (sharpInstance) => {
          transformerCalls.push({
            slug: "-min",
            receivedSharp: !!sharpInstance,
          });
          // Configure and return the sharp instance for minification
          const configured = sharpInstance.jpeg({ mozjpeg: true });
          assert.ok(
            configured.constructor.name === "Sharp",
            "transformer should return a Sharp instance",
          );
          return configured;
        },
        "-sm": (sharpInstance) => {
          transformerCalls.push({
            slug: "-sm",
            receivedSharp: !!sharpInstance,
          });
          // Configure and return the sharp instance for small size
          const configured = sharpInstance.resize(500).jpeg({ quality: 80 });
          assert.ok(
            configured.constructor.name === "Sharp",
            "transformer should return a Sharp instance",
          );
          return configured;
        },
        "-md": (sharpInstance) => {
          transformerCalls.push({
            slug: "-md",
            receivedSharp: !!sharpInstance,
          });
          // Configure and return the sharp instance for medium size
          const configured = sharpInstance.resize(1000).jpeg({ quality: 85 });
          assert.ok(
            configured.constructor.name === "Sharp",
            "transformer should return a Sharp instance",
          );
          return configured;
        },
        "-lg": (sharpInstance) => {
          transformerCalls.push({
            slug: "-lg",
            receivedSharp: !!sharpInstance,
          });
          // Configure and return the sharp instance for large size
          const configured = sharpInstance.resize(2000).jpeg({ quality: 90 });
          assert.ok(
            configured.constructor.name === "Sharp",
            "transformer should return a Sharp instance",
          );
          return configured;
        },
      },
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");

    // Execute the function - should process all transformers in parallel
    const results = await transformAndUpload.default(
      mockImageObject,
      mockOptions,
    );

    // Verify all transformers were called
    assert.equal(transformerCalls.length, 4, "should call all 4 transformers");
    assert.ok(
      transformerCalls.every((call) => call.receivedSharp),
      "each transformer should receive a Sharp instance",
    );

    // Verify results array contains all uploads
    assert.ok(Array.isArray(results), "should return an array of results");
    assert.equal(results.length, 4, "should return 4 upload results");

    // Verify correct file keys were created
    const uploadedKeys = results.map((r) => r.Key).sort();
    const expectedKeys = [
      "test-image-min.jpg",
      "test-image-sm.jpg",
      "test-image-md.jpg",
      "test-image-lg.jpg",
    ].sort();

    assert.deepEqual(
      uploadedKeys,
      expectedKeys,
      "should create correct file keys for each transformation",
    );

    // Verify all uploads used the same bucket
    assert.ok(
      results.every((r) => r.Bucket === "test-bucket"),
      "all uploads should use the same bucket",
    );

    // Verify that streams (not buffers) were used for uploads
    assert.equal(uploadInstances.length, 4, "should create 4 upload instances");
    assert.ok(
      uploadInstances.every((upload) => upload.stream && upload.stream.pipe),
      "each upload should use a stream (has pipe method)",
    );

    stopAll();
  });

  await t.test("propagates ContentType and Metadata to every Upload", async () => {
    const uploadInstances = [];

    class TrackingMockUpload extends MockUpload {
      constructor(options) {
        super(options);
        uploadInstances.push(this);
      }
    }

    mockImport("@aws-sdk/lib-storage", { Upload: TrackingMockUpload });

    const mockImageObject = {
      readableStream: makeSharpJpegStream(),
      ContentType: "image/jpeg",
      Metadata: { original: "true", source: "unit-test" },
      Key: "photo.jpg",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: {
        "-min": (s) => s.jpeg({ mozjpeg: true }),
        "-sm": (s) => s.resize(500).jpeg({ quality: 80 }),
      },
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");
    await transformAndUpload.default(mockImageObject, mockOptions);

    assert.equal(uploadInstances.length, 2);
    assert.ok(
      uploadInstances.every((u) => u.contentType === "image/jpeg"),
      "every Upload should receive the source ContentType",
    );
    assert.ok(
      uploadInstances.every(
        (u) =>
          u.metadata &&
          u.metadata.original === "true" &&
          u.metadata.source === "unit-test",
      ),
      "every Upload should receive the source Metadata",
    );

    stopAll();
  });

  await t.test("pipes source stream only once (fetch-once invariant)", async () => {
    mockImport("@aws-sdk/lib-storage", { Upload: MockUpload });

    const source = makeSharpJpegStream();
    let pipeCount = 0;
    const originalPipe = source.pipe.bind(source);
    source.pipe = (...args) => {
      pipeCount += 1;
      return originalPipe(...args);
    };

    const mockImageObject = {
      readableStream: source,
      ContentType: "image/jpeg",
      Metadata: {},
      Key: "photo.jpg",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: {
        "-min": (s) => s.jpeg({ mozjpeg: true }),
        "-sm": (s) => s.resize(500).jpeg({ quality: 80 }),
        "-md": (s) => s.resize(1000).jpeg({ quality: 85 }),
        "-lg": (s) => s.resize(2000).jpeg({ quality: 90 }),
      },
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");
    await transformAndUpload.default(mockImageObject, mockOptions);

    assert.equal(
      pipeCount,
      1,
      "source stream should be piped exactly once regardless of transformer count",
    );

    stopAll();
  });

  await t.test("splits Key on the last dot (multi-dot keys)", async () => {
    const uploadInstances = [];
    class TrackingMockUpload extends MockUpload {
      constructor(options) {
        super(options);
        uploadInstances.push(this);
      }
    }
    mockImport("@aws-sdk/lib-storage", { Upload: TrackingMockUpload });

    const mockImageObject = {
      readableStream: makeSharpJpegStream(),
      ContentType: "image/jpeg",
      Metadata: {},
      Key: "folder.v2/photo.original.jpg",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: { "-min": (s) => s.jpeg({ mozjpeg: true }) },
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");
    await transformAndUpload.default(mockImageObject, mockOptions);

    assert.equal(uploadInstances.length, 1);
    assert.equal(
      uploadInstances[0].key,
      "folder.v2/photo.original-min.jpg",
      "should split on the last dot, preserving earlier dots",
    );

    stopAll();
  });

  await t.test("handles Keys with no extension", async () => {
    const uploadInstances = [];
    class TrackingMockUpload extends MockUpload {
      constructor(options) {
        super(options);
        uploadInstances.push(this);
      }
    }
    mockImport("@aws-sdk/lib-storage", { Upload: TrackingMockUpload });

    const mockImageObject = {
      readableStream: makeSharpJpegStream(),
      ContentType: "image/jpeg",
      Metadata: {},
      Key: "photo",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: { "-min": (s) => s.jpeg({ mozjpeg: true }) },
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");
    await transformAndUpload.default(mockImageObject, mockOptions);

    assert.equal(uploadInstances.length, 1);
    assert.equal(
      uploadInstances[0].key,
      "photo-min",
      "no trailing dot should be appended when Key has no extension",
    );

    stopAll();
  });

  await t.test("rejects when a transformer pipeline errors", async () => {
    mockImport("@aws-sdk/lib-storage", { Upload: MockUpload });

    const source = makeSharpJpegStream();
    // Swallow late errors from the Sharp source after pipelines are torn down,
    // so they don't leak into the next test as unhandled events.
    source.on("error", () => {});

    const mockImageObject = {
      readableStream: source,
      ContentType: "image/jpeg",
      Metadata: {},
      Key: "photo.jpg",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: {
        "-ok": (s) => s.jpeg(),
        "-boom": (s) => {
          const configured = s.jpeg();
          configured.on("error", () => {});
          queueMicrotask(() => configured.emit("error", new Error("boom")));
          return configured;
        },
      },
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");

    await assert.rejects(
      transformAndUpload.default(mockImageObject, mockOptions),
      /boom/,
      "should reject with the transformer error",
    );

    stopAll();
  });

  await t.test("is a no-op when transformers is empty", async () => {
    const uploadInstances = [];
    class TrackingMockUpload extends MockUpload {
      constructor(options) {
        super(options);
        uploadInstances.push(this);
      }
    }
    mockImport("@aws-sdk/lib-storage", { Upload: TrackingMockUpload });

    const mockImageObject = {
      readableStream: makeSharpJpegStream(),
      ContentType: "image/jpeg",
      Metadata: {},
      Key: "photo.jpg",
    };

    const mockOptions = {
      client: null,
      bucket: "test-bucket",
      transformers: {},
    };

    const transformAndUpload = await reImport("./transformAndUpload.js");
    const results = await transformAndUpload.default(mockImageObject, mockOptions);

    assert.deepEqual(results, [], "should resolve to an empty array");
    assert.equal(
      uploadInstances.length,
      0,
      "should not construct any Upload instances",
    );

    stopAll();
  });
});
