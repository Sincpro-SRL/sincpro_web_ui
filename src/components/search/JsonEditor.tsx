"use client";

import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { useTheme } from "@sincpro/web-ui/foundations/theme";
import { Button } from "@sincpro/web-ui/primitives/button/index";
import CodeMirror, { EditorView, Prec } from "@uiw/react-codemirror";
import { Wand2 } from "lucide-react";

/* ====================================================================== *
 *  UN JSON QUE SE ESCRIBE A MANO, EN UN EDITOR DE VERDAD.
 *
 *  CodeMirror y no un `<textarea>` con colores encima: eso último llegó hasta
 *  donde llegan cincuenta líneas —pintar las comillas— y se quedaba corto en
 *  todo lo demás, que es lo que hace usable escribir un filtro a mano:
 *  números de línea para saber dónde está el error, plegado para no perderse
 *  en un `all` de seis condiciones, y el subrayado en el carácter exacto
 *  donde el JSON se rompe en vez de un cartel que dice que algo está mal.
 *
 *  El `linter` de abajo es el del propio paquete de JSON: marca el error
 *  mientras se escribe. El aviso de afuera —`error`— sigue existiendo porque
 *  dice otra cosa: que el JSON está bien escrito pero no es un filtro.
 * ====================================================================== */

/** Un JSON acomodado, o el mismo texto si todavía no se puede leer.
 *
 *      in   '{"all":[{"field":"a","operator":"=","value":1}]}'
 *      out  el mismo, con sangría de dos espacios y un campo por línea
 *
 *  Separado del componente para que se pueda probar sin dibujar nada, que es lo único que
 *  tiene lógica acá adentro. */
export function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/* The built-in `light`/`dark` themes pick the SYNTAX colours; this layer paints the box from
   the system's tokens, so the editor sits on the same surface as the fields around it in
   either theme instead of on a hard-coded one. */
const SURFACE_THEME = EditorView.theme({
  "&": { backgroundColor: "var(--color-surface)", color: "var(--color-ink)" },
  ".cm-gutters": {
    backgroundColor: "var(--color-ground)",
    color: "var(--color-muted)",
    borderRightStyle: "solid",
    borderRightWidth: "thin",
    borderRightColor: "var(--color-line)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-ink)" },
});

export function JsonEditor({
  value,
  onChange,
  error,
  height = "16rem",
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Qué está mal con lo escrito más allá de la sintaxis — que sea JSON válido pero no un
   *  filtro, por ejemplo. Los errores de sintaxis los marca el editor, en su lugar exacto. */
  error?: string | null;
  height?: string;
  /** Cómo se llama este editor. Sin esto dice sólo que es un editor de código,
   *  que es lo único que se puede decir sin saber qué se escribe adentro. */
  label?: string;
}) {
  const copy = useUiCopy();
  const surface = useSurface();
  const { resolved } = useTheme();
  /* The chrome is dark in both themes; the canvas follows the theme. */
  const dark = surface === "chrome" || resolved === "dark";

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-micro text-muted">{label ?? copy.builder.editor}</p>
        <Button
          role="ghost"
          size="sm"
          disabled={value.trim() === ""}
          onClick={() => onChange(formatJson(value))}
        >
          <Wand2 className="size-3" /> {copy.builder.format}
        </Button>
      </div>

      <div
        className={`overflow-hidden rounded-control border ${
          error == null ? "border-ink/15" : "border-danger"
        }`}
      >
        <CodeMirror
          value={value}
          onChange={onChange}
          height={height}
          theme={dark ? "dark" : "light"}
          extensions={[
            json(),
            linter(jsonParseLinter()),
            lintGutter(),
            ...(surface === "chrome" ? [] : [Prec.highest(SURFACE_THEME)]),
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: false,
            /* El resaltado del par de llaves es lo que hace legible un filtro anidado: sin él,
               en un `any` adentro de un `all` hay que contar corchetes con el dedo. */
            bracketMatching: true,
            closeBrackets: true,
          }}
        />
      </div>

      {error == null ? null : <p className="text-micro text-danger">{error}</p>}
    </div>
  );
}
