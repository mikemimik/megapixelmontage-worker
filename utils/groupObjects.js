/**
 * @typedef {object} GroupedObjects
 * @property {ObjectItem[]} minified
 * @property {ObjectItem[]} images
 */

/**
 * @param {OjectItem[]} items
 * @returns {GroupedObjects}
 */
export default function groupObjects(items) {
  const { minified, images } = items.reduce(
    (acc, item) => {
      const isMinified = item.Key.indexOf("-min") !== -1;
      if (isMinified) {
        //INFO: minified image
        const Key = item.Key.replace("-min", "");
        acc.minified.push({ Key });
      } else {
        acc.images.push(item);
      }
      return acc;
    },
    { minified: [], images: [] },
  );

  return { minified, images };
}
