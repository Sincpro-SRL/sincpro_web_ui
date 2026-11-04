# Revisión para producción — librerías nuevas y piezas de archivo, chat, markdown y lienzo

Fecha: 2026-11-04. Alcance: `react-pdf`, `streamdown` y `@xyflow/react` agregados al paquete,
más las piezas que los usan. Todo lo de abajo se midió; lo que no se midió está dicho.

## 1. Veredicto

**Sí sirven para producción**, con tres condiciones que ya quedaron aplicadas en el código:

1. Ninguna pieza pesada entra en el bundle principal: pdf.js se carga sólo al abrir un PDF,
   streamdown sólo al abrir markdown o usar `Markdown`, y `Canvas` sólo si la app lo importa.
2. Los estilos de streamdown viven en `tokens.css`, así que la app sigue importando un solo
   archivo (el contrato del paquete se mantiene).
3. El paquete exige Node 26 para instalar; eso ya estaba declarado antes de este cambio (ver §5).

## 2. Madurez y licencias

| Paquete         | Versión | Última publicación | Licencia   | Peer React | Veredicto                                     |
| --------------- | ------- | ------------------ | ---------- | ---------- | --------------------------------------------- |
| `react-pdf`     | 11.0.0  | 2026-09-10         | MIT        | ^19        | Sirve. Sobre `pdfjs-dist` 6.3.x (Apache-2.0). |
| `streamdown`    | 2.7.1   | 2026-10-19         | Apache-2.0 | ^18 ‖ ^19  | Sirve. Mantenido por Vercel.                  |
| `@xyflow/react` | 12.12.1 | 2026-11-04         | MIT        | >=17       | Sirve.                                        |

- **Auditoría de dependencias** (`yarn audit`, dependencias de producción): **0 vulnerabilidades**
  en 296 paquetes.
- **Árbol nuevo**: 150 paquetes agregados al lockfile, ninguno eliminado. **Todos** tienen
  licencia permisiva (126 MIT, 9 ISC, 3 Apache-2.0, 1 BSD-3, 1 BSD-2).
- **Binarios nativos**: `@napi-rs/canvas` llega como dependencia _opcional_ de pdf.js, pensada
  para Node. Sólo se instala el binario de la plataforma del desarrollador; no entra en el
  bundle del navegador (verificado con el build).

## 3. Tamaño medido (bundles de consumidor, minificado, gzip)

Cada medición es un bundle independiente que importa **sólo** la pieza indicada, con los
módulos del paquete compilados (`make build`):

| Entrada del consumidor                                          | Gzip                   |
| --------------------------------------------------------------- | ---------------------- |
| Solo `Button` (referencia del sistema)                          | **6 KB**               |
| Solo `ChatThread` (chat completo)                               | **13 KB**              |
| Solo `Canvas` (React Flow)                                      | **72 KB**              |
| Solo `Markdown` (streamdown)                                    | **170 KB**             |
| Vista previa de imagen (chunk inicial)                          | **~59 KB** compartidos |
| Vista previa de PDF (chunk de pdf.js, al abrir un PDF)          | **+193 KB**            |
| Vista previa de markdown (chunk de streamdown, al abrir un .md) | **+161 KB**            |

Lectura: quien no usa estas piezas no paga nada (el paquete declara `sideEffects` sólo para CSS,
así que el bundler descarta lo que no se importa). Quien las usa paga el costo de la tabla.

**Recomendación para la app**: cargar `Canvas` y `Markdown` con `lazy()` si aparecen en una
pantalla que no es la principal. `FilePreview` ya lo hace para ambos internamente.

## 4. Decisiones de implementación

- **PDF** (`components/preview/PdfPreview`): `react-pdf` con `renderTextLayer` y
  `renderAnnotationLayer` apagados. Así no hace falta su hoja de estilos ni hay capas que
  desalineen con el zoom. El worker de pdf.js se resuelve desde la dependencia; una app con CSP
  estricta o que sirve el worker desde su CDN pasa `pdfWorkerUrl`.
- **Markdown** (`primitives/value/Markdown`): streamdown con `mode` `static`/`streaming`. Para
  el texto que todavía llega, retiene lo que no se puede leer aún. Verificado en el servidor:
  un `<script>` en el markdown no llega al HTML (test `markdown.test.tsx`), y en el navegador la
  historia «Hostil» comprueba que no hay script ni `onerror` en el DOM.
- **Estilos**: `tokens.css` lleva dos `@source` para streamdown (la ruta del repo y la de
  instalación hoisted del consumidor; la que no existe no hace nada) y su CSS de animaciones.
  Una app no agrega nada más.
- **Canvas** (`components/canvas/Canvas`): controlado (la app guarda nodos y conexiones),
  `readOnly` para diagramas de consulta, y las variables de React Flow mapeadas a tokens en
  `canvas.css`.
- **Chat**: hilo que abre en el último mensaje y sólo sigue el final si la persona ya está ahí;
  compositor con Enter para enviar y Shift+Enter para nuevo renglón (ignora la composición del
  IME); lista de conversaciones sobre `ListBox` de React Aria con no leídos en número.
- **Archivos**: `Attachments` ya listaba y descargaba; no se duplicó. Se agregó `FilePreview`,
  que despacha por tipo y deja la descarga siempre visible.

## 5. Requisito de Node 26 (preexistente, no introducido aquí)

`package.json` declara `"engines": { "node": ">=26" }` desde antes de este cambio. Yarn se niega
a instalar con Node 22 (`The engine "node" is incompatible`). Para trabajar en el repo hay que
usar Node 26 (`nvm use 26`). La dependencia nueva más exigente, `pdfjs-dist`, pide Node
22.13 o superior: no es la razón del requisito.

## 6. Pruebas

- **Node** (`vitest --project model`): **832/832**.
- **Chrome** (`storybook` y `storybook-dark`, todas las historias, incluidos los `play` y el
  chequeo de accesibilidad con axe): **393/394** en la corrida completa previa; la última (con los avisos copiables) dio **392/394**, con el mismo fallo preexistente. Después de esa
  corrida cambié el botón de descarga a `ButtonLink`; su historia (`Preview`) pasa 5/5, pero no
  repetí la suite completa. El único fallo es
  `CRM › Oportunidad` en modo oscuro (ver §7).
- `tsc`, `lint` y `make doctor` (reglas de niveles): sin errores.
- No corrí el objetivo `make smoke` tal cual; corrí los mismos proyectos de Storybook que usa
  (`storybook` y `storybook-dark`), que incluyen los `play` y axe de cada historia.

## 7. Riesgos abiertos

1. **`CRM › Oportunidad` (modo oscuro) falla en la suite completa.** Verificado: el commit
   original (`d1d095b`, sin mis cambios) falla igual en la misma corrida, en claro y oscuro.
   Es preexistente, y no lo corregí aquí. El error es un `act(...)` que aparece durante el click
   de «Ganado». Corre bien aislado; falla bajo carga de la suite.
2. **Las historias de carga lenta** (PDF, markdown de archivo) ahora esperan su contenido con
   timeouts de 10 s. La primera carga de pdf.js y streamdown tras instalar tarda más de 1 s en
   el dev server.
3. **Worker de pdf.js bajo CSP**: si la app bloquea `blob:` o el origen del worker, la vista
   previa del PDF falla con la pieza de error (que trae el botón de copiar el error). Solución:
   `pdfWorkerUrl`.
4. **Streamdown y su `linkSafety`** quedaron en su valor por defecto; no verifiqué en
   documentación cuál es, sólo que la opción existe. Revisar antes de mostrar markdown de
   terceros en producción.
5. **Canvas y licencias**: `tldraw` y `excalidraw` no se agregaron; su licencia no está verificada
   y no se necesitan para lo pedido (React Flow cubre diagramas y flujos).

## 8. Qué no se agregó a propósito

- Un visor de Office (Word, Excel): los visores que lo hacen envían el documento a un tercero.
  La vista previa dice que no hay vista previa y deja la descarga.
- Pizarra libre (`tldraw`): pendiente de licencia verificada.
