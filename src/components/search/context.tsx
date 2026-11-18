"use client";

import type {
  FieldDefinition,
  ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import type { RecordOption, SearchRecords } from "@sincpro/web-ui/components/search/records";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/* ==================================================================== *
 *  WHAT AN APPLICATION GIVES THE SEARCH ONCE — and every bar and builder below reads.
 *
 *  Context: a screen has a bar, its builder in a dialog, a chooser with its own bar, an
 *  embedded list with another. Wiring `searchRecords` into each one is the same line four
 *  times, and the fifth screen forgets it. The application —web-framework— puts it ONCE,
 *  around the app, and a piece that is handed its own prop uses that one instead: the
 *  context is the default, the prop is the exception.
 *
 *      <SearchProvider searchRecords={…} valueEditor={…}>
 *        …every SearchBar / FilterBuilder / CriteriaBuilder below
 *      </SearchProvider>
 * ==================================================================== */

/** What a value control of the builder is handed: the field the rule compares, the
 *  comparison, and the value — written (`value`) or chosen (`values`, with their names). */
export interface ValueEditorProps {
  /** The field compared — the LAST one of the path — and its definition. */
  name: string;
  field: FieldDefinition;
  /** The relations crossed and the field, from the root: `["lines", "product_id"]`. */
  path: readonly string[];
  /** The model the field belongs to, when it already arrived. */
  model?: ModelDefinition;
  operator: string;
  /** What is written, for a value that is typed. */
  value: string;
  onValue: (value: string) => void;
  /** What is chosen, for a value that is picked — records of a relation, words of an enum —
   *  with their names: what travels is their `id`. */
  values: readonly RecordOption[];
  onValues: (values: RecordOption[]) => void;
  /** The value as it travels, when it is not a text: `true`, a number, a range `[a, b]` of a
   *  control of the application's. `undefined` = nothing set. */
  raw: unknown;
  onRaw: (raw: unknown) => void;
  /** The control's accessible name. */
  label: string;
}

/**
 * A value control of the application's own, for the fields it wants drawn its way — a date
 * range, a many2one with photos, a color. It answers `undefined` for the rest, which keep
 * the builder's control.
 */
export type ValueEditor = (props: ValueEditorProps) => ReactNode | undefined;

export interface SearchSettings {
  /** The application's search over the records of a relation (see `records.ts`). */
  searchRecords?: SearchRecords;
  /** The application's own value controls in the builder. */
  valueEditor?: ValueEditor;
}

const SearchContext = createContext<SearchSettings>({});

export function SearchProvider({
  searchRecords,
  valueEditor,
  children,
}: SearchSettings & { children: ReactNode }) {
  /* A provider nested inside another keeps what it does not say: a screen can swap the
     value controls and still search records the way the app does. */
  const outer = useContext(SearchContext);
  const value = useMemo<SearchSettings>(
    () => ({
      ...outer,
      ...(searchRecords === undefined ? {} : { searchRecords }),
      ...(valueEditor === undefined ? {} : { valueEditor }),
    }),
    [outer, searchRecords, valueEditor],
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

/** What is in force for a piece: its own props first, then the provider's. */
export function useSearchSettings(own: SearchSettings = {}): SearchSettings {
  const inherited = useContext(SearchContext);
  const searchRecords = own.searchRecords ?? inherited.searchRecords;
  const valueEditor = own.valueEditor ?? inherited.valueEditor;
  return {
    ...(searchRecords === undefined ? {} : { searchRecords }),
    ...(valueEditor === undefined ? {} : { valueEditor }),
  };
}
