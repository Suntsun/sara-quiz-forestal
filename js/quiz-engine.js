/**
 * quiz-engine.js
 * Motor puro del quiz: selección aleatoria de preguntas, barajado de
 * opciones, avance y cálculo de resultados. No conoce el DOM.
 *
 * Formato de entrada esperado (pool de preguntas de un quiz):
 * [{ id, pregunta, opciones: [a, b, c], correcta: 0|1|2, explicacion? }]
 */
const QuizEngine = (() => {
  const MAX_PREGUNTAS_POR_INTENTO = 20;

  /** Fisher-Yates shuffle, no muta el array original. */
  function shuffle(array) {
    const copia = array.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /**
   * Construye un intento nuevo a partir del pool completo de preguntas
   * de un quiz: selecciona hasta MAX_PREGUNTAS_POR_INTENTO al azar (o
   * todas si hay menos), baraja su orden y baraja las opciones de cada
   * una.
   * @param {Array} pool preguntas originales del archivo del quiz
   * @returns {{preguntas: Array, actual: number}}
   */
  function buildAttempt(pool) {
    if (!Array.isArray(pool) || pool.length === 0) {
      throw new Error('El quiz no tiene preguntas');
    }
    const cantidad = Math.min(MAX_PREGUNTAS_POR_INTENTO, pool.length);
    const seleccionadas = shuffle(pool).slice(0, cantidad);

    const preguntas = seleccionadas.map((q) => {
      const opcionesConFlag = q.opciones.map((texto, idx) => ({
        texto,
        esCorrecta: idx === q.correcta
      }));
      return {
        id: q.id,
        pregunta: q.pregunta,
        explicacion: q.explicacion || '',
        opciones: shuffle(opcionesConFlag),
        respuestaUsuario: null // índice dentro de "opciones" (ya barajadas)
      };
    });

    return { preguntas, actual: 0 };
  }

  /** Registra la opción elegida por el usuario en la pregunta actual. */
  function responder(attempt, indiceOpcion) {
    attempt.preguntas[attempt.actual].respuestaUsuario = indiceOpcion;
  }

  /** Avanza a la siguiente pregunta. Devuelve false si ya era la última. */
  function avanzar(attempt) {
    if (attempt.actual < attempt.preguntas.length - 1) {
      attempt.actual += 1;
      return true;
    }
    return false;
  }

  function esUltimaPregunta(attempt) {
    return attempt.actual === attempt.preguntas.length - 1;
  }

  /** Calcula aciertos/total/porcentaje del intento completo. */
  function calcularResultado(attempt) {
    let aciertos = 0;
    attempt.preguntas.forEach((p) => {
      const elegida = p.respuestaUsuario !== null ? p.opciones[p.respuestaUsuario] : null;
      if (elegida && elegida.esCorrecta) aciertos += 1;
    });
    const total = attempt.preguntas.length;
    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;
    return { aciertos, total, porcentaje };
  }

  return {
    MAX_PREGUNTAS_POR_INTENTO,
    buildAttempt,
    responder,
    avanzar,
    esUltimaPregunta,
    calcularResultado
  };
})();
