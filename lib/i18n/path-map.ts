/*
 * Matching between two address shapes, such as `/lotteries/[game]` and `/loterias/[game]`. A
 * `[name]` segment matches exactly one segment of the address and carries its value across. Pure,
 * so the proxy, links and the sitemap all translate addresses the same way.
 */

type Params = Record<string, string>;

const segments = (path: string) => path.split("/").filter((segment) => segment !== "");

const dynamicName = (segment: string) =>
  segment.startsWith("[") && segment.endsWith("]") ? segment.slice(1, -1) : null;

/** The values of each `[name]` segment when the address fits the template, or null. */
export function matchPath(template: string, pathname: string): Params | null {
  const wanted = segments(template);
  const given = segments(pathname);
  if (wanted.length !== given.length) {
    return null;
  }
  const params: Params = {};
  for (const [index, segment] of wanted.entries()) {
    const value = given[index] ?? "";
    const name = dynamicName(segment);
    if (name === null) {
      if (segment !== value) {
        return null;
      }
    } else {
      params[name] = value;
    }
  }
  return params;
}

export function fillPath(template: string, params: Params, encode: boolean): string {
  const filled = segments(template).map((segment) => {
    const name = dynamicName(segment);
    if (name === null) {
      return segment;
    }
    const value = params[name] ?? "";
    return encode ? encodeURIComponent(value) : value;
  });
  return `/${filled.join("/")}`;
}

/** Translation both ways for a map of route address to public address. */
export function createPathMap(map: Readonly<Record<string, string>>) {
  const entries = Object.entries(map);
  const translate = (pathname: string, from: 0 | 1): string | null => {
    for (const entry of entries) {
      const params = matchPath(entry[from], pathname);
      if (params !== null) {
        return fillPath(entry[from === 0 ? 1 : 0], params, false);
      }
    }
    return null;
  };
  return {
    /** The public address of a route address, or null when the route keeps its own. */
    publicPathOf: (pathname: string) => translate(pathname, 0),
    /** The route that serves a public address, or null when the address is not in the map. */
    internalPathOf: (pathname: string) => translate(pathname, 1),
  };
}
