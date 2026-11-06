/* Search with facets, with the cuts built into the field. */
export {
  type BuiltCondition,
  type BuiltFilter,
  type BuiltThrough,
  type ThroughMatch,
} from "@sincpro/web-ui/components/search/criteria";
export {
  type BuiltCriteria,
  type BuiltGrouping,
  type BuiltLevel,
  type BuiltMeasure,
  type BuiltSort,
  CriteriaBuilder,
} from "@sincpro/web-ui/components/search/CriteriaBuilder";
export {
  blankGroup,
  describeFilter,
  FilterBuilder,
  type TreeCondition,
  treeFromFilter,
  type TreeGroup,
  type TreeHop,
  type TreeNode,
  treeToFilter,
} from "@sincpro/web-ui/components/search/FilterBuilder";
/* A field reached through relations: the selector (web-ui draws) and its model (whoever uses it
   passes `loadModel`). */
export {
  FieldPath,
  type FieldPathProps,
  type FieldPathRule,
  type PathPick,
  useFieldPathSteps,
  useModelCache,
} from "@sincpro/web-ui/components/search/FieldPath";
export { formatJson, JsonEditor } from "@sincpro/web-ui/components/search/JsonEditor";
export {
  createModelCache,
  type FieldPathStep,
  type FieldPathValue,
  isRelation,
  isToMany,
  type LoadModel,
  type ModelCache,
  pathLabel,
  peekLabels,
  resolvePath,
} from "@sincpro/web-ui/components/search/paths";
export {
  SearchBar,
  type SearchBarProps,
  type SearchFacet,
} from "@sincpro/web-ui/components/search/SearchBar";

/* WHAT THE BAR HAS SET: instances. A single thing for both kinds
   —group and filter—, with their UI metadata outside and the engine's object
   inside, intact. */
export {
  at,
  criteriaId,
  type CriteriaJoin,
  type CriteriaPath,
  filterCriteria,
  filtersOf,
  type GroupCriteria,
  groupCriteria,
  groupsOf,
  hasNamed,
  levelsOf,
  nextJoin,
  removeAt,
  replaceAt,
  type SearchCriteria,
  selectionOf,
  toggleNamed,
  withLevels,
} from "@sincpro/web-ui/components/search/criteria";
export {
  CriteriaChips,
  type CriteriaChipsProps,
} from "@sincpro/web-ui/components/search/CriteriaChips";

/* THE MODEL'S VOCABULARY — what the server publishes about its fields. The
   filter builder, the criteria builder and the search bar speak it, so
   it lives apart from the three. */
export {
  type FieldDefinition,
  fieldLabel,
  filterableNames,
  isFilterable,
  isNumericType,
  type ModelDefinition,
  type ModelTranslations,
} from "@sincpro/web-ui/components/search/model";

/* THE BAR'S GRAMMAR: what can be asked about a model, and with what.
   Three steps —field, operator, value— that can be written as one. */
export {
  answers,
  defaultOp,
  describeCondition,
  globToLike,
  opLabel,
  type QueryDraft,
  type QueryField,
  queryFields,
  type QueryKind,
  type QuerySuggestion,
  readTyped,
  suggest,
  type TypedValue,
  valueFor,
  type ValueShape,
  withoutValue,
} from "@sincpro/web-ui/components/search/query";

/* The date cut, the way Odoo does it: months, quarters and years that
   combine. The INTENT is saved and resolved on read. */
export {
  type DatePeriod,
  datePeriodGroup,
  datePeriodOptions,
  type DateRange,
  periodId,
  readPeriodId,
  recentMonths,
  recentYears,
  resolvePeriods,
} from "@sincpro/web-ui/components/search/datePeriods";
