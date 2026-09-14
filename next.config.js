import './src/env.js';

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import("next").NextConfig} */
const config = {
  // The end-to-end suite builds into its own directory so it does not overwrite a running dev server's.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default withNextIntl(config);
