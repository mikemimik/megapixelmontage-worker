/** @module tasks/largify */

/**
 * @typedef {import('sharp').Sharp} Sharp
 */

/**
 * @typedef {function(Sharp): Sharp} TransformerFunction
 */

/**
 * @typedef {object} TransformerMap
 * @property {TransformerFunction} "-lg" - Largify transformer function
 */

/**
 * Largify transformer - resizes image to large width (1920px)
 *
 * @type {TransformerMap}
 * @default
 */
export default {
  "-lg": function largify(sharp) {
    return sharp.resize(1920, null, {
      fit: "inside",
      withoutEnlargement: true,
    }).jpeg({ quality: 90 });
  },
};
