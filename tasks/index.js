import minify from "./minify.js";
import smallify from "./smallify.js";
import mediumify from "./mediumify.js";
import largify from "./largify.js";

/**
 * @typedef {import('sharp').Sharp} Sharp
 * @typedef {function(Sharp): Sharp} TransformerFunction
 */

/**
 * @typedef {object} TransformerMap
 * @property {TransformerFunction} [key]
 */

/**
 * Map of all available image transformation tasks.
 * Each task configures a Sharp instance for a specific transformation.
 *
 * @type {TransformerMap}
 * @default
 */
export default {
  ...minify,
  ...smallify,
  ...mediumify,
  ...largify,
};
