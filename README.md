# Sara Quiz · Oposición Agente Forestal

Web estática (HTML + CSS + JS vanilla, sin frameworks ni build step) para hacer
exámenes tipo test de estudio desde el móvil. Pensada para GitHub Pages y para
usarse desde Safari en iPhone, incluso añadida a la pantalla de inicio.

## Estructura

```
sara-quiz-forestal/
├── index.html              # Única página, con las 4 vistas (menú, intro, examen, resultados)
├── manifest.json           # PWA ligera (sin service worker, sin offline)
├── css/
│   └── style.css
├── js/
│   ├── storage.js          # Historial de intentos en localStorage
│   ├── quiz-engine.js      # Selección aleatoria, barajado, cálculo de nota
│   └── app.js               # Controlador: carga datos, gestiona vistas y eventos
├── icons/
│   ├── icon-180.png        # apple-touch-icon
│   ├── icon-192.png        # manifest.json
│   └── icon-512.png        # manifest.json
└── data/
    ├── quizzes-manifest.json                          # Índice de exámenes disponibles
    └── ejemplo-constitucion-titulo-preliminar.json     # Quiz de ejemplo (placeholder)
```

## Cómo añadir un quiz nuevo

Esto es lo único que hay que tocar cuando lleguen los PDFs reales. **No hace
falta tocar `index.html`, `css/` ni `js/`.**

### 1. Crear el JSON de preguntas

Un archivo nuevo en `data/`, por ejemplo `data/codigo-penal-titulo-i.json`,
con un array de preguntas. Formato exacto de cada pregunta:

```json
{
  "id": "cp-1",
  "pregunta": "Texto de la pregunta",
  "opciones": ["Opción A", "Opción B", "Opción C"],
  "correcta": 0,
  "explicacion": "Texto breve opcional que se muestra en la revisión final."
}
```

Reglas del formato:

- **Siempre 3 opciones** en `opciones` (el motor está pensado para 3, no 4).
- `correcta` es el **índice** (0, 1 o 2) de la opción correcta dentro del
  array `opciones`, tal y como está escrito en el JSON (el motor baraja el
  orden en pantalla, pero `correcta` se refiere al orden del archivo).
- `explicacion` es opcional; si no se incluye, simplemente no aparece nada en
  la revisión final para esa pregunta.
- `id` debe ser único dentro del archivo (sirve para depurar; no se muestra
  al usuario).
- El archivo puede tener **cualquier número de preguntas**. Si tiene más de
  20, cada intento elige 20 al azar sin repetir. Si tiene 20 o menos, se usan
  todas.

### 2. Añadir una línea al manifest

Editar `data/quizzes-manifest.json` y añadir una entrada al array:

```json
{
  "id": "codigo-penal-titulo-i",
  "titulo": "Código Penal - Título I: De la infracción penal",
  "categoria": "codigo-penal",
  "archivo": "data/codigo-penal-titulo-i.json"
}
```

- `id`: identificador único del quiz (se usa también como clave del
  historial en localStorage; si cambias el `id` de un quiz existente, se
  pierde su historial guardado).
- `categoria`: agrupa los quizzes en el menú. Las categorías usadas hoy son
  `constitucion` y `codigo-penal`, con etiquetas bonitas ya mapeadas en
  `js/app.js` (`ETIQUETAS_CATEGORIA`). Si se usa una categoría nueva que no
  esté en ese mapa, se mostrará el propio valor tal cual como título del
  bloque (funciona igual, solo que sin la etiqueta "bonita").
- `archivo`: ruta relativa al JSON de preguntas.

Con eso, el quiz aparece automáticamente en el menú de inicio, agrupado
por categoría, con selección aleatoria de 20 preguntas, barajado de
opciones, contador de progreso, pantalla de resultados con revisión, botón
de rehacer e historial de intentos — sin ningún cambio adicional de código.

Cuando lleguen los PDFs de la Constitución y el Código Penal completos, el
quiz `[EJEMPLO] Constitución - Título Preliminar` puede eliminarse quitando
su línea del manifest (el archivo JSON puede quedarse o borrarse, es
indiferente).

## Cómo probarlo en local

Abrir `index.html` haciendo doble clic **puede no funcionar** en algunos
navegadores de escritorio: al cargarse por `file://`, Chrome y Safari
bloquean por seguridad las peticiones `fetch()` a los archivos JSON locales
(CORS de origen `file://`). Es una restricción del navegador, no del código.

Para probarlo en local de forma fiable, levanta un servidor estático
sencillo desde la carpeta del proyecto:

```bash
cd sara-quiz-forestal
python3 -m http.server 8000
```

y abre `http://localhost:8000` en el navegador. Una vez publicado en GitHub
Pages (servido por `https://`), este problema no existe y tampoco existirá
al añadirlo a la pantalla de inicio del iPhone.

## Cómo desplegarlo en GitHub Pages

1. Crear un repositorio en GitHub (puede ser el mismo `sara-quiz-forestal`) y
   subir el contenido de esta carpeta a la rama `main`:

   ```bash
   cd sara-quiz-forestal
   git init
   git add .
   git commit -m "Motor de quizzes para oposición Agente Forestal"
   git branch -M main
   git remote add origin <URL_DEL_REPO>
   git push -u origin main
   ```

2. En GitHub: **Settings → Pages → Build and deployment → Source**, elegir
   "Deploy from a branch", rama `main`, carpeta `/ (root)`. Guardar.

3. GitHub Pages publica la web en unos minutos en
   `https://<usuario>.github.io/<repo>/`. Esa es la URL que Sara abre en
   Safari del iPhone.

4. (Opcional) En Safari, con la página abierta: botón compartir →
   "Añadir a pantalla de inicio". Gracias al `manifest.json` y las meta
   etiquetas de `index.html`, se abre en modo app (sin barra de Safari) con
   icono y nombre propios.

No hace falta ningún paso de compilación ni instalar dependencias: GitHub
Pages sirve los archivos tal cual.

## Historial de intentos

Se guarda en `localStorage` del navegador, por quiz (clave
`saraquiz_intentos_<id-del-quiz>`), con fecha, aciertos, total y porcentaje
de los últimos 20 intentos. No hay backend ni cuentas de usuario: el
historial vive únicamente en ese navegador/dispositivo. Si Sara borra datos
de Safari o cambia de iPhone, el historial se pierde (es una limitación
conocida y aceptada del enfoque "sin backend").

## Mecánica del examen (resumen)

- 20 preguntas por intento (o todas, si el quiz tiene menos de 20).
- Orden de preguntas y orden de las 3 opciones de cada pregunta, aleatorio
  en cada intento.
- Una pregunta a la vez, con contador "Pregunta X/20" y barra de progreso.
- Sin feedback de acierto/error hasta terminar las 20 (simula examen real).
- Al terminar: nota (aciertos/total y %), listado de revisión de las 20
  preguntas (respuesta dada, respuesta correcta resaltada, explicación si
  la hay), botón "Rehacer quiz" (nueva tanda aleatoria) y "Volver al menú".
