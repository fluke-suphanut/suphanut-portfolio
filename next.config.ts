import type { NextConfig } from "next";

// ADR-0001: static export served by Cloudflare Workers Static Assets.
// The database is read only during `next build`; `out/` holds plain files.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
