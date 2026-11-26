# Whis · FEFO térmico y liquidación B2B

App web (PWA) para celulares que calcula la **vida útil real** de cada lote de perecibles según el calor al que estuvo expuesto, te dice **qué sacar primero** y te ayuda a **rematar por WhatsApp** lo que está por perderse. Funciona **sin internet**: todo se guarda en el propio equipo.

## Cómo ejecutarla (Windows)

1. Instala **Node.js 20 o superior** (versión LTS) desde https://nodejs.org (siguiente, siguiente, finalizar).
2. Abre una terminal en esta carpeta: en el Explorador entra a `D:\Proyectos\Whis-Amazonia`, escribe `cmd` en la barra de direcciones y presiona Enter.
3. La primera vez instala las dependencias:
   ```
   npm install
   ```
4. Arranca la app:
   ```
   npm run dev
   ```
5. Abre en el navegador la dirección que aparece (normalmente http://localhost:5173).
   Para verla en tu celular, conéctalo al mismo Wi-Fi y abre la dirección "Network" que muestra la terminal (por ejemplo `http://192.168.1.20:5173`).

Para detenerla, presiona `Ctrl + C` en la terminal.

### Versión final (instalable y offline)

```
npm run build
npm run preview
```
La carpeta `dist/` queda lista para subir gratis a Netlify, Vercel o GitHub Pages. Al abrirla desde el celular con HTTPS, el navegador ofrece **"Instalar app"** / **"Agregar a pantalla de inicio"**, y desde ahí funciona sin conexión.

> El escáner QR con cámara, el micrófono y la instalación como app necesitan **HTTPS** (o `localhost`). En la red local por `http://192.168…` usa los botones de simulación y el dictado escrito.

## Publicar en internet (HTTPS)

La instalación como app, la cámara (QR) y el micrófono solo funcionan con **HTTPS**. El proyecto ya trae `netlify.toml`, así que publicarlo en Netlify es directo:

1. Entra a https://app.netlify.com y elige **Add new site → Import an existing project → GitHub**.
2. Selecciona el repositorio `Whis_Amazonia` y la rama `main`. Netlify lee `netlify.toml` solo (comando `npm run build`, carpeta `dist`).
3. Pulsa **Deploy**. En un minuto tendrás una dirección `https://<nombre>.netlify.app`, con HTTPS incluido.
4. Cada cambio que se suba a `main` se publica solo, y los celulares reciben la nueva versión al volver a abrir la app.

**Otras opciones:** en Vercel funciona igual (detecta Vite solo). Para GitHub Pages, que publica en una subcarpeta, compila con `BASE_PATH=/Whis_Amazonia/ npm run build`.

## Qué incluye

- **Inicio:** dinero en riesgo, caja recuperada, % de merma evitada, lista "Qué sacar primero hoy" y gráfico semanal.
- **Botón +:** registro de lote en segundos por QR (o "Simular J-104"), por voz ("Ingresan 80 kilos de pollo a cámara 1 con 2 horas sin frío") o tocando.
- **Lotes:** filtros por semáforo y cámara. Al tocar un lote se abren todas sus acciones: despacho parcial/total, liquidar, curva térmica estimada, **corregir datos** (jaba, producto, cámara, peso, precios) y baja por merma con **foto obligatoria**.
- **Deshacer:** tras registrar, despachar, liquidar, dar de baja, corregir o registrar un apagón aparece unos segundos el botón **Deshacer** sobre la barra inferior.
- **Frío/Alertas:** registro de cortes de luz que recalcula al instante todos los lotes de la cámara y deja bitácora.
- **Liquidar:** descuento 20–50 %, agenda de compradores, mensaje automático y envío por WhatsApp; "Marcar como Liquidado" suma a Caja Recuperada.
- **Ajustes (ícono de la esquina):** **Mis productos** (agregar o editar productos con su vida útil, temperatura ideal, sensibilidad al calor y costo), tema claro/oscuro, exportar CSV (abre en Excel), exportar y restaurar respaldo JSON, borrar todo o cargar la demo.

## Importante antes de usarla en serio

- La primera vez que abres la app en un equipo eliges **"Usar con mis datos"** (empieza vacía, sin lotes ni compradores de ejemplo) o **"Ver la demo"**. Mientras ves la demo, la cabecera muestra la etiqueta **Demo**. Puedes cambiar luego en **Ajustes → Borrar todo / Cargar demo**.
- Agrega tus compradores reales desde **Liquidar → Preparar oferta → Nuevo**. Los de la demo tienen teléfonos ficticios (`+51 900 000 00X`).
- Los datos viven solo en el navegador de este equipo. Exporta el respaldo JSON (**Ajustes → Exportar respaldo JSON**) al menos una vez por semana y guárdalo fuera del celular; la app te lo recuerda si pasan 7 días. Para recuperarlo en otro equipo usa **Ajustes → Restaurar respaldo JSON**.
- Si alguna vez la app no puede abrir los datos guardados (archivo dañado o de otra versión), **no los borra**: guarda una copia aparte y te ofrece descargarla desde Ajustes.
- El gráfico de temperatura de cada lote es una **curva estimada** a partir de la condición de llegada y los apagones registrados; todavía no se conecta a un sensor real.

## Motor FEFO térmico

```
horasEquivalentes = horasEnCámara + horasExposiciónCalor × factorRiesgoCalor
horasRestantes    = max(0, vidaBase − horasEquivalentes)
% vida útil       = horasRestantes / vidaBase × 100
Verde > 50 %  ·  Amarillo 20–50 %  ·  Rojo < 20 %
```
Catálogo base y factores: `src/data/catalog.ts` (cada negocio puede reemplazarlo desde **Ajustes → Mis productos**; se guarda junto con sus datos y en el respaldo JSON). Lógica: `src/utils/fefoEngine.ts`.

## Estructura

```
src/
  types.ts                 Tipos (Lote, Producto, EventoTermico, CompradorB2B, BajaMerma…)
  data/catalog.ts          8 productos amazónicos, cámaras, motivos
  data/seedData.ts         Datos de demo (8 lotes, 4 compradores, 2 apagones, historial)
  utils/fefoEngine.ts      Motor FEFO y formateadores (S/, horas)
  utils/voiceParser.ts     Interpreta frases dictadas
  utils/exportar.ts        Exportación CSV / JSON
  utils/persistencia.ts    Guardado local, validación y restauración de respaldos
  hooks/useWhisStore.tsx   Estado + guardado offline (localStorage)
  components/ui/           ModernSelect, BottomSheet, Toast, piezas comunes
  components/              DashboardView, BatchesView, ColdChainView, LiquidationView,
                           AddBatchSheet, WasteAuditModal, ThermalChartModal, …
```

Para cambiar el nombre o el logo: `public/logo-whis.png`, íconos `public/icon-*.png` y el `manifest` en `vite.config.ts`.
