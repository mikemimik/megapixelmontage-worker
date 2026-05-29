import test from "node:test";
import assert from "node:assert";

import groupObjects from "./groupObjects.js";

test("groupObjects", async (t) => {
  await t.test("default return", async (t) => {
    const expectedResult = {
      minified: [],
      small: [],
      medium: [],
      large: [],
      images: [],
    };
    const actualResult = groupObjects([]);
    assert.deepEqual(actualResult, expectedResult);
  });

  await t.test("groupings", async () => {
    const mockItems = [
      { Key: "first.jpg" },
      { Key: "first-sm.jpg" },
      { Key: "first-lg.jpg" },
      { Key: "second.jpg" },
      { Key: "second-min.jpg" },
      { Key: "second-sm.jpg" },
      { Key: "third.jpg" },
      { Key: "third-md.jpg" },
      { Key: "forth.jpg" },
      { Key: "forth-lg.jpg" },
      { Key: "fifth.jpg" },
    ];

    const expectedResult = {
      minified: [{ Key: "second.jpg" }],
      small: [{ Key: "first.jpg" }, { Key: "second.jpg" }],
      medium: [{ Key: "third.jpg" }],
      large: [{ Key: "first.jpg" }, { Key: "forth.jpg" }],
      images: [
        { Key: "first.jpg" },
        { Key: "second.jpg" },
        { Key: "third.jpg" },
        { Key: "forth.jpg" },
        { Key: "fifth.jpg" },
      ],
    };

    const actualResult = groupObjects(mockItems);
    assert.deepEqual(actualResult, expectedResult);
  });

  await t.test("large", async (t) => {
    await t.test("should remove -lg from key", async (t) => {
      const mockItems = [
        {
          Key: "first-lg.jpg",
        },
      ];

      const expectedResult = {
        minified: [],
        small: [],
        medium: [],
        large: [
          {
            Key: "first.jpg",
          },
        ],
        images: [],
      };

      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });

    await t.test("should group large objects", async (t) => {
      const mockItems = [
        {
          Key: "first.jpg",
        },
        {
          Key: "second.jpg",
        },
        {
          Key: "first-lg.jpg",
        },
      ];

      const expectedResult = {
        minified: [],
        small: [],
        medium: [],
        large: [
          {
            Key: "first.jpg",
          },
        ],
        images: [
          {
            Key: "first.jpg",
          },
          {
            Key: "second.jpg",
          },
        ],
      };
      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });
  });

  await t.test("medium", async (t) => {
    await t.test("should remove -md from key", async (t) => {
      const mockItems = [
        {
          Key: "first-md.jpg",
        },
      ];

      const expectedResult = {
        minified: [],
        small: [],
        medium: [
          {
            Key: "first.jpg",
          },
        ],
        large: [],
        images: [],
      };

      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });

    await t.test("should group medium objects", async (t) => {
      const mockItems = [
        {
          Key: "first.jpg",
        },
        {
          Key: "second.jpg",
        },
        {
          Key: "first-md.jpg",
        },
      ];

      const expectedResult = {
        minified: [],
        small: [],
        medium: [
          {
            Key: "first.jpg",
          },
        ],
        large: [],
        images: [
          {
            Key: "first.jpg",
          },
          {
            Key: "second.jpg",
          },
        ],
      };
      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });
  });

  await t.test("small", async (t) => {
    await t.test("should remove -sm from key", async (t) => {
      const mockItems = [
        {
          Key: "first-sm.jpg",
        },
      ];

      const expectedResult = {
        minified: [],
        small: [
          {
            Key: "first.jpg",
          },
        ],
        medium: [],
        large: [],
        images: [],
      };

      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });

    await t.test("should group small objects", async (t) => {
      const mockItems = [
        {
          Key: "first.jpg",
        },
        {
          Key: "second.jpg",
        },
        {
          Key: "first-sm.jpg",
        },
      ];

      const expectedResult = {
        minified: [],
        small: [
          {
            Key: "first.jpg",
          },
        ],
        medium: [],
        large: [],
        images: [
          {
            Key: "first.jpg",
          },
          {
            Key: "second.jpg",
          },
        ],
      };
      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });
  });

  await t.test("minified", async (t) => {
    await t.test("should remove '-min' from key", async (t) => {
      const mockItems = [
        {
          Key: "first-min.jpg",
        },
      ];

      const expectedResult = {
        minified: [
          {
            Key: "first.jpg",
          },
        ],
        small: [],
        medium: [],
        large: [],
        images: [],
      };

      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });

    await t.test("should group minified objects", async (t) => {
      const mockItems = [
        {
          Key: "first.jpg",
        },
        {
          Key: "second.jpg",
        },
        {
          Key: "first-min.jpg",
        },
      ];

      const expectedResult = {
        minified: [
          {
            Key: "first.jpg",
          },
        ],
        small: [],
        medium: [],
        large: [],
        images: [
          {
            Key: "first.jpg",
          },
          {
            Key: "second.jpg",
          },
        ],
      };
      const actualResult = groupObjects(mockItems);
      assert.deepEqual(actualResult, expectedResult);
    });
  });
});
