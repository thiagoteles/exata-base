import type messages from "@/messages/pt-BR.json";
import type { MatchesDefaultCatalog, MessageArguments } from "./catalog-shape";

/*
 * Compile-time proof of the catalog check. Every line asserts an exact result, so a check that
 * accepted a broken catalog, or rejected a correct one, stops this file from compiling.
 */

type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const readsArguments: Same<
  MessageArguments<"Olá {name}, você tem {count, plural, one {# item} other {# itens}}">,
  "name" | "count"
> = true;

export const acceptsTheDefaultCatalog: MatchesDefaultCatalog<typeof messages> = true;

type Translated<Catalog> = {
  [Key in keyof Catalog]: Catalog[Key] extends string ? string : Translated<Catalog[Key]>;
};
type Errors = (typeof messages)["errors"];
type Validation = (typeof messages)["validation"];

export const rejectsMissingKey: MatchesDefaultCatalog<{
  errors: Omit<Errors, "badRequest">;
  validation: Validation;
}> = false;

export const rejectsExtraKey: MatchesDefaultCatalog<typeof messages & { extra: { key: "x" } }> =
  false;

export const rejectsChangedArgument: MatchesDefaultCatalog<{
  errors: Omit<Errors, "requestId"> & { requestId: "Request id: {id}" };
  validation: Validation;
}> = false;

export const rejectsPlainStrings: MatchesDefaultCatalog<Translated<typeof messages>> = false;
