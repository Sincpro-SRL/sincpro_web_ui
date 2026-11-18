"use client";

import type { ValueEditorProps } from "@sincpro/web-ui/components/search/context";
import type { RecordOption } from "@sincpro/web-ui/components/search/criteria";
import { choiceLabel } from "@sincpro/web-ui/components/search/model";
import type { RecordTarget, SearchRecords } from "@sincpro/web-ui/components/search/records";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Picker } from "@sincpro/web-ui/primitives/picker/Picker";
import { TagsField } from "@sincpro/web-ui/primitives/picker/TagsField";
import { useEffect, useState } from "react";

/* ==================================================================== *
 *  THE VALUE OF A RULE — written when it is written, CHOSEN when it is chosen.
 *
 *  Context: the builder asked every value in a text box, so «Cliente es …» wanted an id
 *  nobody knows and «Estado es …» a raw value («paid») nobody reads. The control now follows
 *  the field and the comparison:
 *
 *      a relation        es / no es        one record, picked by name    (Picker)
 *                        está en / no …    several, as tags              (TagsField)
 *      an enum           es / no es        its words                     (select)
 *                        está en / no …    several of its words          (TagsField)
 *      yes / no          es                sí · no                       (select)
 *      anything else                       what is typed                 (input)
 *
 *  What is read is the name; what travels is the key — `values` keeps both. An application
 *  that wants a field drawn its own way answers it from `valueEditor` before any of this.
 * ==================================================================== */

/** The comparisons that take several values. */
export function takesMany(operator: string): boolean {
  return operator === "in" || operator === "not in";
}

/** How long the control waits for the typing to stop before asking. */
const DELAY = 200;

/**
 * The records of a relation as a control's options: asked of the application's search as
 * the person types, the older question cancelled. It asks nothing until the list is opened —
 * a filter with five rules does not fetch five lists nobody looks at.
 */
function useRecordOptions(
  search: SearchRecords | undefined,
  target: RecordTarget | undefined,
  path: readonly string[],
) {
  const [text, setText] = useState<string | null>(null);
  const [found, setFound] = useState<{ loading: boolean; options: RecordOption[] }>({
    loading: false,
    options: [],
  });
  const key = target === undefined || text === null ? "" : `${path.join(".")}\u0000${text}`;

  useEffect(() => {
    if (search === undefined || target === undefined || text === null) return;
    const controller = new AbortController();
    setFound((before) => ({ loading: true, options: before.options }));
    const timer = window.setTimeout(() => {
      search({ relation: target.relation, path, text, signal: controller.signal }).then(
        (options) => {
          if (!controller.signal.aborted) setFound({ loading: false, options: [...options] });
        },
        () => {
          if (!controller.signal.aborted) setFound({ loading: false, options: [] });
        },
      );
    }, DELAY);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Asked again only when WHAT is searched changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...found, search: (next: string) => setText(next) };
}

/** A relation's records: one, picked by name, or several as tags. */
function RecordValue({
  props,
  target,
  searchRecords,
}: {
  props: ValueEditorProps;
  target: RecordTarget;
  searchRecords: SearchRecords;
}) {
  const { values, onValues, path, operator, label } = props;
  const found = useRecordOptions(searchRecords, target, path);
  /* A record read back has no name until the builder asks for it (`useRecordNames`). */
  const shown = (one: RecordOption) => (one.name === "" ? `#${one.id}` : one.name);

  if (takesMany(operator)) {
    const known = new Map<string, RecordOption>();
    for (const one of [...values, ...found.options]) known.set(String(one.id), one);
    return (
      <span className="min-w-0 flex-1 basis-56">
        <TagsField
          mode="edit"
          aria-label={label}
          value={values.map((one) => String(one.id))}
          options={[...known.values()].map((one) => ({
            value: String(one.id),
            label: shown(one),
            ...(one.meta === undefined ? {} : { meta: one.meta }),
          }))}
          onSearch={found.search}
          onChange={(next) =>
            onValues(
              next
                .map((id) => known.get(id))
                .filter((one): one is RecordOption => one !== undefined),
            )
          }
        />
      </span>
    );
  }

  const chosen = values[0];
  return (
    <span className="min-w-0 flex-1 basis-56">
      <Picker
        mode="edit"
        aria-label={label}
        items={found.options.map((one) => ({
          id: String(one.id),
          name: one.name,
          ...(one.meta === undefined ? {} : { meta: one.meta }),
        }))}
        loading={found.loading && found.options.length === 0}
        {...(chosen === undefined
          ? {}
          : { value: String(chosen.id), valueLabel: shown(chosen) })}
        onSearch={found.search}
        onChange={(id) => {
          const one = found.options.find((each) => String(each.id) === id);
          if (one !== undefined) onValues([one]);
        }}
        onClear={() => onValues([])}
      />
    </span>
  );
}

/**
 * The builder's own value control for a rule — what is drawn when the application's
 * `valueEditor` does not answer for the field.
 */
export function RuleValue({
  props,
  target,
  searchRecords,
  box,
  inputType,
}: {
  props: ValueEditorProps;
  /** The rule asks about records of a relation. */
  target?: RecordTarget;
  searchRecords?: SearchRecords;
  /** The look of the row's other controls, for the native ones. */
  box: string;
  inputType: string;
}) {
  const copy = useUiCopy();
  const { field, name, model, operator, value, onValue, values, onValues, label } = props;

  if (target !== undefined && searchRecords !== undefined) {
    return <RecordValue props={props} target={target} searchRecords={searchRecords} />;
  }

  const choices = (field.choices ?? []).map((one) => String(one));
  const word = (one: string) =>
    model === undefined ? one : choiceLabel(model, name, one, copy.locale);

  if (choices.length > 0 && takesMany(operator)) {
    return (
      <span className="min-w-0 flex-1 basis-56">
        <TagsField
          mode="edit"
          aria-label={label}
          value={values.map((one) => String(one.id))}
          options={choices.map((one) => ({ value: one, label: word(one) }))}
          onChange={(next) => onValues(next.map((one) => ({ id: one, name: word(one) })))}
        />
      </span>
    );
  }

  if (choices.length > 0) {
    return (
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onValue(event.target.value)}
        className={`min-w-0 flex-1 basis-40 rounded-control border px-2 py-1 text-meta ${box}`}
      >
        <option value="">{copy.builder.chooseValue}</option>
        {choices.map((one) => (
          <option key={one} value={one}>
            {word(one)}
          </option>
        ))}
      </select>
    );
  }

  const type = field.type.toLowerCase();
  if (type === "boolean" || type === "bool") {
    /* Sí / no travel as what they are —`true`, `false`—, not as the words. */
    return (
      <select
        aria-label={label}
        value={props.raw === true ? "true" : props.raw === false ? "false" : ""}
        onChange={(event) =>
          props.onRaw(event.target.value === "" ? undefined : event.target.value === "true")
        }
        className={`min-w-0 flex-1 basis-40 rounded-control border px-2 py-1 text-meta ${box}`}
      >
        <option value="">{copy.builder.chooseValue}</option>
        <option value="true">{copy.table.yes}</option>
        <option value="false">{copy.table.no}</option>
      </select>
    );
  }

  return (
    <input
      aria-label={label}
      type={inputType}
      value={value}
      onChange={(event) => onValue(event.target.value)}
      placeholder={copy.builder.value}
      className={`min-w-0 flex-1 basis-40 rounded-control border px-2 py-1 text-meta ${box}`}
    />
  );
}
