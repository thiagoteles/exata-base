---
name: new-text-key
description: Add text a person reads. Use for any label, message, title, e-mail line, error or metadata; no sentence goes inside a component.
---

# New text key

Every sentence a person reads lives in `messages/pt-BR/<area>.json`; `pnpm messages` joins them into `messages/pt-BR.json`. The Biome rule `noJsxLiterals` fails
a sentence written inside JSX. The catalog is typed: a key that does not exist, or a missing value
for a `{name}`, fails `tsc`.

1. **Pick the namespace** by where the text is shown, in the same file: `nav`, `auth`, `account`,
   `contact`, `inbox`, `record`, `errors`, `validation`, `emails`, `ui`, `patterns`. A new area gets
   a new top-level object. Names of keys are English and camelCase; the text is pt-BR.
2. **Variables and plurals use ICU**, never string concatenation:
   `"position": "{from, number} a {to, number} de {total, number}"`,
   `"tooShort": "{minimum, plural, one {Use pelo menos # caractere.} other {Use pelo menos # caracteres.}}"`.
   Declare a number as `{n, number}` so the call takes a number, not a string.
3. **In a server component** use `getTranslations("area")`; in a sync one or a client one,
   `useTranslations("area")`. Pass the values the message declares.
4. **Validation messages** are keys under `validation`, produced by `lib/validation.ts`; a form
   shows them through `useValidationText()`. **Errors** are keys under `errors`, shown through
   `useErrorText()`.
5. **E-mails** read the `emails` namespace through `emailTranslator()`.
6. **Do not build a key from a variable** unless it is a union of literal keys the compiler can
   check, like `` t(`statuses.${status}`) `` where `status` is an enum. A free string key is a bug.
7. No em dash in the text; use a comma, a period or a hyphen.
8. Adding English later is a second JSON file with exactly the same keys and arguments. The
   compiler refuses a file that differs.
