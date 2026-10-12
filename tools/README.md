# Tools

Everything that is not the app but belongs to the product lives here: generators in other
languages, one-off analyses, a browser extension, video or image pipelines, data conversion for a
migration. Each tool gets its own folder, with its own README and its own dependencies if it needs
any.

This folder is outside the checks that guard the app on purpose. Biome, the TypeScript project,
knip and Vitest do not look inside it, and the production image does not copy it. The rules of the
app (text in the catalog, the clock as a parameter, import boundaries) do not apply here, and
nothing in the app may import from this folder.

Keep a tool here only while it earns its place. If it becomes something the product runs, it moves
into the app and follows the app's rules.
