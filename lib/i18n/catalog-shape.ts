import type messages from "@/messages/pt-BR.json";

/*
 * Every catalog must match pt-BR exactly: same keys in both directions and the same ICU arguments
 * in each message. Catalogs are checked at compile time; there is no runtime merge and no fallback.
 */

type Trim<Text extends string> = Text extends ` ${infer Rest}`
  ? Trim<Rest>
  : Text extends `${infer Rest} `
    ? Trim<Rest>
    : Text;

/** Argument names of an ICU message: `{name}` and `{count, plural, ...}` yield "name" | "count". */
export type MessageArguments<Message extends string> = Message extends `${string}{${infer Body}`
  ? Body extends `${infer Inside}}${infer Rest}`
    ?
        | (Inside extends `${infer Name},${string}` ? Argument<Trim<Name>> : Argument<Trim<Inside>>)
        | MessageArguments<Rest>
    : never
  : never;

// Plural branches like `{# itens}` contain text, not an argument name: only identifiers count.
type Argument<Name extends string> = Name extends `${string} ${string}` | `#${string}` | ""
  ? never
  : Name;

type Shape<Catalog> = {
  [Key in keyof Catalog]: Catalog[Key] extends string
    ? MessageArguments<Catalog[Key]>
    : Shape<Catalog[Key]>;
};

type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Resolves to `true` only when `Catalog` has exactly the keys and arguments of pt-BR. */
export type MatchesDefaultCatalog<Catalog> = Same<Shape<Catalog>, Shape<typeof messages>>;
