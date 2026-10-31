/* The structure of a view: where each section starts and ends. */
export {
  Block,
  type BlockProps,
  type BlockStatus,
  Rule,
} from "@sincpro/web-ui/primitives/block/Block";
export { FullWidth, SectionGrid } from "@sincpro/web-ui/primitives/block/SectionGrid";
/* La línea de tres zonas: lo que centra el centro contra la LÍNEA y no contra
   lo que sobra. La usan las dos bandas — la del registro y la de la lista. */
export { Line } from "@sincpro/web-ui/primitives/block/Line";
export {
  Step,
  type StepProps,
  Steps,
  type StepsProps,
  useSteps,
} from "@sincpro/web-ui/primitives/block/Steps";
