/* The structure of a view: where each section starts and ends. */
export {
  Block,
  type BlockProps,
  type BlockStatus,
  Rule,
} from "@sincpro/web-ui/primitives/block/Block";
export { FullWidth, SectionGrid } from "@sincpro/web-ui/primitives/block/SectionGrid";
/* The three-zone line: what centres the centre against the LINE and not against
   what is left over. Both bands use it — the record's and the list's. */
export { Line } from "@sincpro/web-ui/primitives/block/Line";
export {
  Step,
  type StepProps,
  Steps,
  type StepsProps,
  useSteps,
} from "@sincpro/web-ui/primitives/block/Steps";
