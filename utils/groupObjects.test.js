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

  await t.test("should groups objects", async (t) => {
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
