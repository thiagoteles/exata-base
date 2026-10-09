import type messages from "@/messages/pt-BR.json";

/*
 * The address of every sentence in the catalog, as the dotted path that reaches it: "catalog.figures.gauge".
 * It is read off the catalog file itself, so a key that does not exist does not type-check. Only the leaves
 * count; a branch is a group of sentences, not a sentence.
 */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type MessageKey = Leaves<typeof messages>;
