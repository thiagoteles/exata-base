import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { locales } from "./lib/i18n/locales";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./lib/i18n/request.ts",
  experimental: {
    // Generates declarations with literal message types, so keys and ICU arguments are type-checked
    // and every catalog can be compared with pt-BR.
    createMessagesDeclaration: locales.map((locale) => `./messages/${locale}.json`),
  },
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  experimental: {
    // The proxy buffers a request body up to this size. It matches the largest UPLOAD_MAX_MB the
    // environment accepts, plus room for the form around the file.
    proxyClientMaxBodySize: "101mb",
  },
  // The image ships only the traced server, not the whole node_modules.
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

/*
 * Editorial content is MDX. Plugins are named by string because Turbopack runs the loader in a
 * separate process and cannot receive functions. The YAML block at the top of a file becomes the
 * `frontmatter` export, which the page validates before rendering.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-mdx-frontmatter"],
  },
});

export default withNextIntl(withMDX(nextConfig));
