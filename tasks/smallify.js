/** @module tasks/smallify */

/**
 * @typedef {import('sharp').Sharp} Sharp
 */

/**
 * @typedef {function(Sharp): Sharp} TransformerFunction
 */

/**
 * @typedef {object} TransformerMap
 * @property {TransformerFunction} "-sm" - Smallify transformer function
 */

/**
 * Smallify transformer - resizes image to small width (640px)
 *
 * @type {TransformerMap}
 * @default
 */
export default {
  "-sm": function smallify(sharp) {
    return sharp.resize(640, null, {
      fit: "inside",
      withoutEnlargement: true,
    }).jpeg({ quality: 85 });
  },
};
