---
name: "TO FILL IN: product name"
description: "TO FILL IN: one sentence on what the product is and who it is for"
colors:
  # tokens:start
  background: "oklch(97.2% 0.006 245)"
  surface: "oklch(99.5% 0.002 245)"
  sunken: "oklch(94.5% 0.01 245)"
  layer: "oklch(99.5% 0.002 245)"
  line: "oklch(87% 0.012 245)"
  line-strong: "oklch(56% 0.02 245)"
  ink: "oklch(23% 0.025 245)"
  ink-muted: "oklch(45% 0.02 245)"
  action: "oklch(23% 0.025 245)"
  on-action: "oklch(99.5% 0.002 245)"
  brand: "oklch(55% 0.13 245)"
  brand-wash: "oklch(94.5% 0.028 245)"
  brand-ink: "oklch(44% 0.111 245)"
  focus: "oklch(55% 0.13 245)"
  success: "oklch(46% 0.12 150)"
  success-wash: "oklch(95% 0.035 150)"
  success-ink: "oklch(40% 0.11 150)"
  warning: "oklch(70% 0.14 85)"
  warning-wash: "oklch(95% 0.05 85)"
  warning-ink: "oklch(45% 0.092 85)"
  danger: "oklch(54% 0.19 25)"
  danger-wash: "oklch(95.5% 0.022 25)"
  danger-ink: "oklch(48% 0.17 25)"
  # tokens:end
typography:
  display:
    fontFamily: Onest
    fontWeight: 700
    fontSize: clamp(2.5rem, 1.6rem + 3vw, 3.5rem)
    lineHeight: 1.07
    letterSpacing: -0.032em
  page-title:
    fontFamily: Onest
    fontWeight: 650
    fontSize: 2rem
    lineHeight: 2.375rem
    letterSpacing: -0.022em
  section:
    fontFamily: Onest
    fontWeight: 600
    fontSize: 1.375rem
    lineHeight: 1.75rem
    letterSpacing: -0.012em
  block-title:
    fontFamily: Onest
    fontWeight: 600
    fontSize: 1.125rem
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body:
    fontFamily: Onest
    fontWeight: 400
    fontSize: 1.0625rem
    lineHeight: 1.625rem
  body-small:
    fontFamily: Onest
    fontWeight: 400
    fontSize: 0.9375rem
    lineHeight: 1.375rem
  field-label:
    fontFamily: Onest
    fontWeight: 550
    fontSize: 0.9375rem
    lineHeight: 1.25rem
  label:
    fontFamily: Onest
    fontWeight: 500
    fontSize: 0.875rem
    lineHeight: 1.125rem
  button:
    fontFamily: Onest
    fontWeight: 600
    fontSize: 1rem
    lineHeight: 1.25rem
  figure:
    fontFamily: JetBrains Mono
    fontWeight: 500
    fontSize: 2.25rem
    lineHeight: 2.75rem
    letterSpacing: -0.03em
    fontFeature: tnum
  data:
    fontFamily: JetBrains Mono
    fontWeight: 400
    fontSize: 0.9375rem
    lineHeight: 1.375rem
    fontFeature: tnum
rounded:
  stamp: 4px
  control: 10px
  cell: 10px
  panel: 14px
  dialog: 18px
  full: 9999px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "6": 24px
  "8": 32px
  "12": 48px
  "18": 72px
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    height: 44px
    paddingX: 18px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line-strong}"
    borderWidth: 2px
    rounded: "{rounded.control}"
    height: 44px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    height: 44px
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line-strong}"
    borderWidth: 2px
    rounded: "{rounded.control}"
    height: 48px
  input-focus:
    borderColor: "{colors.brand}"
    ringColor: "{colors.brand-wash}"
    ringWidth: 4px
  stamp:
    borderWidth: 1.5px
    rounded: "{rounded.stamp}"
    paddingX: 8px
  panel:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    rounded: "{rounded.panel}"
    padding: 24px
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.dialog}"
    width: 520px
    padding: 28px
  nav-item-active:
    backgroundColor: "{colors.brand-wash}"
    textColor: "{colors.brand-ink}"
---

# TO FILL IN: product name

## Overview

**Creative North Star:** a well-made instrument. Quality shows in the rules, not in decoration: numbers aligned in their column, every state written out, borders that change with intent, motion that only explains.

**Product.** The only part of this file the product writes, besides `design.json` (preset, color seeds, accents). While any "TO FILL IN" remains, the agent asks for it before the first piece of visual work.
- Name: TO FILL IN.
- Who it is for: TO FILL IN.
- Tone: TO FILL IN. Three words on how the product should sound and look.
- Surfaces the product uses: TO FILL IN (public site, member area, staff area, admin).

**Product context:** every product built on this base shares the rules, the components and the checks below, and chooses its character from curated options: a preset, its color seeds, and optionally one curated option per knob. It never pastes in a skin of its own. Brazilian web products with a public site, a member area, a staff area and admin. Broad audience, daily use, pt-BR copy, CPF, CEP, phone numbers, BRL and `dd/mm/aaaa` dates on every screen.

**Mode per surface:**
- Signed-in area and admin: Operate. Medium density, large targets, nothing competes with the data.
- Public site: Persuade. Same family and same tokens, with the display size and more room.
- Terms and privacy: Read. A 680px reading column.

**Key characteristics:**
- A record looks like a carefully filled-in document: cells that share borders, one figure, one stamp.
- Every number is tabular mono and lines up with the one above it.
- State has text and shape. Color confirms; it never informs on its own.
- The primary action is ink. The brand color tells you where you are.

## Preset

A preset is one curated choice per knob: typeface, text size, shape, density, elevation, motion, neutral temperature and contrast. `design.json` names the preset and may swap single knobs under `adjust`, always for another option of that knob:

```json
{ "preset": "editorial", "adjust": { "density": "medium" } }
```

| Preset | For | Typeface | Text | Shape | Density | Elevation | Motion | Neutral | Contrast |
|--------|-----|----------|------|-------|---------|-----------|--------|---------|----------|
| `instrument` | operational tools, back offices, daily work | instrument | standard | standard | medium | shadow | calm | cool | standard |
| `editorial` | reading, courses, reference | editorial | standard | tight | comfortable | hairline | calm | warm | standard |
| `accessible` | broad and older audiences, phones | hyperlegible | large | rounded | large | shadow | minimal | cool | reinforced |
| `vivid` | consumer and playful products | expressive | standard | round | medium | deep | lively | tinted | standard |

The options of each knob:
- **Typeface:** `instrument` (Onest, JetBrains Mono), `editorial` (Newsreader titles, Public Sans, IBM Plex Mono), `hyperlegible` (Atkinson Hyperlegible Next and Mono), `expressive` (Bricolage Grotesque titles, Figtree, Geist Mono). `pnpm tokens` writes the font module, because `next/font` only accepts literal calls.
- **Text size:** `standard` (body 17) or `large` (body 18, nothing below 15).
- **Shape:** `tight`, `standard`, `rounded`, `round`. Only `round` makes the stamp a pill.
- **Density:** `medium`, `comfortable`, `large`. It changes the named sizes, never the composition.
- **Elevation:** `shadow`, `hairline`, `deep`. In the dark theme every option is a 1px outline.
- **Motion:** `calm`, `minimal`, `lively`. Only `lively` has a small overshoot; reduced motion still jumps to the end.
- **Neutral temperature:** `cool` and `tinted` follow the brand hue, `warm` is a paper tone at hue 75.
- **Contrast:** `standard`, or `reinforced`, which raises muted text to 7:1 and control borders to 4.5:1. A preset that is `standard` still carries the reinforced values as an overlay (`data-contrast="more"` on the page): a person turns it on from their account, or gets it when their system asks for more contrast. The overlay lists only the roles the reinforced palette moves, in both themes, and the accent scopes keep their own colors.

The rest of this file describes the `instrument` values; the table below is what the chosen preset changes, written by `pnpm tokens`.

<!-- preset:start -->
| Knob | Choice |
|------|--------|
| Preset | instrument |
| Typeface | instrument: Onest for text, JetBrains Mono for numbers |
| Text size | standard |
| Shape | standard |
| Density | medium |
| Elevation | shadow |
| Motion | calm |
| Neutral temperature | cool |
| Contrast | standard |

| Variable the preset sets | Value |
|--------------------------|-------|
| `--radius-stamp` | `4px` |
| `--radius-control` | `10px` |
| `--radius-cell` | `10px` |
| `--radius-panel` | `14px` |
| `--radius-dialog` | `18px` |
| `--ease-enter` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--animate-fade-in` | `fade-in 200ms var(--ease-enter) both` |
| `--animate-fade-out` | `fade-out 140ms var(--ease-exit) both` |
| `--animate-layer-in` | `layer-in 280ms var(--ease-enter) both` |
| `--animate-layer-out` | `layer-out 196ms var(--ease-exit) both` |
| `--animate-sheet-in` | `sheet-in 280ms var(--ease-enter) both` |
| `--animate-sheet-out` | `sheet-out 196ms var(--ease-exit) both` |
| `--animate-bar-in` | `bar-in 200ms var(--ease-enter) both` |
| `--animate-stamp` | `stamp 120ms var(--ease-enter) both` |
<!-- preset:end -->

## Colors

**Strategy:** Restrained. Neutrals with a hint of the brand, one brand color used sparingly and with meaning, and three fixed state colors.

**Light or dark:** both, following `prefers-color-scheme` until the person chooses. A signed-in person's choice lives in the `options` `jsonb`. Use is daily work at the office, at home and on a phone outdoors, with no dominant lighting.

**Names.** Tokens carry the names the code uses: the CSS variable is `--color-<name>` and the Tailwind classes are `bg-<name>`, `text-<name>`, `border-<name>`. Radii follow the same pattern (`rounded-control`).

**Seeds (what the product changes):**
- `brand`: hue and chroma. Required. Default 245 and 0.13.
- `neutral`: a 0 to 30 degree hue offset from the brand, with chroma up to 0.014. Optional. Default 0.

**What never changes:** success at hue 150, warning at 85, danger at 25. Info is the brand itself. A brand within 25 degrees of 150 is rejected, so an action never looks like a success.

**The generator.** The token script, built on `culori`, starts from the seeds, fixes the lightness of each role, brings the color into sRGB with `clampChroma`, and measures every pair with `wcagContrast`. Text at 7:1 on `surface` and `background`, action text and muted text at 4.5:1, control borders, focus and brand at 3:1. If a pair fails, the generator adjusts that role's lightness within its allowed range. If it still fails, the script stops and names the pair. There is no contrast test in CI: a bad token is never written.

**Meanings:**
- `action` (equal to `ink`) is the primary button background. It works with any seed, even yellow or lime.
- `brand` means "you are here": active navigation item, selection, link, focus ring, active tab. It is never a button.
- `success` is only a completed success and money received. Never navigation, never a button.
- `danger` is only the irreversible and errors. An ordinary refusal or "no" uses the neutral.
- `warning` asks for attention without blocking.
- Colored text always uses the role's `-ink` token, never the full tone.

**Tone and size.** Every primitive that varies in color or footprint takes the same two words, typed in `components/ui/styles.ts`, so nothing is spelled twice.
- `size` is `sm` or `md`; `md` is the default and the size the interface was drawn at.
- `tone` is `neutral`, `info`, `success`, `warning` or `danger`: plain, pointing, confirming, asking for care, refusing or destroying. A primitive honors only the tones that make sense for it, as a subset: a button, a checkbox, a radio, a slider, a progress bar and a chip take `neutral` and `danger` (`ControlTone`); a panel takes `neutral`, `info` and `danger`; a stamp and a toast take the whole set (a toast has no `neutral`).
- A button's hierarchy is its `variant` (`primary` or `secondary`), what it does to the person's data is its `tone`: `<Button tone="danger">` is the filled destructive one, `<Button variant="secondary" tone="danger">` the quiet one.
- A stamp's tone follows the state it states: a done thing is `success`, a thing under way is `info`, one that needs care is `warning`, a refused one is `danger`, anything else is `neutral`.

**Paid product patterns.** What a paid product shows around the plan, all in `components/patterns` and all given their data by props.
- **Gate and paywall.** `Gate` shows its content to a plan that has the feature and `Paywall` to one that has not. Whether it is open is a plan question the caller answers with `hasFeature(feature)`, the same guard `requireFeature` is, so the door and the data behind it open and shut together. The paywall says what is closed, what the plan opens (a few lines) and gives one way forward, to the plans. It never blurs the content behind it and never nags. Seeing it sends `paywall_viewed` with a `source`, once per place.
- **Trial.** `TrialNotice` is a strip where the plan is the subject, not a banner that follows the person: the words (days left, said by the caller) and a bar of the days used. The standing comes from `trialStanding` in `domain/billing/trial.ts` (days round up: ten minutes left is one day), with the clock handed in.
- **Checklist.** `Checklist` is the rail for any short list worked through: a bar, a line with a marker per step, the open step in full with its one control, finished steps shrunk to a line. The first steps of an account use it.
- **Achievements.** `Achievements` is a ruled list of what is earned (trophy, stamp) and what is ahead (lock, and a bar when there is a count). Locked ones are shown on purpose. No motion celebrates.

**Figures.** A figure is a drawing the product needs that is neither a chart nor a control: a dial, a diagram, an instrument, a ball on a board. It lives in `components/figures`, and these rules hold for every one.
- The numbers are not the figure's. Geometry and values come from `domain/` (see `domain/figures/arc.ts` for the dial's), so they are tested without a screen; the figure only draws what it is handed.
- Text inside the drawing is `<SvgText>`: a catalog key (`messageKey`, typed from the catalog file, with `values` for its arguments) for a sentence, or `text` for notation that a domain function produced. A figure never writes a sentence, and never a size: the variant is one of the interface's roles (`label`, `data`, `body-small`). `halo` puts a surface-colored stroke behind letters that cross a mark.
- Colors are tokens, as classes (`stroke-brand`, `fill-ink-muted`). A faint share of a token is a mix over it: `stroke-[color-mix(in_oklch,var(--color-ink)_12%,transparent)]`. A mix over a hand-written color is refused by `pnpm lint:tokens`, and never over an accent (see below).
- One figure is one picture for assistive technology: `role="img"` with a summary that carries the reading, and every mark inside is decoration. When the reading matters, the screen also shows it as text beside the figure.
- It is drawn at the size it is shown, one unit to one pixel, with a `viewBox` and a width and no height: the interface's text sizes then read right inside it, and a narrower box scales the whole drawing down together. A figure drawn small and scaled up makes its text huge and clips it.
- The neutral example is the dial `ArcGauge`, shown in the catalog.

**Named palettes.** A product's own categories (sectors, levels, kinds of record) get a palette in `design.json` under `palettes`, as `palettes.<group>.<name>` with a hue, a chroma and an optional lightness. Each color becomes two tokens: `<group>-<name>` for marks (a fill that holds 3:1 against the surface and background, in both themes) and `<group>-<name>-ink` for text (4.5:1 on every ground). The classes are `bg-<group>-<name>`, `text-<group>-<name>-ink`, and so on; `AccentName`'s sibling `paletteNames` in `lib/palettes.ts` lists what exists, and the typecheck fails a screen that spells out one that was removed.
- The group is verified as a set in the order declared: neighbors must be 15 apart (Oklab, times 100) for normal vision and 8 apart under protan, deutan and tritan vision. A group that fails is refused by name, with the pair and the vision. The fix is a hue or a lightness, never shipping it.
- Color never carries the category alone: pair it with a name, a label or a shape. Nine or more categories are a table or a facet, not more colors.
- The `design.json` that ships has a neutral example group, `category`, shown in the catalog. A product replaces it.

**Scoped accent.** A second tone that marks a category, never a place or an action: a game, a level, a sector, a client. Four tokens, `accent`, `accent-wash`, `accent-ink` and `on-accent`, that a container redefines with `data-accent="<name>"`; everything inside reads the same classes (`bg-accent`, `text-accent-ink`) and takes that tone. A nested container wins over its parent, and `data-accent="brand"` restores the brand inside any scope. Outside every scope the accent is the brand.
- The product declares accents in `design.json` under `accents`, each a hue (0 to 360) and a chroma (0.04 to 0.2). The name is lowercase words; `brand` is reserved.
- A color someone else owns (a client's brand, a team's color) is a **fixed** accent: `{ "hue": 95, "chroma": 0.19, "lightness": 0.92, "fixed": true }`, with chroma up to 0.37. Its fill is exactly that color in both themes and only decorates (a stripe, a dot, a large surface). `accent-ink` and `accent-wash` are generated and measured as for any accent, so text in the accent is always readable, and `on-accent` is the neutral end that reads best on the fill, or pure black or white when neither neutral reaches 4.5:1. Never put text in the fill color itself.
- The generator uses the brand's lightness plan, measures every accent against the grounds of both themes, moves the fill when the text on it falls short, and refuses an accent that still fails. `pnpm tokens` also writes the list of names (`AccentName`), so code knows which scopes exist.
- The text on a filled accent is the neutral end that reads best on it, the same for every accent of a theme.
- The accent never replaces a state color, never paints a button, and, like every color here, confirms what text and shape already say.
- Tailwind's `@theme` stays plain, never `inline`: an inline theme writes the color into the class and a scope could no longer change it. No token is derived from an accent with `color-mix`: it would be computed once at the root and ignore the scope.

**Dark theme.** Not an inversion. Surfaces get lighter with depth: `sunken` 14.5%, `background` 16.5%, `surface` 20.5%, `layer` 23.5%. `line` 31%, `line-strong` 62%, `ink` 95%, `ink-muted` 75%. The brand rises to 74% with chroma at 85%. `brand-wash` 28%, `brand-ink` 80%. State text sits at 82% (success), 84% (warning) and 76% (danger). The generator measures every pair, and the table below shows the result.

**Generated values.** This table is written by `pnpm tokens`, never by hand. `pnpm check` fails when it is out of date with `design.json`.

<!-- tokens:start -->
| Token | Light | Dark |
|-------|-------|------|
| `background` | `oklch(97.2% 0.006 245)` | `oklch(16.5% 0.01 245)` |
| `surface` | `oklch(99.5% 0.002 245)` | `oklch(20.5% 0.012 245)` |
| `sunken` | `oklch(94.5% 0.01 245)` | `oklch(14.5% 0.01 245)` |
| `layer` | `oklch(99.5% 0.002 245)` | `oklch(23.5% 0.012 245)` |
| `line` | `oklch(87% 0.012 245)` | `oklch(31% 0.014 245)` |
| `line-strong` | `oklch(56% 0.02 245)` | `oklch(62% 0.02 245)` |
| `ink` | `oklch(23% 0.025 245)` | `oklch(95% 0.006 245)` |
| `ink-muted` | `oklch(45% 0.02 245)` | `oklch(75% 0.015 245)` |
| `action` | `oklch(23% 0.025 245)` | `oklch(95% 0.006 245)` |
| `on-action` | `oklch(99.5% 0.002 245)` | `oklch(16.5% 0.01 245)` |
| `brand` | `oklch(55% 0.13 245)` | `oklch(74% 0.111 245)` |
| `brand-wash` | `oklch(94.5% 0.028 245)` | `oklch(28% 0.039 245)` |
| `brand-ink` | `oklch(44% 0.111 245)` | `oklch(80% 0.091 245)` |
| `focus` | `oklch(55% 0.13 245)` | `oklch(74% 0.111 245)` |
| `success` | `oklch(46% 0.12 150)` | `oklch(70% 0.13 150)` |
| `success-wash` | `oklch(95% 0.035 150)` | `oklch(26% 0.04 150)` |
| `success-ink` | `oklch(40% 0.11 150)` | `oklch(82% 0.1 150)` |
| `warning` | `oklch(70% 0.14 85)` | `oklch(80% 0.13 85)` |
| `warning-wash` | `oklch(95% 0.05 85)` | `oklch(28% 0.045 85)` |
| `warning-ink` | `oklch(45% 0.092 85)` | `oklch(84% 0.11 85)` |
| `danger` | `oklch(54% 0.19 25)` | `oklch(68% 0.17 25)` |
| `danger-wash` | `oklch(95.5% 0.022 25)` | `oklch(27% 0.05 25)` |
| `danger-ink` | `oklch(48% 0.17 25)` | `oklch(76% 0.13 25)` |

| Theme | Pair | Measured | Needs |
|-------|------|----------|-------|
| light | `ink` on `surface` | 16.6:1 | 7:1 |
| light | `ink` on `background` | 15.6:1 | 7:1 |
| light | `ink` on `sunken` | 14.4:1 | 7:1 |
| light | `ink` on `layer` | 16.6:1 | 7:1 |
| light | `ink-muted` on `surface` | 7.3:1 | 4.5:1 |
| light | `ink-muted` on `background` | 6.8:1 | 4.5:1 |
| light | `ink-muted` on `sunken` | 6.3:1 | 4.5:1 |
| light | `ink-muted` on `layer` | 7.3:1 | 4.5:1 |
| light | `line-strong` on `surface` | 4.6:1 | 3:1 |
| light | `line-strong` on `background` | 4.3:1 | 3:1 |
| light | `brand` on `surface` | 4.7:1 | 3:1 |
| light | `brand` on `background` | 4.4:1 | 3:1 |
| light | `brand-ink` on `surface` | 7.6:1 | 4.5:1 |
| light | `brand-ink` on `background` | 7.1:1 | 4.5:1 |
| light | `brand-ink` on `sunken` | 6.6:1 | 4.5:1 |
| light | `brand-ink` on `layer` | 7.6:1 | 4.5:1 |
| light | `brand-ink` on `brand-wash` | 6.6:1 | 4.5:1 |
| light | `success-ink` on `surface` | 8.6:1 | 4.5:1 |
| light | `success-ink` on `background` | 8.1:1 | 4.5:1 |
| light | `success-ink` on `sunken` | 7.5:1 | 4.5:1 |
| light | `success-ink` on `layer` | 8.6:1 | 4.5:1 |
| light | `success-ink` on `success-wash` | 7.7:1 | 4.5:1 |
| light | `warning-ink` on `surface` | 7.4:1 | 4.5:1 |
| light | `warning-ink` on `background` | 6.9:1 | 4.5:1 |
| light | `warning-ink` on `sunken` | 6.4:1 | 4.5:1 |
| light | `warning-ink` on `layer` | 7.4:1 | 4.5:1 |
| light | `warning-ink` on `warning-wash` | 6.5:1 | 4.5:1 |
| light | `danger-ink` on `surface` | 7.0:1 | 4.5:1 |
| light | `danger-ink` on `background` | 6.6:1 | 4.5:1 |
| light | `danger-ink` on `sunken` | 6.1:1 | 4.5:1 |
| light | `danger-ink` on `layer` | 7.0:1 | 4.5:1 |
| light | `danger-ink` on `danger-wash` | 6.2:1 | 4.5:1 |
| light | `on-action` on `action` | 16.6:1 | 4.5:1 |
| light | `focus` on `surface` | 4.7:1 | 3:1 |
| light | `focus` on `background` | 4.4:1 | 3:1 |
| dark | `ink` on `surface` | 15.5:1 | 7:1 |
| dark | `ink` on `background` | 16.7:1 | 7:1 |
| dark | `ink` on `sunken` | 17.1:1 | 7:1 |
| dark | `ink` on `layer` | 14.4:1 | 7:1 |
| dark | `ink-muted` on `surface` | 8.1:1 | 4.5:1 |
| dark | `ink-muted` on `background` | 8.7:1 | 4.5:1 |
| dark | `ink-muted` on `sunken` | 8.9:1 | 4.5:1 |
| dark | `ink-muted` on `layer` | 7.5:1 | 4.5:1 |
| dark | `line-strong` on `surface` | 4.9:1 | 3:1 |
| dark | `line-strong` on `background` | 5.3:1 | 3:1 |
| dark | `brand` on `surface` | 7.8:1 | 3:1 |
| dark | `brand` on `background` | 8.4:1 | 3:1 |
| dark | `brand-ink` on `surface` | 9.7:1 | 4.5:1 |
| dark | `brand-ink` on `background` | 10.4:1 | 4.5:1 |
| dark | `brand-ink` on `sunken` | 10.7:1 | 4.5:1 |
| dark | `brand-ink` on `layer` | 9.0:1 | 4.5:1 |
| dark | `brand-ink` on `brand-wash` | 7.9:1 | 4.5:1 |
| dark | `success-ink` on `surface` | 10.6:1 | 4.5:1 |
| dark | `success-ink` on `background` | 11.5:1 | 4.5:1 |
| dark | `success-ink` on `sunken` | 11.8:1 | 4.5:1 |
| dark | `success-ink` on `layer` | 9.9:1 | 4.5:1 |
| dark | `success-ink` on `success-wash` | 9.1:1 | 4.5:1 |
| dark | `warning-ink` on `surface` | 10.9:1 | 4.5:1 |
| dark | `warning-ink` on `background` | 11.7:1 | 4.5:1 |
| dark | `warning-ink` on `sunken` | 12.1:1 | 4.5:1 |
| dark | `warning-ink` on `layer` | 10.1:1 | 4.5:1 |
| dark | `warning-ink` on `warning-wash` | 8.9:1 | 4.5:1 |
| dark | `danger-ink` on `surface` | 7.9:1 | 4.5:1 |
| dark | `danger-ink` on `background` | 8.5:1 | 4.5:1 |
| dark | `danger-ink` on `sunken` | 8.7:1 | 4.5:1 |
| dark | `danger-ink` on `layer` | 7.4:1 | 4.5:1 |
| dark | `danger-ink` on `danger-wash` | 6.8:1 | 4.5:1 |
| dark | `on-action` on `action` | 16.7:1 | 4.5:1 |
| dark | `focus` on `surface` | 7.8:1 | 3:1 |
| dark | `focus` on `background` | 8.4:1 | 3:1 |

| Accent | Token | Light | Dark |
|--------|-------|-------|------|
| brand | `accent` | `oklch(55% 0.13 245)` | `oklch(74% 0.111 245)` |
| brand | `accent-wash` | `oklch(94.5% 0.028 245)` | `oklch(28% 0.039 245)` |
| brand | `accent-ink` | `oklch(44% 0.111 245)` | `oklch(80% 0.091 245)` |
| brand | `on-accent` | `oklch(99.5% 0.002 245)` | `oklch(16.5% 0.01 245)` |
| coral | `accent` | `oklch(55% 0.16 32)` | `oklch(74% 0.136 32)` |
| coral | `accent-wash` | `oklch(94.5% 0.028 32)` | `oklch(28% 0.048 32)` |
| coral | `accent-ink` | `oklch(44% 0.144 32)` | `oklch(80% 0.112 32)` |
| coral | `on-accent` | `oklch(99.5% 0.002 245)` | `oklch(16.5% 0.01 245)` |
| teal | `accent` | `oklch(55% 0.094 195)` | `oklch(74% 0.085 195)` |
| teal | `accent-wash` | `oklch(94.5% 0.027 195)` | `oklch(28% 0.03 195)` |
| teal | `accent-ink` | `oklch(44% 0.075 195)` | `oklch(80% 0.07 195)` |
| teal | `on-accent` | `oklch(99.5% 0.002 245)` | `oklch(16.5% 0.01 245)` |
| plum | `accent` | `oklch(55% 0.14 330)` | `oklch(74% 0.119 330)` |
| plum | `accent-wash` | `oklch(94.5% 0.038 330)` | `oklch(28% 0.042 330)` |
| plum | `accent-ink` | `oklch(44% 0.126 330)` | `oklch(80% 0.098 330)` |
| plum | `on-accent` | `oklch(99.5% 0.002 245)` | `oklch(16.5% 0.01 245)` |

| Accent | Theme | Fill on surface (3:1) | Text on fill (4.5:1) | Ink, lowest (4.5:1) |
|--------|-------|-----------------------|----------------------|---------------------|
| brand | light | 4.7:1 | 4.7:1 | 6.6:1 |
| brand | dark | 7.8:1 | 8.4:1 | 7.9:1 |
| coral | light | 5.2:1 | 5.2:1 | 7.0:1 |
| coral | dark | 7.4:1 | 7.9:1 | 7.6:1 |
| teal | light | 4.6:1 | 4.6:1 | 6.4:1 |
| teal | dark | 8.0:1 | 8.7:1 | 7.9:1 |
| plum | light | 5.2:1 | 5.2:1 | 7.0:1 |
| plum | dark | 7.4:1 | 7.9:1 | 7.6:1 |
<!-- tokens:end -->

**Forbidden:** loose hex or `oklch()` outside the generated tokens. Gradients on buttons, text or screen backgrounds.

## Typography

**Faces.** The typeface knob chooses them (see Preset); titles (`h1` to `h3`) use `font-heading`, text uses `font-sans`, numbers use `font-mono`. In `instrument`: Onest for everything that is text. JetBrains Mono for everything that is a number or code: dates, CPF, CNPJ, phone, CEP, ids, money, counts. Both load through `next/font/google`, as variable fonts with the Latin subset, with no font file in the repository and no secret at build time. Onest has a large x-height and a warm design, which carries a 17px body for a broad audience. JetBrains Mono has wide, clearly distinct digits (0 and O, 1 and l), which matters for CPF numbers and amounts.

**Scale.** `html` stays at 16px. The body is 17px through a token, not through the root `font-size`, so Tailwind utilities keep their sizes.
- Display (public site only): 40 to 56px, 700, -0.032em.
- Page title: 32/38, 650, -0.022em.
- Section: 22/28, 600.
- Block title: 18/24, 600.
- Body: 17/26, 400. Secondary: 15/22.
- Field label: 15/20, 550. Meta and column headers: 14/18, 500, never uppercase.
- Figure: mono 36/44, 500, -0.03em. The "R$" is set at 0.6em, top-aligned, in `ink-muted`.
- Data: mono 15/22.

**Floors.** Nothing below 14px, in any role. No widely tracked uppercase labels.

**Numbers.** `font-variant-numeric: tabular-nums` in tables, records, figures and any column. Running text uses proportional digits. Money always carries "R$" and is right-aligned in a column. Dates are always `dd/mm/aaaa`.

**Measure.** Running text at most 680px wide. Field descriptions at most 52ch.

**Declared exception:** JetBrains Mono is known as a programmer's font. Here it only appears in numbers and short data, never in sentences, and that is what keeps the interface from looking like a developer tool.

## Layout

**Breakpoints:** Tailwind's. `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Navigation switches at `lg`.

**Max widths:** reading 680, form 720, record 1080, list 1240, public site 1240.

**Signed-in shell:**
- A 60px top bar, always above everything. Only the content scrolls.
- A 248px sidebar from `lg` up. 44px items, 24px gaps between groups, group labels in `label` with `ink-muted`. The active item has a `brand-wash` background, `brand-ink` text at 600, and a 3px `brand` bar on its start edge.
- Below `lg`, a 64px bottom bar plus the safe area, with up to 4 destinations and "Mais" (More). Each destination fills its whole column as a target, icon above a 14px label. "Mais" opens a sheet (Radix Dialog) with the rest.
- Content has a 16px margin on narrow screens, 32px from `md` up, and 24px of clearance above the bottom bar.

**Rhythm.** Small space inside a group (8 to 12px), large space between groups (32 to 48px). Siblings always use `gap`, never loose margins.

**Density.** Medium. A list row is 56px. A field is 48px. Nothing is compressed to fit more: a narrow screen gets its own composition, not the wide one squeezed.

**Named sizes.** What a person touches and the insets of containers are tokens, never a number in a component, so density changes them in one place. `pnpm check` refuses `h-`, `min-h-` and `size-` with 9, 10, 11, 12, 14, 15 or 16.

| Token | Class | Value | Used by |
|-------|-------|-------|---------|
| `control` | `h-control`, `size-control` | 44px | buttons, menu and nav items, icon buttons |
| `control-coarse` | `pointer-coarse:h-control-coarse` | 48px | buttons under a coarse pointer |
| `field` | `h-field` | 48px | text fields, select and combobox triggers |
| `row` | `min-h-row` | 56px | list rows |
| `chip` | `h-chip` | 36px | filter chips |
| `segment` | `h-segment` | 40px | segmented control |
| `bar` | `h-bar` | 60px | top bars |
| `tab` | `h-tab` | 64px | bottom bar destinations |
| `sidebar` | `w-sidebar` | 248px | signed-in sidebar |
| `panel-inset` | `p-panel-inset` | 24px | panel padding |
| `dialog-inset` | `p-dialog-inset` | 28px | dialog padding |
| `cell-x`, `cell-y` | `px-cell-x`, `py-cell-y` | 16px, 12px | record cells |
| `dialog` (container) | `w-dialog` | 520px | dialog width |

## Elevation & Depth

Three levels and nothing else:
- `sunken`: wells, the filter strip, the save bar track.
- `surface`: content, panels, cells.
- `layer`: dialog, popover, menu, toast, sheet.

Only the layer has a shadow: `0 1px 0 var(--color-line), 0 16px 40px -16px` in the text color at 28% opacity, tinted by the brand hue. In dark mode the layer uses the 23.5% surface and a 1px `line-strong` border instead of the shadow. No zero-offset glow and no glass blur.

## Shapes

- Stamp 4px (`stamp`). Controls and cell groups 10px (`control`, `cell`). Panel 14px (`panel`). Dialog and sheet 18px (`dialog`).
- Pills only for single-line chips (filter, count), and for stamps under the `round` shape. A button is never a pill.
- Inner radius is the outer radius minus the gap. In cells that share borders, inner corners are square and only the outer outline is rounded.
- 1px borders on containers. 2px borders on controls: what you touch weighs more than what you read.

## Components

**Button.** 44px tall (48px under `pointer: coarse`), radius 10, `button` 16/600, 18px horizontal padding, optional icon with an 8px gap.
- Primary: `action` background, `on-action` text.
- Secondary: `surface` background, 2px `line-strong` border.
- Danger: `danger` background, `on-action` text. The label repeats the object: "Excluir 3 pedidos" (Delete 3 orders).
- Hover: on primary, lightness rises 6%. On secondary, the border goes to `ink` and the background stays.
- Active: moves down 1px. Disabled: 50% opacity and the default cursor.
- Focus: a 2px `focus` ring with a 2px offset.
- Loading: the label stays, an indicator takes the icon's place and the width does not change.

**Field.** Label above (`field-label`), 48px field, 2px `line-strong` border, radius 10, 16px horizontal padding, value in the 17px body size.
- CPF, phone, CEP, date and money use `data` in mono with a mask.
- Focus: `brand` border and a 4px `brand-wash` ring.
- Error: `danger` border, message below in 15px `danger-ink` with an icon, wired with `aria-describedby`. The error replaces the hint and never appears next to it.
- Help: below, 15px, `ink-muted`, at most 52ch.
- A submit error appears above the submit button, saying what to do next.

**Select, combobox, menu, popover, tooltip.** Radix with no theme. The trigger has the same anatomy as a field. The content is a layer with radius 10, 44px items, and the checked item has a `brand-wash` background. A tooltip is only an icon label, never necessary information.

**Dialog.** Radix Dialog and AlertDialog. 520px wide, radius 18, 28px padding.
- Title in `section`.
- The consequence is in regular body text, not muted text.
- Actions at the bottom right: cancel is secondary, the action comes after it.
- Below `md`, it becomes a sheet rising from the bottom edge, with stacked actions and the main one on top.
- The layer backdrop is black at 50%. A destructive action always goes through the confirmation modal.

**Toast.** Radix Toast. Bottom right on wide screens. Above the bottom bar on narrow screens.
- A layer with a 2px border in the state tone and text in `ink`. Only the icon carries the color.
- Disappears after 6 seconds, or stays until dismissed when it has an action.
- It is for something that happened outside the current screen. Save confirmation is not a toast.

**Save bar.** Appears when there are unsaved changes, pinned to the bottom of the content, on `sunken`. It holds "Descartar" (Discard) and "Salvar" (Save). On save, the "Salvo" (Saved) stamp prints where the buttons were (see Motion) and fades after 2 seconds. The unsaved changes guard asks for confirmation on leave.

**Page header.**
- A 44px back button, square with radius 10 and a 2px border. On by default and can be turned off.
- Title in `page-title`. General actions sit on the right, on the same baseline. The optional subtitle sits below, in 17px `ink-muted`.
- 32px to the content, with no rule underneath.
- The `<title>` comes from the same catalog text.
- On narrow screens, actions move below the title, or into a menu when there are more than two.

**List.**
- Column headers in `label`, `ink-muted`, with a 1px rule below.
- 56px rows separated by a thin rule, no boxes and no zebra striping. Hover gives a `sunken` background.
- Money in mono on the right, dates in mono, and the state stamp in its own column.
- Active filters are removable chips on a `sunken` strip, mirrored in the URL.
- Pagination with "Anterior" (Previous), "Próxima" (Next) and the position in mono ("41 a 60 de 312").
- On narrow screens each row becomes a two-line block: title and stamp on top, mono data below.
- **Empty:** the same table, with a single row saying there is nothing yet and offering the real action. No illustration.
- **Search with no results:** repeats the term ("Nada para "joana" com 2 filtros", nothing for "joana" with 2 filters) and offers "Limpar busca" (Clear search).
- **Loading:** ghost rows of the same size, shown only after 180ms.

**Record (cells).**
- A record is a grid of cells that share borders, in a group with radius 10. Two columns at `md`, three at `xl`, one on narrow screens.
- Each cell has a `label` on top and the value below, with 12px by 16px padding.
- Cells are sized by the weight of their data, not equally.
- A figure cell holds the main number. The state stamp sits in the first cell, top right corner.
- When editing, the same grid swaps the value for the field: the layout does not jump.
- The danger zone is separated at the bottom, as the third panel level.

**Stamp (state).**
- Text at 14/600 with a 1.5px outline in the state's `-ink` color, radius 4, 8px horizontal padding.
- One shape icon per state: ✓ done, ◆ in progress, ▲ attention, ✕ refused or error, ○ neutral.
- No tilt and no filled background. Shape and text convey the state with no color at all.

**Panels.** Three levels, and there is no fourth:
- default: `surface`, `line` border, radius 14, 24px padding.
- highlight: `brand-wash` background, at most one per screen.
- danger zone: dashed `danger-ink` border.

A card inside a card does not exist.

**Empty, error and loading states** are part of the component, not extras. The error page shows the request id in mono.

## Data

Charts follow one method: pick the form first (a single number is a stat tile, not a chart), then color by the job.
- **Categorical** (`chart-1` to `chart-8`): series that are the subject. Slots are taken in order and never cycled; the order is what keeps neighbors apart for color-blind readers, validated against this system's surfaces in both themes. A ninth series folds into "Other". Three light slots are under 3:1 on the surface, so a chart with categories always has direct labels or its table.
- **Sequential** (`chart-seq-1` to `chart-seq-7`): magnitude, the brand hue from light to dark. A single series uses `chart-seq-5`, and the hovered mark `chart-seq-6`.
- **Diverging** (`chart-negative`, `chart-middle`, `chart-positive`): above or below a baseline.
- **State** stays with the state colors and their stamps, never a chart slot.
- Marks: columns at most 24px wide with a 4px rounded data end (`rounded-mark`, the same in every preset) and a square foot; lines 2px; hairline gridlines in `line`. Axis text in `ink-muted`, values in `ink`; text never wears a series color.
- One axis per chart, ticks on round steps (a count never steps by a half). A single series has no legend: the title says what it is.
- Every chart is drawn at the container's real width, so its text keeps the token sizes; every mark has a hover and focus target wider than the mark; every chart has a table view with the same values.

## Do's and Don'ts

- Do: numbers in tabular JetBrains Mono, right-aligned in columns.
- Do: every state as a stamp (text and shape). Color only confirms.
- Do: primary buttons in `action`. The brand marks place and selection.
- Do: empty states with the same structure as the full screen and the real action.
- Do: every color token generated by the script. No hand-written color value in a component.
- Don't: brand-colored buttons, gradients, pill buttons.
- Don't: cards inside cards, an icon in a colored square above a title, an uppercase label above a title.
- Don't: green outside success or money received. Red outside the irreversible or errors.
- Don't: text below 14px, a toast to confirm what the screen already shows, necessary information hidden in a tooltip.
- Don't: the wide screen squeezed onto a phone. Narrow screens have their own composition.

## Motion

- **Approach:** minimal and functional. Motion explains where something came from and where it went.
- **Easing:** enter `cubic-bezier(.2,.8,.2,1)` (`ease-enter`), exit `cubic-bezier(.4,0,1,1)` (`ease-exit`), movement `ease-in-out` (`ease-move`). No overshoot.
- **Duration:** micro 120ms (hover, press), standard 200ms (menu, popover, the save bar rising 8px), layer 280ms (dialog, sheet). Exit is 30% shorter than enter.
- **Waiting:** loading states and indicators only appear after 180ms. A fast response never flashes.
- **Hover:** hover hints and keyboard shortcuts only appear under `(hover: hover) and (pointer: fine)`.
- **Reduced motion:** everything jumps to the final frame, with a 0.01ms duration and no delay. It applies when the system asks for it and also when the person chose it in their account (`data-motion="reduce"`). The resting state of every animation is the base style itself, so nothing is left halfway.
- **The one authored moment:** the "Salvo" (Saved) stamp. It scales from 1.06 to 1 together with opacity, in 120ms, with no bounce. It is the only animation with personality in the system.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| TO FILL IN | Product created from this base | System inherited unchanged, with the product's color seeds |
