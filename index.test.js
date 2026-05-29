import test from "node:test";
import assert from "node:assert";
import lodash from "lodash";

const { differenceBy } = lodash;

import groupObjects from "./utils/groupObjects.js";
import groupDifferences from "./utils/groupDifferences.js";

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

test("index", async (t) => {
  await t.test("grouped differences", async () => {
    const { minified, small, medium, large, images } = groupObjects(mockItems);

    const unminified = differenceBy(images, minified, "Key");
    const unsmall = differenceBy(images, small, "Key");
    const unmedium = differenceBy(images, medium, "Key");
    const unlarge = differenceBy(images, large, "Key");

    assert.deepEqual(
      unminified,
      [
        { Key: "first.jpg" },
        { Key: "third.jpg" },
        { Key: "forth.jpg" },
        { Key: "fifth.jpg" },
      ],
      "should have unminified images",
    );
    assert.deepEqual(
      unsmall,
      [{ Key: "third.jpg" }, { Key: "forth.jpg" }, { Key: "fifth.jpg" }],
      "should have unsmall images",
    );
    assert.deepEqual(
      unmedium,
      [
        { Key: "first.jpg" },
        { Key: "second.jpg" },
        { Key: "forth.jpg" },
        { Key: "fifth.jpg" },
      ],
      "should have unmedium images",
    );
    assert.deepEqual(
      unlarge,
      [{ Key: "second.jpg" }, { Key: "third.jpg" }, { Key: "fifth.jpg" }],
      "should have unlarge images",
    );
    assert.deepEqual(
      images,
      [
        { Key: "first.jpg" },
        { Key: "second.jpg" },
        { Key: "third.jpg" },
        { Key: "forth.jpg" },
        { Key: "fifth.jpg" },
      ],
      "should have all images grouped",
    );
  });

  await t.test("images grouped by difference", async () => {
    const { minified, small, medium, large, images } = groupObjects(mockItems);

    const unminified = differenceBy(images, minified, "Key");
    const unsmall = differenceBy(images, small, "Key");
    const unmedium = differenceBy(images, medium, "Key");
    const unlarge = differenceBy(images, large, "Key");

    const groupedDifferences = groupDifferences(images, {
      unminified,
      unsmall,
      unmedium,
      unlarge,
    });

    assert.deepEqual(groupedDifferences, {
      "first.jpg": ["-min", "-md"],
      "second.jpg": ["-md", "-lg"],
      "third.jpg": ["-min", "-sm", "-lg"],
      "forth.jpg": ["-min", "-sm", "-md"],
      "fifth.jpg": ["-min", "-sm", "-md", "-lg"],
    });
  });
});
