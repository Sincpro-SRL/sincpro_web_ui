import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Context: Storybook looks at THIS project ONLY. It cannot import the
 * application, and that is what guarantees that no piece in here ends up
 * knowing what a dataset is.
 */
const config: StorybookConfig = {
  /* El orden del sidebar sale de este arreglo y no del alfabeto.
     ────────────────────────────────────────────────────────────────
     Las secciones son NIVELES DE ABSTRACCIÓN, no temas. Un nivel se
     define por lo que el componente SABE:

       1 · Fundamentos   las decisiones: color, tipografía, escalas,
                         movimiento. No hay componentes acá.

       2 · Primitivas    un átomo no sabe en qué pantalla está. `Button`,
                         `TextInput`, `Menu`, `Tag` se usan igual adentro de
                         una celda, de un filtro o de un diálogo — y por eso
                         los CONTROLES de formulario viven acá y no con los
                         formularios: un `TextInput` no sabe que existe un
                         formulario.

       3 · Componentes   un organismo compone primitivas para contestar UNA
                         pregunta del producto, y se agrupa por CASO DE USO:
                           Shell      el marco: arriba, al costado, el árbol
                           Búsqueda   cómo se recorta y se parte
                           Datos      qué muestra N cosas
                           Registro   las piezas de un registro y su forma
                           Tiempo     calendario, gantt, línea de tiempo
                           Actividad  qué le pasó a algo y qué hay que saber
                           Archivos   adjuntos, en un mensaje, la vista previa
                           Ayuda      la guía y el asistente
                         Siguen siendo componentes: se usan sueltos. Las
                         primitivas y las plantillas se agrupan igual, con
                         las mismas palabras (el orden: `storySort`, en
                         preview.ts).

       4 · Vistas        las DOS macros, y nada más. Una pantalla de este
                         producto —y de cualquier producto de gestión— es una
                         de dos cosas: un registro, o N registros. Todo lo
                         demás que parecía una vista era un componente
                         disfrazado: un formulario es la forma de un registro,
                         la barra de la aplicación es un componente que se usa
                         una vez, y comparar superficies es un fundamento.

                           Registro      UN registro
                           Lista         N registros

                         Que sean dos y no siete es el punto: si algo no entra
                         en ninguna de las dos, no es una vista.

     El error que esto corrige: había secciones hermanas con niveles
     distintos adentro —los controles (átomos) al lado de los tipos de
     formulario (templates)— y una sección que mezclaba `Button` con
     `Activity` (el chatter de entonces). Cuando el nivel no manda, la jerarquía se aplana y deja de
     decir por dónde empezar a leer. */
  stories: [
    "../stories/Introduction.mdx",
    "../stories/Estilo.mdx",
    "../stories/Mostrador.mdx",
    "../stories/foundations/*.stories.@(ts|tsx)",
    "../stories/primitives/**/*.stories.@(ts|tsx)",
    "../stories/components/**/*.stories.@(ts|tsx)",
    "../stories/views/**/*.stories.@(ts|tsx)",
    "../stories/templates/**/*.stories.@(ts|tsx)",
    "../stories/Extender.mdx",
    "../stories/extend/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    // The stories ARE the tests (vitest.config.ts): «Run tests» in the sidebar runs them.
    "@storybook/addon-vitest",
    // An MCP server at /mcp while the dev server runs: it lets an agent read
    // the stories that ALREADY exist instead of guessing them.
    "@storybook/addon-mcp",
  ],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
