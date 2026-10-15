import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { locales } from "./lib/i18n/locales";
import { movedAddresses } from "./lib/redirects";
import { securityHeaders } from "./lib/security/headers";
import { productTracingIncludes } from "./next.config.product";

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
  // MDX among the page extensions, as the MDX guide sets it: webpack gives only these files the
  // server's own React, and an article compiled without it fails on its first element.
  pageExtensions: ["ts", "tsx", "mdx"],
  poweredByHeader: false,
  // No webpack cache in development. Each route the server compiles read packs back from the disk
  // cache and kept them, about 12 MB of heap a route that never left: an empty route cost 22 MB
  // with it and 10 MB without. Compiling took the same time either way (the first page about a
  // second longer from a cold start), and a change in a file was recompiled as fast.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  // Always written into the bundles, empty when the build has no Clerk key: the bundler can then drop
  // the Clerk branch of the auth screens from a local build. A NEXT_PUBLIC_ variable that is not set
  // is left as a runtime read, and the branch stays in every page.
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] ?? "",
  },
  // The development server keeps every route it has compiled. By default it drops a route idle for
  // a minute and compiles it again on the next visit, and each of those compiles stays in memory
  // (Next does not unload server modules): the same 18 routes grew 600 MB a round until the
  // restart, and held at 1.3 GB when nothing was dropped.
  onDemandEntries: { maxInactiveAge: 24 * 60 * 60 * 1000, pagesBufferLength: 1000 },
  experimental: {
    // The proxy buffers a request body up to this size. It matches the largest UPLOAD_MAX_MB the
    // environment accepts, plus room for the form around the file.
    proxyClientMaxBodySize: "101mb",
    // The app builds and develops with webpack for now, the more settled of the two bundlers here.
    // This trades a little compile time for a lower peak.
    webpackMemoryOptimizations: true,
  },
  // The image ships only the traced server, not the whole node_modules.
  output: "standalone",
  // Server SDKs stay in node_modules and are loaded by Node, not compiled by the bundler. Every
  // page reaches the ports (auth, e-mail, payment, log, database), and compiling these packages for
  // each server layer, and reloading them after every compile, was most of the development
  // server's memory: with them and zod left out, a new route costs about 30 MB of heap, not 45.
  // Google's SDKs also read their own files at run time, which no bundle holds. The tracer copies
  // each of them into the image.
  serverExternalPackages: [
    "@google-cloud/logging",
    "@google-cloud/storage",
    "google-gax",
    "stripe",
    "better-auth",
    "@better-auth/core",
    "kysely",
    "nodemailer",
    "@react-email/render",
    "@react-email/components",
    "postgres",
    "drizzle-orm",
    "@clerk/backend",
    "jose",
    "zod",
  ],
  headers: () => Promise.resolve([{ source: "/(.*)", headers: [...securityHeaders] }]),
  redirects: () => Promise.resolve(movedAddresses.map((moved) => ({ ...moved, permanent: true }))),
  // Files read at run time through a path the tracer cannot follow: the face PDFs use, and the
  // standard fonts pdfkit loads through its package's own import map, which the tracer skips.
  outputFileTracingIncludes: {
    "/account/receipts/*": [
      "./assets/fonts/**/*",
      "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*",
    ],
    ...Object.fromEntries(
      Object.entries(productTracingIncludes).map(([route, files]) => [route, [...files]]),
    ),
  },
};

/*
 * Editorial content is MDX. Plugins are named by string, which any bundler can load. The YAML block at the top of a file becomes the
 * `frontmatter` export, which the page validates before rendering.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-mdx-frontmatter"],
  },
});

export default withNextIntl(withMDX(nextConfig));
