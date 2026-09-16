/**
 * app.js
 * Controlador principal: carga el manifest, gestiona las vistas
 * (menú -> intro de quiz -> examen -> resultados) y conecta
 * QuizEngine + Storage con el DOM.
 *
 * Para añadir un quiz nuevo NO se toca este archivo: basta con crear
 * su JSON de preguntas en /data y añadir una línea al manifest
 * (/data/quizzes-manifest.json). Ver README.md.
 */
(() => {
  'use strict';

  const ETIQUETAS_CATEGORIA = {
    constitucion: 'Constitución Española',
    'codigo-penal': 'Código Penal'
  };

  const RETARDO_AVANCE_MS = 350;

  /** Estado en memoria de la sesión actual (no persistente). */
  const estado = {
    manifest: [],
    quizActual: null, // entrada del manifest
    poolActual: null, // preguntas originales del archivo del quiz
    intento: null // objeto devuelto por QuizEngine.buildAttempt
  };

  // --- Referencias DOM -----------------------------------------------

  const vistaMenu = document.getElementById('view-menu');
  const vistaIntro = document.getElementById('view-quiz-intro');
  const vistaPlay = document.getElementById('view-quiz-play');
  const vistaResultados = document.getElementById('view-results');

  const menuCategorias = document.getElementById('menu-categorias');
  const menuEstado = document.getElementById('menu-estado');

  const introTitulo = document.getElementById('intro-titulo');
  const introMeta = document.getElementById('intro-meta');
  const introHistorial = document.getElementById('intro-historial');
  const btnEmpezar = document.getElementById('btn-empezar');
  const btnVolverMenuIntro = document.getElementById('btn-volver-menu-intro');

  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const playPregunta = document.getElementById('play-pregunta');
  const playOpciones = document.getElementById('play-opciones');

  const resultadoNota = document.getElementById('resultado-nota');
  const resultadoHistorial = document.getElementById('resultado-historial');
  const revisionLista = document.getElementById('revision-lista');
  const btnRehacer = document.getElementById('btn-rehacer');
  const btnVolverMenuResultados = document.getElementById('btn-volver-menu-resultados');

  const btnBorrarHistorial = document.getElementById('btn-borrar-historial');
  const modalBorrar = document.getElementById('modal-borrar');
  const btnModalCancelar = document.getElementById('btn-modal-cancelar');
  const btnModalConfirmar = document.getElementById('btn-modal-confirmar');
  const toast = document.getElementById('toast');

  // --- Utilidades ------------------------------------------------------

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function mostrarVista(vista) {
    [vistaMenu, vistaIntro, vistaPlay, vistaResultados].forEach((v) => {
      v.hidden = v !== vista;
    });
    window.scrollTo(0, 0);
  }

  function formatearFecha(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return iso;
    }
  }

  function renderHistorial(contenedor, quizId) {
    const historial = Storage.getHistory(quizId);
    if (historial.length === 0) {
      contenedor.innerHTML = '<p class="historial-vacio">Todavía no hay intentos guardados de este quiz.</p>';
      return;
    }
    const items = historial
      .map((h) => {
        return `<li class="historial-item">
          <span class="historial-fecha">${escapeHtml(formatearFecha(h.fecha))}</span>
          <span class="historial-nota">${h.aciertos}/${h.total} (${h.porcentaje}%)</span>
        </li>`;
      })
      .join('');
    contenedor.innerHTML = `
      <h3 class="historial-titulo">Tus últimos intentos</h3>
      <ul class="historial-lista">${items}</ul>
    `;
  }

  // --- Carga de datos ----------------------------------------------------

  async function cargarManifest() {
    const resp = await fetch('data/quizzes-manifest.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('No se pudo cargar el manifest (' + resp.status + ')');
    return resp.json();
  }

  async function cargarPoolQuiz(entradaManifest) {
    const resp = await fetch(entradaManifest.archivo, { cache: 'no-store' });
    if (!resp.ok) throw new Error('No se pudo cargar el quiz ' + entradaManifest.id);
    return resp.json();
  }

  // --- Vista: Menú ---------------------------------------------------------

  function agruparPorCategoria(manifest) {
    const grupos = {};
    manifest.forEach((entrada) => {
      const cat = entrada.categoria || 'otros';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(entrada);
    });
    return grupos;
  }

  function renderMenu() {
    if (estado.manifest.length === 0) {
      menuCategorias.innerHTML = '';
      menuEstado.textContent = 'Todavía no hay ningún examen disponible.';
      return;
    }
    menuEstado.textContent = '';
    const grupos = agruparPorCategoria(estado.manifest);

    menuCategorias.innerHTML = Object.keys(grupos)
      .map((cat) => {
        const etiqueta = ETIQUETAS_CATEGORIA[cat] || cat;
        const tarjetas = grupos[cat]
          .map((quiz) => {
            const historial = Storage.getHistory(quiz.id);
            const ultimo = historial[0];
            const resumen = ultimo
              ? `Último intento: ${ultimo.aciertos}/${ultimo.total} (${ultimo.porcentaje}%)`
              : 'Todavía sin intentos';
            return `
              <button class="tarjeta-quiz" data-quiz-id="${escapeHtml(quiz.id)}">
                <span class="tarjeta-quiz-titulo">${escapeHtml(quiz.titulo)}</span>
                <span class="tarjeta-quiz-resumen">${escapeHtml(resumen)}</span>
              </button>
            `;
          })
          .join('');
        return `
          <section class="categoria-bloque">
            <h2 class="categoria-titulo">${escapeHtml(etiqueta)}</h2>
            <div class="categoria-tarjetas">${tarjetas}</div>
          </section>
        `;
      })
      .join('');

    menuCategorias.querySelectorAll('.tarjeta-quiz').forEach((btn) => {
      btn.addEventListener('click', () => abrirIntroQuiz(btn.dataset.quizId));
    });
  }

  // --- Vista: Intro del quiz --------------------------------------------

  function abrirIntroQuiz(quizId) {
    const entrada = estado.manifest.find((q) => q.id === quizId);
    if (!entrada) return;
    estado.quizActual = entrada;
    estado.poolActual = null;
    estado.intento = null;

    introTitulo.textContent = entrada.titulo;
    introMeta.textContent = 'Cargando preguntas…';
    introHistorial.innerHTML = '';
    btnEmpezar.disabled = true;
    mostrarVista(vistaIntro);

    cargarPoolQuiz(entrada)
      .then((pool) => {
        estado.poolActual = pool;
        const nPreguntas = Math.min(QuizEngine.MAX_PREGUNTAS_POR_INTENTO, pool.length);
        introMeta.textContent = `${nPreguntas} preguntas · opción múltiple · sin corrección hasta el final`;
        renderHistorial(introHistorial, entrada.id);
        btnEmpezar.disabled = false;
      })
      .catch((err) => {
        console.error(err);
        introMeta.textContent = 'Error al cargar este examen. Comprueba el archivo JSON del quiz.';
      });
  }

  function empezarIntento() {
    if (!estado.poolActual) return;
    estado.intento = QuizEngine.buildAttempt(estado.poolActual);
    mostrarVista(vistaPlay);
    renderPreguntaActual();
  }

  // --- Vista: Examen en curso --------------------------------------------

  function renderPreguntaActual() {
    const intento = estado.intento;
    const pregunta = intento.preguntas[intento.actual];
    const total = intento.preguntas.length;
    const numero = intento.actual + 1;

    progressText.textContent = `Pregunta ${numero}/${total}`;
    progressFill.style.width = (numero / total) * 100 + '%';
    playPregunta.textContent = pregunta.pregunta;

    playOpciones.innerHTML = pregunta.opciones
      .map((op, idx) => `<button class="opcion-btn" data-idx="${idx}">${escapeHtml(op.texto)}</button>`)
      .join('');

    playOpciones.querySelectorAll('.opcion-btn').forEach((btn) => {
      btn.addEventListener('click', () => seleccionarOpcion(Number(btn.dataset.idx)));
    });
  }

  function seleccionarOpcion(idx) {
    // Evita doble tap: deshabilita todas las opciones tras la primera elección
    playOpciones.querySelectorAll('.opcion-btn').forEach((btn) => {
      btn.disabled = true;
    });
    const btnElegido = playOpciones.querySelector(`.opcion-btn[data-idx="${idx}"]`);
    if (btnElegido) btnElegido.classList.add('opcion-elegida');

    QuizEngine.responder(estado.intento, idx);

    const esUltima = QuizEngine.esUltimaPregunta(estado.intento);

    setTimeout(() => {
      if (esUltima) {
        finalizarIntento();
      } else {
        QuizEngine.avanzar(estado.intento);
        renderPreguntaActual();
      }
    }, RETARDO_AVANCE_MS);
  }

  // --- Vista: Resultados ---------------------------------------------------

  function finalizarIntento() {
    const resultado = QuizEngine.calcularResultado(estado.intento);
    const registro = {
      fecha: new Date().toISOString(),
      aciertos: resultado.aciertos,
      total: resultado.total,
      porcentaje: resultado.porcentaje
    };
    Storage.addAttempt(estado.quizActual.id, registro);
    renderResultados(resultado);
    mostrarVista(vistaResultados);
  }

  function renderResultados(resultado) {
    resultadoNota.innerHTML = `
      <span class="nota-numero">${resultado.aciertos}/${resultado.total}</span>
      <span class="nota-porcentaje">${resultado.porcentaje}%</span>
    `;

    renderHistorial(resultadoHistorial, estado.quizActual.id);

    revisionLista.innerHTML = estado.intento.preguntas
      .map((p, i) => {
        const opciones = p.opciones
          .map((op, idx) => {
            let clases = 'revision-opcion';
            if (op.esCorrecta) clases += ' revision-correcta';
            if (idx === p.respuestaUsuario && !op.esCorrecta) clases += ' revision-incorrecta-elegida';
            if (idx === p.respuestaUsuario && op.esCorrecta) clases += ' revision-acertada';
            return `<li class="${clases}">${escapeHtml(op.texto)}</li>`;
          })
          .join('');
        const explicacion = p.explicacion
          ? `<p class="revision-explicacion">${escapeHtml(p.explicacion)}</p>`
          : '';
        return `
          <article class="revision-pregunta">
            <p class="revision-enunciado">${i + 1}. ${escapeHtml(p.pregunta)}</p>
            <ul class="revision-opciones">${opciones}</ul>
            ${explicacion}
          </article>
        `;
      })
      .join('');
  }

  // --- Borrado de todo el historial (con aviso de confirmación) ----------

  let toastTimeoutId = null;

  function mostrarToast(mensaje) {
    toast.textContent = mensaje;
    toast.hidden = false;
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  function abrirModalBorrar() {
    modalBorrar.hidden = false;
  }

  function cerrarModalBorrar() {
    modalBorrar.hidden = true;
  }

  function confirmarBorradoHistorial() {
    Storage.clearAllHistory();
    cerrarModalBorrar();
    renderMenu();
    mostrarToast('Historial borrado');
  }

  btnBorrarHistorial.addEventListener('click', abrirModalBorrar);
  btnModalCancelar.addEventListener('click', cerrarModalBorrar);
  btnModalConfirmar.addEventListener('click', confirmarBorradoHistorial);
  modalBorrar.addEventListener('click', (ev) => {
    if (ev.target === modalBorrar) cerrarModalBorrar();
  });

  // --- Navegación / eventos globales --------------------------------------

  btnEmpezar.addEventListener('click', empezarIntento);
  btnVolverMenuIntro.addEventListener('click', () => mostrarVista(vistaMenu));
  btnVolverMenuResultados.addEventListener('click', () => {
    renderMenu();
    mostrarVista(vistaMenu);
  });
  btnRehacer.addEventListener('click', () => {
    // Mismo quiz, nueva selección + nuevo orden de preguntas y opciones
    empezarIntento();
  });

  // --- Arranque ------------------------------------------------------------

  async function init() {
    try {
      estado.manifest = await cargarManifest();
      renderMenu();
    } catch (err) {
      console.error(err);
      menuEstado.textContent =
        'No se pudo cargar el listado de exámenes. Si has abierto el archivo directamente ' +
        '(file://) es probable que el navegador bloquee la lectura del JSON: sirve la carpeta ' +
        'con un servidor local o publícala en GitHub Pages.';
    }
  }

  init();
})();
