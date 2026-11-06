# Design principles — @sincpro/web-ui

A design system for business software: the user is an expert, repetitive, and measures their day
in finished tasks. Speed, predictability and keyboard matter more than animation or glass.
Each principle below says **which piece of the system applies it** and **what enforces it**, because
a rule nobody enforces is a suggestion.

## 1. Visual hierarchy

Each screen answers in two seconds: where am I, what is most important, what do I do now.
It is built with size, weight, color, contrast, space and position — in that order of strength.

| How the system applies it                                                                                                                              | Where                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| The record's name is the entry point: `text-display` (28 px) over a 13 px body — ratio 2.15.                                                           | `Record` (`identity.title`)                       |
| The datum the record is opened for goes big, on the right.                                                                                             | `Record` (`identity.figure`)                      |
| Who the record is, second: `subtitle` in `text-lead`. The facts, third, in the quiet size.                                                             | `Record` (`identity.subtitle`, `Record.Facts`)    |
| The summary of amounts apart, on the right, the total last and biggest.                                                                                | `Totals`                                          |
| A list's title is the biggest thing in its bar.                                                                                                        | `ListingBar`                                      |
| ONE dark band per screen: the app bar. The record's rail and the list's bar are light BY DEFAULT (`canvas`); `surface="chrome"` is an explicit option. | `AppFrame`, `Record.Rail surface`, `List surface` |

**Enforced by**: the UX audit (`ux-ui-audit`) measures the title/body ratio (minimum ~1.5); `tests/mobile.test.tsx` pins that the default rail does not carry `bg-chrome` and that its buttons take the context's surface.

## 2. One main action per context

The primary (gold) appears once per view. Secondaries are outlined, tertiaries
`ghost` or in a `⋯` menu, destructives `danger`, set apart and with undo.

| How the system applies it                                     | Where            |
| ------------------------------------------------------------- | ---------------- |
| Four button roles: `primary`, `secondary`, `ghost`, `danger`. | `Button`         |
| The rail's actions: at most three visible + a `⋯` menu.       | `Record.Actions` |

**Enforced by**: `make smoke` fails if a view or template shows more than one primary button.

## 3. Color communicates, it does not decorate

Color means state (paid, overdue, draft), alert or the main action. Never color alone:
always with text or an icon.

| How the system applies it                                                                  | Where                        |
| ------------------------------------------------------------------------------------------ | ---------------------------- |
| Five semantic tones — neutral, info, good, warn, bad — and the accent only for the action. | `Tag`, `StatusDot`, `Metric` |
| Each color carries its WCAG contrast, annotated and measured.                              | `tokens.css`                 |
| A failed state carries an icon besides the red.                                            | `StatusBar`                  |

**Enforced by**: `tests/tokens.test.ts` recomputes every contrast; `tests/tokenLint.test.ts`
forbids colors outside the tokens.

The dark theme holds to the same: the five tones keep their meaning, gold remains
the main action (with `on-accent` on top) and every contrast is measured against **the dark**
canvas, surface and chrome. How it works: README, «Theming».

## 4. Proximity and grouping

What is close together is perceived as related: the space between groups is greater than within a
group. It orders better than putting borders.

| How the system applies it                             | Where                       |
| ----------------------------------------------------- | --------------------------- |
| Groups of fields in two columns, each with its title. | `SheetGroups`, `SheetGroup` |
| Sections that are answered together.                  | `FormSection`               |

## 5. Progressive disclosure

First what 80 % need; the rest in tabs, collapsible sections or "see more".

| How the system applies it                                                                                                                                                                                                                                                                                              | Where                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| The record's tabs.                                                                                                                                                                                                                                                                                                     | `Record.Pages`                                    |
| Advanced options collapsed.                                                                                                                                                                                                                                                                                            | `Disclosure`, `Accordion`                         |
| Help on demand, not a paragraph on every field.                                                                                                                                                                                                                                                                        | `Hint` (the label's `?`)                          |
| The record's notices: what is wrong, always in view and outside the sheet; the rest, in the «Avisos» section of the Activity, and the rail's indicator leads to them.                                                                                                                                                  | `Record.Notice`                                   |
| What surrounds the record in ONE column, «Actividad», joined to the sheet on the right if there is width and below if not, open by default: on top, compact, the notices (what is wrong NOW); below, always in view, the timeline (what HAPPENED): messages, notes and events by date, separated by day, with filters. | `Record.Activity`, `Activity`                     |
| What belongs to ONE field goes with its field: a mark beside the label says WHERE and opens the sentence; the Activity lists it with the notices and leads back to the field.                                                                                                                                          | `note` of `Field`, `DataField` and `Record.Facts` |
| A record opened from another: a workspace modal, never one on top of another.                                                                                                                                                                                                                                          | composer: modal, preview, on the side             |

## 6. Consistency and conventions

If "Confirmar" is top left in Sales, it is in the same place in Purchasing. The two
views —one record, N records— are the same across the whole product.

| How the system applies it                                 | Where                |
| --------------------------------------------------------- | -------------------- |
| Two views and nothing else, written as a tree (compound). | `Record.*`, `List.*` |
| Templates only compose the public API.                    | `stories/templates/` |

**Enforced by**: `tests/templates.test.ts` fails if a template needs styles of its own
(it is a missing component); `tests/storyCoverage.test.ts` demands a story for everything public.

## 7. Feedback and error tolerance

Every action has a visible response. Errors say what to do, in human language.
Undo is better than "are you sure?".

| How the system applies it                                                                              | Where                         |
| ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Notice with an action ("Deshacer").                                                                    | `Toast` (`action`)            |
| Unsaved changes in the rail, with Save and Discard.                                                    | `Record` (`dirty`)            |
| The error goes below the field, with an icon, and says what to enter. It shows on attempt, not before. | `Field` (`error`)             |
| Empty, loading and failed states, each with its sentence and its way out.                              | `Empty`, `Skeleton`, `Failed` |

## 8. Accessibility as a base

Full keyboard, visible focus, accessible names, AA contrast as a minimum.

| How the system applies it                                                            | Where                  |
| ------------------------------------------------------------------------------------ | ---------------------- |
| Keyboard behavior, focus and ARIA from React Aria.                                   | interactive primitives |
| Each control inside a `Field` is named by its label and described by help and error. | `useFieldIds`          |

**Enforced by**: Storybook runs a11y as an error; `make smoke` opens every story in Chrome.

## 9. Useful laws

- **Fitts**: the main action big and close to where one is looking.
- **Hick**: fewer options, faster decision — a single navigation per screen (if there is a
  sidebar, the top bar does not repeat its menus).
- **Jakob**: people expect it to work like what they already know (Odoo, SAP Fiori) — hence the
  totals summary on the right and a document's stage bar.
- **Miller**: do not force remembering between screens — the record's pager and the breadcrumbs.

## 10. The AI proposes, the person decides

An assistant that acts inside a business screen is trusted if three things can always be answered:
where it got that from, what exactly changes and how it is undone. It is never identified by
color alone: icon and word. And it never asks «are you sure?»: it applies and offers undo.

| How the system applies it                                                                                     | Where                                        |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| The suggestion goes below the field, in a dotted border (a proposal, not a value), with its source as a link. | `AssistSuggestion`, `AssistSourceLink`       |
| Several changes are seen as before → after, with the type written out, and you choose which to apply.         | `ChangeReview`, `ChangeReviewDialog`         |
| Applying returns its undo and the notice offers it; there is no confirmation dialog.                          | `applyWithUndo` + `Toast`                    |
| What the assistant filled in stays marked: who, when and from what source; and in the history.                | `AssistMark`, `AssistedValue`, `assistEvent` |
| The assistant working does not block: it is a cancelable line where the proposal will appear.                 | `AssistPending`                              |
| The gold accent remains the only main action: the assistant uses the `info` tone.                             | `ChangeReview` (`emphasis`)                  |

**Enforced by**: `tests/assist.test.tsx` (mark with text, named group, change type written out,
«Aplicar» counts and turns off at zero, undo restores); `make smoke` (a single primary per
template); `tests/templates.test.ts` (the template composes without styles of its own).

## Checklist before delivering a screen

- [ ] Can you tell in two seconds where you are and what is important? (squint your eyes)
- [ ] Is there a single primary action?
- [ ] Does color mean something, and is it never alone? Does it also look right in dark (`globals=theme:dark`)?
- [ ] Are the empty, loading and error states covered, each with its way out?
- [ ] Can it be used entirely with the keyboard?
- [ ] Does it work with extreme data: very long names, ten-digit amounts, zero records?
- [ ] If an assistant acts: does it have a source, a preview of what changes, and undo?
- [ ] Was the screen built only with the system's components (no styles of its own)?
