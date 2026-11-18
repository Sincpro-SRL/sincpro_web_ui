/* A GUIDED TOUR — the screen explains what each thing is, where it is. */
export {
  Guide,
  type GuideCloseReason,
  type GuideProps,
  type GuideStep,
} from "@sincpro/web-ui/components/guide/Guide";
export { GuideSpot } from "@sincpro/web-ui/components/guide/GuideSpot";
/* The rules underneath, for an application that draws a tour of its own. */
export {
  type Box as GuideBox,
  type CardPlacement as GuideCardPlacement,
  type GuideSide,
  type Size as GuideSize,
  placeCard,
} from "@sincpro/web-ui/components/guide/place";
export {
  boxOf,
  findTarget,
  type Found as GuideMatch,
  type GuideTarget,
  selectorOf,
} from "@sincpro/web-ui/components/guide/target";
