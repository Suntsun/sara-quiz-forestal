/**
 * storage.js
 * Persistencia del historial de intentos en localStorage.
 * No requiere backend ni cuentas de usuario.
 */
const Storage = (() => {
  const PREFIX = 'saraquiz_intentos_';
  const MAX_INTENTOS_GUARDADOS = 20;

  function claveDe(quizId) {
    return PREFIX + quizId;
  }

  /**
   * Devuelve el historial de intentos de un quiz, más reciente primero.
   * @param {string} quizId
   * @returns {Array<{fecha: string, aciertos: number, total: number, porcentaje: number}>}
   */
  function getHistory(quizId) {
    try {
      const raw = localStorage.getItem(claveDe(quizId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('No se pudo leer el historial de', quizId, err);
      return [];
    }
  }

  /**
   * Añade un intento al historial de un quiz (al principio, más reciente primero).
   * @param {string} quizId
   * @param {{fecha: string, aciertos: number, total: number, porcentaje: number}} intento
   */
  function addAttempt(quizId, intento) {
    const historial = getHistory(quizId);
    historial.unshift(intento);
    const recortado = historial.slice(0, MAX_INTENTOS_GUARDADOS);
    try {
      localStorage.setItem(claveDe(quizId), JSON.stringify(recortado));
    } catch (err) {
      console.error('No se pudo guardar el intento de', quizId, err);
    }
  }

  /**
   * Borra el historial de TODOS los quizzes (todas las claves con el prefijo
   * de este módulo). Pensado para el botón "Borrar historial" del menú
   * principal, que antes de llamar a esta función pide confirmación al
   * usuario mediante un aviso en app.js.
   */
  function clearAllHistory() {
    try {
      const claves = [];
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (clave && clave.indexOf(PREFIX) === 0) claves.push(clave);
      }
      claves.forEach((clave) => localStorage.removeItem(clave));
    } catch (err) {
      console.error('No se pudo borrar el historial completo', err);
    }
  }

  return { getHistory, addAttempt, clearAllHistory };
})();
