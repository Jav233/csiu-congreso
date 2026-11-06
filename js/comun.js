// =====================================================================
//  Código común a todas las páginas
//  - Encabezado y barra inferior iguales en todo el sitio (coherencia)
//  - Avisos con «Deshacer», almacenamiento seguro, Mi agenda, utilidades
// =====================================================================
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function iconos() { if (window.lucide) lucide.createIcons(); }

function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ----- Navegación: una sola definición para todo el sitio -----
const SECCIONES = [
  { id: 'inicio',      href: 'index.html',        txt: 'Inicio',      icono: 'house' },
  { id: 'agenda',      href: 'agenda.html',       txt: 'Agenda',      icono: 'calendar-days' },
  { id: 'mias',        href: 'agenda.html?mias=1', txt: 'Mi agenda',  icono: 'star', soloMovil: true },
  { id: 'expositores', href: 'expositores.html',  txt: 'Expositores', icono: 'users' },
  { id: 'llegar',      href: 'como-llegar.html',  txt: 'Cómo llegar', corto: 'Llegar', icono: 'navigation' },
];

// Enlaces a funciones que aún no existen
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-soon]');
  if (!a) return;
  e.preventDefault();
  avisar(`«${a.dataset.soon}» estará disponible pronto`);
});

// ----- Asistente «Xi»: botón en todas las páginas; el chat se carga al abrirlo -----
const ROBOT_FAB = `<svg class="robot" viewBox="0 0 64 60" aria-hidden="true" focusable="false">
  <line class="robot__palo" x1="32" y1="6" x2="32" y2="15"/><circle class="robot__antena" cx="32" cy="6" r="4.2"/>
  <rect class="robot__oreja" x="4" y="28" width="7" height="13" rx="3.5"/><rect class="robot__oreja" x="53" y="28" width="7" height="13" rx="3.5"/>
  <rect class="robot__cabeza" x="9" y="14" width="46" height="40" rx="15"/><rect class="robot__pantalla" x="15" y="22" width="34" height="23" rx="10"/>
  <g class="robot__ojos"><ellipse cx="26" cy="32" rx="3.4" ry="4.3"/><ellipse cx="38" cy="32" rx="3.4" ry="4.3"/></g>
  <path class="robot__boca" d="M27.5 38.5 q4.5 3.6 9 0"/></svg>`;

// Versión publicada (la pone actualizar-version.js en el HTML); evita que el
// navegador use copias viejas de lo que se carga después (robot y sus estilos)
const VERSION = (document.currentScript?.src.match(/[?&]v=([\w-]+)/) || [])[1] || '';
const conVersion = (ruta) => (VERSION ? `${ruta}?v=${VERSION}` : ruta);

function cargarScript(src) {
  return new Promise((ok, mal) => {
    if (document.querySelector(`script[src^="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.src = conVersion(src); s.onload = ok; s.onerror = mal;
    document.body.append(s);
  });
}
async function abrirBot(pregunta = '') {
  try {
    if (!window.BotCerebro) await cargarScript('js/bot-cerebro.js');
    if (!window.Bot) await cargarScript('js/bot.js');
    Bot.abrir(pregunta);
  } catch {
    location.href = 'asistente.html'; // si algo falla, la página del asistente sigue disponible
  }
}
function montarBotonBot() {
  if (!document.querySelector('link[href^="css/bot.css"]')) document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${conVersion('css/bot.css')}">`);
  if (document.body.dataset.pagina === 'asistente') return;
  document.body.insertAdjacentHTML('beforeend',
    `<button class="bot-fab" type="button" data-bot aria-haspopup="dialog" aria-expanded="false" aria-label="Pregúntale a Xi, el asistente del congreso">
      <span class="bot-fab__robot">${ROBOT_FAB}</span><span class="bot-fab__txt">Pregúntame</span></button>`);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-bot]');
  if (!b) return;
  e.preventDefault();
  abrirBot(b.dataset.bot || '');
});

// ----- Tema: claro por defecto; oscuro solo si el usuario lo elige -----
const Tema = {
  clave: 'csiu.tema',
  actual() { try { return localStorage.getItem(this.clave) === 'oscuro' ? 'oscuro' : 'claro'; } catch { return 'claro'; } },
  aplicar(t) {
    document.documentElement.dataset.tema = t;
    const b = document.querySelector('[data-tema-btn]');
    if (b) {
      const oscuro = t === 'oscuro';
      b.setAttribute('aria-pressed', String(oscuro));
      b.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      b.title = oscuro ? 'Modo claro' : 'Modo oscuro';
      b.innerHTML = `<i data-lucide="${oscuro ? 'sun' : 'moon'}"></i>`;
      iconos();
    }
  },
  alternar() {
    const t = this.actual() === 'oscuro' ? 'claro' : 'oscuro';
    try { localStorage.setItem(this.clave, t); } catch { /* sin almacenamiento */ }
    this.aplicar(t);
    avisar(t === 'oscuro' ? 'Modo oscuro activado' : 'Modo claro activado');
  },
};
if (document.body.dataset.layout !== 'propio') document.documentElement.dataset.tema = Tema.actual();
document.addEventListener('click', (e) => { if (e.target.closest('[data-tema-btn]')) Tema.alternar(); });

function montarLayout() {
  const pagina = document.body.dataset.pagina;
  montarBotonBot();
  if (document.body.dataset.layout === 'propio') return; // la portada tiene su propio diseño
  document.body.insertAdjacentHTML('afterbegin', `
    <a class="skip" href="#main">Saltar al contenido</a>
    <header class="hdr">
      <div class="wrap hdr__in">
        <a class="marca" href="index.html" aria-label="XI CSIU, ir al inicio">
          <span class="marca__xi" aria-hidden="true">XI</span>
          <span class="marca__txt"><strong>CSIU</strong><small>PUCE Ambato · 17–19 nov</small></span>
        </a>
        <nav class="nav" aria-label="Principal">
          ${SECCIONES.filter((s) => !s.soloMovil).map((s) => `<a href="${s.href}" data-sec="${s.id}">${s.txt}</a>`).join('')}
        </nav>
        <button class="tema-btn" type="button" data-tema-btn aria-pressed="false" aria-label="Cambiar a modo oscuro" title="Modo oscuro"><i data-lucide="moon"></i></button>
        <a class="btn btn--secondary btn--sm" href="ingresar.html" data-sec="ingresar" aria-label="Ingresar"><i data-lucide="log-in"></i><span class="btn-ingresar-txt">Ingresar</span></a>
      </div>
    </header>`);
  Tema.aplicar(Tema.actual());
  document.body.insertAdjacentHTML('beforeend', `
    <footer class="pie wrap">
      <div class="pie__fila">
        <p class="pie__ev"><strong>XI CSIU</strong> · PUCE Ambato · 17–19 nov 2026</p>
        <div class="pie__neuralia">
          <span class="pie__n-logo"><img src="img/logo-neuralia-icono.jpg" alt="Logo Neuralia" loading="lazy" decoding="async"></span>
          <div class="pie__n-txt">
            <span class="pie__n-linea">Plataforma por <strong class="pie__n-marca">NEURAL<span>IA</span></strong></span>
            <small class="pie__n-eslogan">«La inteligencia detrás de cada congreso»</small>
          </div>
        </div>
      </div>
    </footer>
    <nav class="tabbar" aria-label="Secciones">
      ${SECCIONES.map((s) => `<a href="${s.href}" data-sec="${s.id}"><i data-lucide="${s.icono}"></i><span>${s.corto || s.txt}</span></a>`).join('')}
    </nav>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  marcarSeccion(pagina);

  const hdr = $('.hdr');
  const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 4);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function marcarSeccion(id) {
  $$('[data-sec]').forEach((a) => {
    const activo = a.dataset.sec === id || (id === 'mias' && a.dataset.sec === 'agenda' && a.closest('.nav'));
    activo ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
}

// ----- Avisos (con acción opcional, p. ej. «Deshacer») -----
let _toastTimer;
function avisar(msg, { accion, alHacer, ms = 3200 } = {}) {
  const t = $('#toast');
  if (!t) return;
  t.innerHTML = `<span>${escapar(msg)}</span>${accion ? `<button type="button">${escapar(accion)}</button>` : ''}`;
  if (accion) $('button', t).onclick = () => { t.classList.remove('is-on'); alHacer?.(); };
  t.classList.add('is-on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
}

// ----- Almacenamiento local seguro -----
const almacen = {
  get(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

// ----- Mi agenda (charlas guardadas) -----
const MiAgenda = {
  clave: 'csiu.miAgenda',
  ids() { return new Set(almacen.get(this.clave, [])); },
  tiene(id) { return this.ids().has(id); },
  alternar(id) {
    const s = this.ids();
    const agregado = !s.has(id);
    agregado ? s.add(id) : s.delete(id);
    almacen.set(this.clave, [...s]);
    return agregado;
  },
};

// ----- Ayudas sobre los datos -----
const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const salaDe = (id) => CONGRESO.salas.find((s) => s.id === id);
const expositorDe = (id) => CONGRESO.expositores.find((x) => x.id === id);
const areaDe = (id) => CONGRESO.areas[id] || CONGRESO.areas.general;
const tipoDe = (id) => CONGRESO.tipos[id];
const fechaDia = (n) => { const [y, m, d] = CONGRESO.evento.dias[n - 1].fecha.split('-').map(Number); return new Date(y, m - 1, d); };
const instante = (charla, hora) => new Date(`${CONGRESO.evento.dias[charla.dia - 1].fecha}T${hora}:00${CONGRESO.evento.zonaHoraria}`);
const seCruzan = (a, b) => a.id !== b.id && a.dia === b.dia && aMin(a.ini) < aMin(b.fin) && aMin(b.ini) < aMin(a.fin);
const esReceso = (c) => c.tipo === 'receso';
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDiaCorto = new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric' });
const diaCorto = (n) => mayus(fmtDiaCorto.format(fechaDia(n)).replace('.', ''));

function iniciales(nombre) {
  const limpio = nombre.replace(/\b(Mg|Dra|Dr|PhD|Ing|Ab|Lic)\.?(?=\s|,|$)/g, '').replace(/,.*$/, '').trim();
  const p = limpio.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 2 ? p[2][0] : p[1]?.[0] || '')).toUpperCase();
}

function textoLugar(sala) {
  if (!sala) return 'Todas las salas';
  return sala.piso ? `${sala.nombre}, ${sala.piso}` : sala.nombre;
}

function rangoEvento() {
  const reales = CONGRESO.charlas;
  const primerDia = Math.min(...reales.map((c) => c.dia));
  const ultimoDia = Math.max(...reales.map((c) => c.dia));
  const ini = reales.filter((c) => c.dia === primerDia).sort((a, b) => aMin(a.ini) - aMin(b.ini))[0];
  const fin = reales.filter((c) => c.dia === ultimoDia).sort((a, b) => aMin(b.fin) - aMin(a.fin))[0];
  return { inicio: instante(ini, ini.ini), fin: instante(fin, fin.fin) };
}

// ----- Cambios del organizador (se guardan en este navegador) -----
const DatosEditables = {
  clave: 'csiu.datos',
  cargar() {
    const d = almacen.get(this.clave, null);
    if (d?.charlas && d?.expositores) { CONGRESO.charlas = d.charlas; CONGRESO.expositores = d.expositores; }
  },
  guardar() { almacen.set(this.clave, { charlas: CONGRESO.charlas, expositores: CONGRESO.expositores, fecha: Date.now() }); },
  restablecer() { try { localStorage.removeItem(this.clave); } catch { /* sin almacenamiento */ } },
  editado() { return !!almacen.get(this.clave, null); },
};

// ----- Entradas de asistentes y check-in -----
const Entradas = {
  clave: 'csiu.entradas',     // todas las entradas emitidas en este navegador
  claveMia: 'csiu.miEntrada', // la entrada de quien usa este navegador
  todas() { return almacen.get(this.clave, []); },
  mia() { return almacen.get(this.claveMia, null); },
  crear(nombre, institucion) {
    const codigo = 'CSIU-' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    const e = { codigo, nombre, institucion, creada: Date.now(), checkin: null };
    almacen.set(this.clave, [...this.todas(), e]);
    almacen.set(this.claveMia, codigo);
    return e;
  },
  buscar(codigo) { return this.todas().find((e) => e.codigo === String(codigo).trim().toUpperCase()); },
  marcar(codigo) {
    const lista = this.todas();
    const e = lista.find((x) => x.codigo === String(codigo).trim().toUpperCase());
    if (!e) return null;
    if (!e.checkin) e.checkin = Date.now();
    almacen.set(this.clave, lista);
    return e;
  },
};

// ----- Sesiones de demostración (expositor / organizador) -----
const Sesion = {
  get(rol) { try { return JSON.parse(sessionStorage.getItem('csiu.sesion.' + rol)); } catch { return null; } },
  set(rol, v) { try { sessionStorage.setItem('csiu.sesion.' + rol, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  salir(rol) { try { sessionStorage.removeItem('csiu.sesion.' + rol); } catch { /* sin almacenamiento */ } },
};
const CODIGO_ORGANIZADOR = 'ORG-2026'; // cuenta de prueba del prototipo

// Texto sin tildes ni mayúsculas, para búsquedas
const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

DatosEditables.cargar();
montarLayout();
