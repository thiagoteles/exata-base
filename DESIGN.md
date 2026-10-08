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

**Product.** The only part of this file the product writes, besides the seeds in `colors.json`. While any "TO FILL IN" remains, the agent asks for it before the first piece of visual work.
- Name: TO FILL IN.
- Who it is for: TO FILL IN.
- Tone: TO FILL IN. Three words on how the product should sound and look.
- Surfaces the product uses: TO FILL IN (public site, member area, staff area, admin).

**Product context:** this system is identical in every product built on this base. The product changes the color seeds, fills in the Product block, and nothing else. Brazilian web products with a public site, a member area, a staff area and admin. Broad audience, daily use, pt-BR copy, CPF, CEP, phone numbers, BRL and `dd/mm/aaaa` dates on every screen.

**Mode per surface:**
- Signed-in area and admin: Operate. Medium density, large targets, nothing competes with the data.
- Public site: Persuade. Same family and same tokens, with the display size and more room.
- Terms and privacy: Read. A 680px reading column.

**Key characteristics:**
- A record looks like a carefully filled-in document: cells that share borders, one figure, one stamp.
- Every number is tabular mono and lines up with the one above it.
- State has text and shape. Color confirms; it never informs on its own.
- The primary action is ink. The brand color tells you where you are.

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

**Dark theme.** Not an inversion. Surfaces get lighter with depth: `sunken` 14.5%, `background` 16.5%, `surface` 20.5%, `layer` 23.5%. `line` 31%, `line-strong` 62%, `ink` 95%, `ink-muted` 75%. The brand rises to 74% with chroma at 85%. `brand-wash` 28%, `brand-ink` 80%. State text sits at 82% (success), 84% (warning) and 76% (danger). The generator measures every pair, and the table below shows the result.

**Generated values.** This table is written by `pnpm tokens`, never by hand. `pnpm check` fails when it is out of date with `colors.json`.

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
<!-- tokens:end -->

**Forbidden:** loose hex or `oklch()` outside the generated tokens. Gradients on buttons, text or screen backgrounds.

## Typography

**Faces.** Onest for everything that is text. JetBrains Mono for everything that is a number or code: dates, CPF, CNPJ, phone, CEP, ids, money, counts. Both load through `next/font/google`, as variable fonts with the Latin subset, with no font file in the repository and no secret at build time. Onest has a large x-height and a warm design, which carries a 17px body for a broad audience. JetBrains Mono has wide, clearly distinct digits (0 and O, 1 and l), which matters for CPF numbers and amounts.

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

## Elevation & Depth

Three levels and nothing else:
- `sunken`: wells, the filter strip, the save bar track.
- `surface`: content, panels, cells.
- `layer`: dialog, popover, menu, toast, sheet.

Only the layer has a shadow: `0 1px 0 var(--color-line), 0 16px 40px -16px` in the text color at 28% opacity, tinted by the brand hue. In dark mode the layer uses the 23.5% surface and a 1px `line-strong` border instead of the shadow. No zero-offset glow and no glass blur.

## Shapes

- Stamp 4px (`stamp`). Controls and cell groups 10px (`control`, `cell`). Panel 14px (`panel`). Dialog and sheet 18px (`dialog`).
- Pills only for single-line chips (filter, count). A button is never a pill.
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
- **Reduced motion:** everything jumps to the final frame, with a 0.01ms duration and no delay. The resting state of every animation is the base style itself, so nothing is left halfway.
- **The one authored moment:** the "Salvo" (Saved) stamp. It scales from 1.06 to 1 together with opacity, in 120ms, with no bounce. It is the only animation with personality in the system.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| TO FILL IN | Product created from this base | System inherited unchanged, with the product's color seeds |
