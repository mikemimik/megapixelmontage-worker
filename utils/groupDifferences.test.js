import test from "node:test";
import assert from "node:assert";

import groupDifferences from "./groupDifferences.js";

const mockItems = [
  { Key: "first.jpg" },
  { Key: "second.jpg" },
  { Key: "third.jpg" },
  { Key: "forth.jpg" },
  { Key: "fifth.jpg" },
];

const mockUnminified = [{ Key: "first.jpg" }];
const mockUnsmall = [{ Key: "first.jpg" }, { Key: "second.jpg" }];
const mockUnmedium = [{ Key: "first.jpg" }];
const mockUnlarge = [{ Key: "first.jpg" }, { Key: "fifth.jpg" }];

const mockGroups = {
  unminified: mockUnminified,
  unsmall: mockUnsmall,
  unmedium: mockUnmedium,
  unlarge: mockUnlarge,
};

test("groupDifferences", async (t) => {
  await t.test("default return", async () => {
    const expectedResult = {};
    const actualResult = groupDifferences();
    assert.deepEqual(actualResult, expectedResult);
  });

  await t.test("should group differences", async () => {
    const expectedResult = {
      "first.jpg": ["-min", "-sm", "-md", "-lg"],
      "second.jpg": ["-sm"],
      "third.jpg": [],
      "forth.jpg": [],
      "fifth.jpg": ["-lg"],
    };
    const actualResult = groupDifferences(mockItems, mockGroups);
    assert.deepEqual(actualResult, expectedResult);
  });
});
