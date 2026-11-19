import {
  Button,
  type DataColumn,
  filterCriteria,
  List,
  type ModelDefinition,
  type RecordOption,
  SearchBar,
  type SearchCriteria,
} from "@sincpro/web-ui";
import { useState } from "react";

import {
  COUNTRY_MODEL,
  COUNTRY_ROWS,
  PARTNER_MODEL,
  PARTNER_ROWS,
  recordsOf,
} from "./erp-search";
import { keepMatching } from "./local-criteria";

/**
 * Context: «Buscar más…» of a relation opens THIS — what web-framework does with the entity's
 * own list in choosing mode (`EntityList` + `List onChoose`). It is another context: the records
 * of the relation, with their OWN search bar, their own model and their own relations —the
 * customers' bar unfolds «País» the same way the invoices' bar unfolds «Cliente»—. One record
 * is chosen with a press on its row; several are ticked and added at once.
 */

type ChooserRow = { id: string; name: string } & Record<string, unknown>;

const REGION: Record<string, string> = {
  andina: "Andina",
  "cono-sur": "Cono Sur",
  amazonica: "Amazónica",
};

/** What each relation lists: its rows, its model —the chooser's bar asks with it— and its
 *  columns. A relation without one here lists its records by name. */
function setOf(relation: string): {
  rows: readonly ChooserRow[];
  model?: ModelDefinition;
  columns: DataColumn<ChooserRow>[];
} {
  if (relation === "Country") {
    return {
      rows: COUNTRY_ROWS,
      model: COUNTRY_MODEL,
      columns: [
        { id: "name", header: "País", value: (row) => row.name },
        { id: "code", header: "Código", value: (row) => String(row["code"]), mono: true },
        {
          id: "region",
          header: "Región",
          value: (row) => REGION[String(row["region"])] ?? "",
        },
      ],
    };
  }
  if (relation === "Partner") {
    return {
      rows: PARTNER_ROWS,
      model: PARTNER_MODEL,
      columns: [
        { id: "name", header: "Cliente", value: (row) => row.name },
        { id: "tax_id", header: "NIT", value: (row) => String(row["tax_id"]), mono: true },
        {
          id: "country",
          header: "País",
          value: (row) => (row["country"] as { name: string } | undefined)?.name ?? "",
        },
      ],
    };
  }
  return {
    rows: recordsOf(relation).map((one) => ({ id: String(one.id), name: one.name })),
    columns: [{ id: "name", header: "Nombre", value: (row) => row.name }],
  };
}

const option = (row: ChooserRow): RecordOption => ({ id: row.id, name: row.name });

export function RecordChooser({
  relation,
  text,
  many,
  chosen,
  onChoose,
}: {
  relation: string;
  /** What was typed where «Buscar más…» was pressed: the list opens on it. */
  text: string;
  many: boolean;
  /** Already chosen there: a chooser of many leaves them out. */
  chosen: readonly RecordOption[];
  onChoose: (records: RecordOption[]) => void;
}) {
  const set = setOf(relation);
  const [criteria, setCriteria] = useState<SearchCriteria[]>(() =>
    text.trim() === ""
      ? []
      : [
          filterCriteria(
            { field: "name", operator: "like", value: `%${text.trim()}%` },
            `Buscar «${text.trim()}»`,
          ),
        ],
  );
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const held = new Set(chosen.map((one) => String(one.id)));
  const shown = keepMatching(
    set.rows.filter((row) => !many || !held.has(row.id)),
    criteria,
    (row, field) => row[field],
  );
  const toggle = (id: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <List<ChooserRow>
      embedded
      items={shown}
      keyOf={(row) => row.id}
      present="table"
      onChoose={(row) => (many ? toggle(row.id) : onChoose([option(row)]))}
      {...(many
        ? {
            selection: {
              has: (id: string) => ticked.has(id),
              toggle,
              count: ticked.size,
              clear: () => setTicked(new Set()),
              actions: (
                <Button
                  role="primary"
                  size="sm"
                  onClick={() =>
                    onChoose(set.rows.filter((row) => ticked.has(row.id)).map(option))
                  }
                >
                  {`Agregar ${ticked.size}`}
                </Button>
              ),
            },
          }
        : {})}
    >
      <List.Bar>
        <List.Search>
          {/* Its OWN bar, over its own model: the customers' «País» unfolds into countries
              here too — the search inside the search. */}
          <SearchBar
            facets={[{ id: "name", label: "nombre" }]}
            {...(set.model === undefined ? {} : { model: set.model })}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            literal={(typed) => ({ field: "name", operator: "like", value: `%${typed}%` })}
            placeholder="buscar…"
          />
        </List.Search>
      </List.Bar>
      <List.Table<ChooserRow> columns={set.columns} />
    </List>
  );
}
