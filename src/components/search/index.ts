/* Buscar con facetas, con los recortes metidos adentro del campo. */
export {
  type BuiltCondition,
  type BuiltFilter,
  type BuiltThrough,
  type ThroughMatch,
} from "@sincpro/web-ui/components/search/criteria";
export {
  type BuiltCriteria,
  type BuiltLevel,
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
/* Un campo alcanzado por relaciones: el selector (web-ui dibuja) y su modelo (quien lo usa
   pasa `loadModel`). */
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

/* LO QUE LA BARRA TIENE PUESTO: instancias. Una sola cosa para las dos clases
   —grupo y filtro—, con sus metadatos de UI afuera y el objeto del motor
   adentro, intacto. */
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
  toggleNamed,
  whereOf,
  withLevels,
} from "@sincpro/web-ui/components/search/criteria";
export {
  CriteriaChips,
  type CriteriaChipsProps,
} from "@sincpro/web-ui/components/search/CriteriaChips";

/* EL VOCABULARIO DEL MODELO — lo que el servidor publica sobre sus campos. Lo
   hablan el constructor de filtros, el de criterias y la barra de búsqueda, así
   que vive aparte de los tres. */
export {
  type FieldDefinition,
  fieldLabel,
  filterableNames,
  isFilterable,
  isNumericType,
  type ModelDefinition,
  type ModelTranslations,
} from "@sincpro/web-ui/components/search/model";

/* LA GRAMÁTICA DE LA BARRA: qué se puede preguntar sobre un modelo, y con qué.
   Tres pasos —campo, operador, valor— que se pueden escribir en uno. */
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

/* El recorte de fecha, como lo hace Odoo: meses, trimestres y años que se
   combinan. Se guarda la INTENCIÓN y se resuelve al leer. */
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
