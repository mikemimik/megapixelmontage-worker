/**
 * @typedef {object} GroupedItems
 * @property {ObjectItem[]} unminified
 * @property {ObjectItem[]} unsmall
 * @property {ObjectItem[]} unmedium
 * @property {ObjectItem[]} unlarge
 */

/**
 * Object where the key is the `Key` of the item and the value is an array of
 * the values from the `GROUPS` object.
 * @typedef {Object.<string, string[]>} GroupedDifferences
 */

const GROUPS = {
  unminified: "-min",
  unsmall: "-sm",
  unmedium: "-md",
  unlarge: "-lg",
};

/**
 * @param {ObjectItem[]} items
 * @param {GroupedItems} groups
 * @returns {GroupedDifferences}
 */
export default function groupDifferences(items = [], groups = {}) {
  return items.reduce((acc, item) => {
    if (!acc[item.Key]) {
      acc[item.Key] = [];
    }

    for (const [group, identifier] of Object.entries(GROUPS)) {
      if (groups[group].some((i) => item.Key === i.Key)) {
        acc[item.Key] = acc[item.Key].concat(identifier);
      }
    }

    return acc;
  }, {});
}
