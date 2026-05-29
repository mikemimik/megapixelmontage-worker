import test from "node:test";
import assert from "node:assert";

import tasks from "./index.js";

test("tasks:index", async (t) => {
  await t.test("exports", async () => {
    assert.equal(typeof tasks, "object", "should export an object");
    const actualKeys = Object.keys(tasks).sort();

    const expectedKeys = ["-min", "-sm", "-md", "-lg"].sort();

    assert.deepEqual(
      actualKeys,
      expectedKeys,
      "should export all transformation tasks"
    );

    // Verify each is a function
    for (const key of expectedKeys) {
      assert.equal(
        typeof tasks[key],
        "function",
        `${key} should be a function`
      );
    }
  });
});
