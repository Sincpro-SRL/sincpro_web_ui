/**
 * Context: the package is four levels, composed bottom-up, and each level only imports
 * from the ones below:
 *
 *   foundations  the decisions — tokens, copy, density, surfaces, slots
 *   primitives   a piece that does not know which screen it is on
 *   components   primitives composed to answer one question of the product
 *   views        the two macros: one record (`Record`), or N records (`List`)
 *
 * Each level is also its own entry (`@sincpro/web-ui/primitives`, …), so what a level
 * offers is one import away. What a family makes public is what its `index.ts` exports.
 *
 * If something needs to know what an invoice, a dataset or a customer is, it does not
 * belong here: that is domain, and it lives in the application.
 */
export * from "@sincpro/web-ui/components/index";
export * from "@sincpro/web-ui/foundations/index";
export * from "@sincpro/web-ui/primitives/index";
export * from "@sincpro/web-ui/views/index";
