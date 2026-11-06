// =====================================================================
//  «Xi», el asistente del congreso: chat flotante con un robot animado.
//  Respuestas cortas y visuales; se puede usar en cualquier página.
//  Usa BotCerebro (js/bot-cerebro.js) para entender las preguntas.
// =====================================================================
const Bot = (() => {
  const SUGERENCIAS = ['¿Qué hay ahora?', '¿Qué talleres hay?', '¿Dónde es el Salón de los Volcanes?', '¿Qué hay el miércoles?', '¿Quién es Freddy Paz?'];
  const MAX = 3;

  // Robot completo (para el saludo): cabeza + cuerpo + brazo que saluda
  const robotCompleto = () => `
    <svg class="robot robot--completo" viewBox="0 0 120 128" aria-hidden="true" focusable="false">
      <ellipse class="robot__sombra" cx="60" cy="121" rx="28" ry="4.5"/>
      <g class="robot__flota">
        <rect class="robot__pierna" x="46" y="98" width="10" height="14" rx="5"/>
        <rect class="robot__pierna" x="64" y="98" width="10" height="14" rx="5"/>
        <rect class="robot__brazo-izq" x="24" y="68" width="11" height="26" rx="5.5" transform="rotate(14 30 70)"/>
        <g class="robot__brazo"><rect x="85" y="42" width="11" height="28" rx="5.5"/><circle cx="90.5" cy="41" r="7"/></g>
        <rect class="robot__cuerpo" x="36" y="62" width="48" height="40" rx="14"/>
        <rect class="robot__pecho" x="47" y="71" width="26" height="14" rx="6"/>
        <g class="robot__luces"><circle cx="54" cy="78" r="2.4"/><circle cx="60" cy="78" r="2.4"/><circle cx="66" cy="78" r="2.4"/></g>
        <g transform="translate(28 0)">${cabeza()}</g>
      </g>
    </svg>`;

  // Cabeza sola (botón y avatar); la misma que usa comun.js
  function cabeza() {
    return `
      <line class="robot__palo" x1="32" y1="6" x2="32" y2="15"/>
      <circle class="robot__antena" cx="32" cy="6" r="4.2"/>
      <rect class="robot__oreja" x="4" y="28" width="7" height="13" rx="3.5"/>
      <rect class="robot__oreja" x="53" y="28" width="7" height="13" rx="3.5"/>
      <rect class="robot__cabeza" x="9" y="14" width="46" height="40" rx="15"/>
      <rect class="robot__pantalla" x="15" y="22" width="34" height="23" rx="10"/>
      <g class="robot__ojos"><ellipse cx="26" cy="32" rx="3.4" ry="4.3"/><ellipse cx="38" cy="32" rx="3.4" ry="4.3"/></g>
      <path class="robot__boca" d="M27.5 38.5 q4.5 3.6 9 0"/>`;
  }
  const robotCabeza = (clase = '') => `<svg class="robot ${clase}" viewBox="0 0 64 60" aria-hidden="true" focusable="false">${cabeza()}</svg>`;

  // ---------- Piezas de respuesta ----------
  function fila(c) {
    const sala = salaDe(c.sala), ar = areaDe(c.area);
    return `<li><a class="bot__item" href="agenda.html?dia=${c.dia}&charla=${c.id}" style="--c:${ar.color}">
      <span class="bot__hora"><b>${c.ini}</b><small>${diaCorto(c.dia).split(' ')[0]}</small></span>
      <span class="bot__info"><strong>${escapar(c.titulo)}</strong><small>${escapar(sala.nombre)}</small></span>
      <i data-lucide="chevron-right"></i></a></li>`;
  }

  function htmlRespuesta(r) {
    let h = `<p>${escapar(r.txt.replace(/:\s*$/, '.')).replace(/\n/g, '<br>')}</p>`;
    const cs = r.cards || [];
    if (cs.length) {
      h += `<ul class="bot__items">${cs.slice(0, MAX).map(fila).join('')}</ul>`;
      if (cs.length > MAX) {
        const mismoDia = cs.every((c) => c.dia === cs[0].dia);
        h += `<a class="bot__mas" href="agenda.html${mismoDia ? `?dia=${cs[0].dia}` : ''}">Ver las ${cs.length} en la agenda <i data-lucide="arrow-right"></i></a>`;
      }
    }
    const acc = [];
    if (r.ruta) acc.push(`<a class="bot__chip bot__chip--accion" href="como-llegar.html?sala=${r.ruta}" data-ruta="${r.ruta}"><i data-lucide="navigation"></i>Cómo llegar</a>`);
    const hayMas = cs.length > MAX;
    for (const [href, txt] of (r.links || []).filter(([h]) => !(hayMas && h.startsWith('agenda.html')))) acc.push(`<a class="bot__chip bot__chip--accion" href="${href}">${escapar(txt)}</a>`);
    if (acc.length) h += `<div class="bot__acc">${acc.join('')}</div>`;
    return h;
  }

  // ---------- Componente de chat (flotante o en página) ----------
  function montar(cont, { flotante = false } = {}) {
    cont.innerHTML = `
      <div class="bot${flotante ? ' bot--flotante' : ' bot--pagina'}" ${flotante ? 'role="dialog" aria-modal="false" aria-labelledby="botNombre"' : ''}>
        <header class="bot__cab">
          <span class="bot__avatar">${robotCabeza()}</span>
          <div class="bot__id"><strong id="botNombre">Xi</strong><small><span class="bot__punto" aria-hidden="true"></span>Asistente del congreso</small></div>
          ${flotante ? '<a class="bot__icono" href="asistente.html" aria-label="Abrir en pantalla completa"><i data-lucide="maximize-2"></i></a><button class="bot__icono" type="button" data-bot-cerrar aria-label="Cerrar el asistente"><i data-lucide="x"></i></button>' : ''}
        </header>
        <div class="bot__log" role="log" aria-live="polite">
          <div class="bot__hola">
            ${robotCompleto()}
            <p class="bot__saludo">¡Hola! Soy <strong>Xi</strong></p>
            <p class="bot__intro">Te ayudo con horarios, lugares y expositores del congreso.</p>
          </div>
        </div>
        <div class="bot__sug" aria-label="Preguntas sugeridas">${SUGERENCIAS.map((s) => `<button type="button" class="bot__chip" data-preg="${escapar(s)}">${escapar(s)}</button>`).join('')}</div>
        <form class="bot__form" autocomplete="off">
          <label class="sr-only" for="botInput">Escribe tu pregunta</label>
          <input id="botInput" type="text" placeholder="Escribe tu pregunta…" enterkeyhint="send" maxlength="200">
          <button class="bot__enviar" type="submit" aria-label="Enviar"><i data-lucide="arrow-up"></i></button>
        </form>
      </div>`;
    iconos();
    const raiz = $('.bot', cont), log = $('.bot__log', raiz), sug = $('.bot__sug', raiz), input = $('#botInput', raiz);

    const agregar = (quien, html) => {
      const d = document.createElement('div');
      d.className = `bot__msg bot__msg--${quien}`;
      d.innerHTML = quien === 'xi' ? `<span class="bot__mini">${robotCabeza()}</span><div class="bot__burbuja">${html}</div>` : `<div class="bot__burbuja">${html}</div>`;
      log.append(d);
      iconos();
      log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
      return d;
    };

    function preguntar(texto) {
      texto = texto.trim();
      if (!texto) return;
      $('.bot__hola', log)?.classList.add('is-chico');
      agregar('yo', `<p>${escapar(texto)}</p>`);
      sug.hidden = true;
      const pensando = agregar('xi', '<span class="bot__puntos" aria-label="Xi está escribiendo"><i></i><i></i><i></i></span>');
      setTimeout(() => {
        pensando.remove();
        const r = BotCerebro.responder(texto);
        agregar('xi', htmlRespuesta(r));
        if (r.sug) sug.hidden = false;
      }, reduceMotion ? 0 : 550);
    }

    $('.bot__form', raiz).addEventListener('submit', (e) => { e.preventDefault(); preguntar(input.value); input.value = ''; });
    sug.addEventListener('click', (e) => { const b = e.target.closest('[data-preg]'); if (b) preguntar(b.dataset.preg); });
    return { raiz, preguntar, input };
  }

  // ---------- Panel flotante ----------
  let capa, ctrl, origen;
  function abrir(pregunta = '') {
    origen = document.activeElement;
    if (!capa) {
      capa = document.createElement('div');
      capa.className = 'bot-capa';
      capa.innerHTML = '<div class="bot-fondo" data-bot-cerrar></div><div class="bot-hueco"></div>';
      document.body.append(capa);
      ctrl = montar($('.bot-hueco', capa), { flotante: true });
      capa.addEventListener('click', (e) => { if (e.target.closest('[data-bot-cerrar]')) cerrar(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && capa.classList.contains('is-abierto') && !document.querySelector('dialog[open]')) cerrar(); });
    }
    capa.classList.add('is-abierto');
    document.documentElement.classList.add('bot-activo');
    $$('[data-bot]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    setTimeout(() => ctrl.input.focus({ preventScroll: true }), 50);
    if (pregunta) ctrl.preguntar(pregunta);
  }
  function cerrar() {
    capa?.classList.remove('is-abierto');
    document.documentElement.classList.remove('bot-activo');
    $$('[data-bot]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    origen?.focus?.();
  }

  return { abrir, cerrar, montar, robotCabeza };
})();
