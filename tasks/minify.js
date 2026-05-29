/** @module tasks/minify */

/**
 * @typedef {import('sharp').Sharp} Sharp
 */

/**
 * @typedef {function(Sharp): Sharp} TransformerFunction
 */

/**
 * @typedef {object} TransformerMap
 * @property {TransformerFunction} "-min" - Minify transformer function
 */

/**
 * Minify transformer - converts image to JPEG with mozjpeg compression
 *
 * @type {TransformerMap}
 * @default
 */
export default {
  "-min": function minify(sharp) {
    return sharp.jpeg({ mozjpeg: true });
  },
};
