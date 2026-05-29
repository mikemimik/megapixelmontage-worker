/**
 * @typedef {object} GroupedObjects
 * @property {ObjectItem[]} minified
 * @property {ObjectItem[]} small
 * @property {ObjectItem[]} medium
 * @property {ObjectItem[]} large
 * @property {ObjectItem[]} images
 */

const GROUPS = {
  minified: "-min",
  small: "-sm",
  medium: "-md",
  large: "-lg",
};

/**
 * @param {OjectItem[]} items
 * @returns {GroupedObjects}
 */
export default function groupObjects(items) {
  return items.reduce(
    (acc, item) => {
      const grouping = Object.entries(GROUPS).find(
        ([_group, slug]) => item.Key.indexOf(slug) !== -1,
      );

      if (grouping) {
        const [group, slug] = grouping;
        const Key = item.Key.replace(slug, "");
        acc[group].push({ Key });
      } else {
        acc.images.push(item);
      }

      return acc;
    },
    { minified: [], small: [], medium: [], large: [], images: [] },
  );
}
