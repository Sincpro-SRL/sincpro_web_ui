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
  FilterBuilder,
  SelectionTree,
} from "@sincpro/web-ui/components/search/FilterBuilder";
/* The builder's model — the tree, the JSON, the filter said in a line — without `"use client"`:
   a server component reads it (`tests/serverBoundary.test.ts`). */
export {
  blankGroup,
  describeFilter,
  liftRecords,
  namesOf,
  type RecordNames,
  recordOps,
  takesMany,
  type TreeCondition,
  treeFromFilter,
  type TreeGroup,
  type TreeHop,
  type TreeNode,
  treeToFilter,
} from "@sincpro/web-ui/components/search/filterTree";
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
export { formatJson } from "@sincpro/web-ui/components/search/formatJson";
export { JsonEditor } from "@sincpro/web-ui/components/search/JsonEditor";
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
  type RecordKey,
  type RecordOption,
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
  choiceLabel,
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
  choiceValues,
  conditionCriteria,
  defaultOp,
  describeCondition,
  fieldKey,
  globToLike,
  opLabel,
  type QueryDraft,
  type QueryField,
  queryField,
  queryFields,
  type QueryKind,
  type QuerySuggestion,
  readTyped,
  sayValues,
  suggest,
  type TypedValue,
  valueFor,
  valueLabel,
  valuesCriteria,
  type ValueShape,
  valuesSelection,
  withoutValue,
  withValue,
} from "@sincpro/web-ui/components/search/query";

/* THE RECORDS OF A RELATION: chosen by name, sent by key. The application gives ONE search
   (`searchRecords`) — by prop, or once for every bar and builder with `SearchProvider` — and
   its own value controls (`valueEditor`) for the fields it draws its way. */
export {
  SearchProvider,
  type SearchSettings,
  useSearchSettings,
  type ValueEditor,
  type ValueEditorProps,
} from "@sincpro/web-ui/components/search/context";
export {
  type BrowseRecords,
  type RecordBrowse,
  type RecordSearch,
  recordsFilter,
  recordsOf,
  type RecordTarget,
  recordTarget,
  sameKey,
  type SearchRecords,
} from "@sincpro/web-ui/components/search/records";
export { RuleValue } from "@sincpro/web-ui/components/search/RuleValue";

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
