/** @module tasks/mediumify */

/**
 * @typedef {import('sharp').Sharp} Sharp
 */

/**
 * @typedef {function(Sharp): Sharp} TransformerFunction
 */

/**
 * @typedef {object} TransformerMap
 * @property {TransformerFunction} "-md" - Mediumify transformer function
 */

/**
 * Mediumify transformer - resizes image to medium width (1024px)
 *
 * @type {TransformerMap}
 * @default
 */
export default {
  "-md": function mediumify(sharp) {
    return sharp.resize(1024, null, {
      fit: "inside",
      withoutEnlargement: true,
    }).jpeg({ quality: 88 });
  },
};
