import './src/env.js';

/** @type {import("next").NextConfig} */
const config = {
  // The end-to-end suite builds into its own directory so it does not overwrite a running dev server's.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default config;
