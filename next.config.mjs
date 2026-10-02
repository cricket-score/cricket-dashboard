const pages = process.env.PAGES_EXPORT === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const config = {
  ...(pages ? { output: 'export', trailingSlash: true, images: { unoptimized: true } } : {}),
  basePath,
};
export default config;
