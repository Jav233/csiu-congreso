// =====================================================================
//  Panel del organizador
//  - Resumen con analítica (calculada de la agenda real + datos de demostración)
//  - Gestión de actividades y expositores (crear, editar, eliminar)
//  - Check-in de asistentes por código (o cámara, si el navegador lo permite)
// =====================================================================
const ev = CONGRESO.evento;
let tab = 'resumen';

// ---------- Acceso ----------
function entrar(codigo) {
  if (String(codigo).trim().toUpperCase() !== CODIGO_ORGANIZADOR) {
    const e = $('#errAcceso'); e.textContent = 'El código no es válido. Revisa que esté bien escrito.'; e.hidden = false;
    $('#codigoOrg').setAttribute('aria-invalid', 'true'); $('#codigoOrg').focus();
    return;
  }
  Sesion.set('organizador', { desde: Date.now() });
  mostrar();
}
$('#formAcceso').addEventListener('submit', (e) => { e.preventDefault(); entrar($('#codigoOrg').value); });
$('#btnPruebaOrg').addEventListener('click', () => { $('#codigoOrg').value = CODIGO_ORGANIZADOR; entrar(CODIGO_ORGANIZADOR); });
$('#btnSalir').addEventListener('click', () => { Sesion.salir('organizador'); detenerCamara(); mostrar(); avisar('Sesión cerrada'); });

function mostrar() {
  const dentro = !!Sesion.get('organizador');
  $('#acceso').hidden = dentro;
  $('#panel').hidden = !dentro;
  $('#btnSalir').hidden = !dentro;
  if (dentro) pintar();
  iconos();
}

// ---------- Pestañas ----------
$('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  pintar();
});
function pintar() {
  $$('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab));
  if (tab !== 'checkin') detenerCamara();
  ({ resumen: pintarResumen, actividades: pintarActividades, expositores: pintarExpositores, checkin: pintarCheckin })[tab]();
  iconos();
}

// ---------- Utilidades ----------
const reales = () => CONGRESO.charlas.filter((c) => !esReceso(c));
// Número estable "aleatorio" para datos de demostración
const semilla = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
const interesDemo = (c) => Math.round(25 + semilla(c.id) * 95) + (MiAgenda.tiene(c.id) ? 1 : 0);
const barras = (filas, max, unidad = '') => `<ul class="barras">${filas.map(([etq, v, color]) => `
  <li><span class="barras__etq">${etq}</span><span class="barras__pista"><span class="barras__val" style="width:${Math.max(2, (v / max) * 100)}%;${color ? `--c:${color}` : ''}"></span></span><span class="barras__num">${v}${unidad}</span></li>`).join('')}</ul>`;

// ---------- Resumen / analítica ----------
function pintarResumen() {
  const acts = reales();
  const personas = CONGRESO.expositores.filter((x) => !x.grupo);
  const entradas = Entradas.todas();
  const conIngreso = entradas.filter((e) => e.checkin).length;

  // Horas de uso por lugar (dato real)
  const horas = CONGRESO.salas.map((s) => [s.nombre, +(acts.filter((c) => c.sala === s.id).reduce((t, c) => t + aMin(c.fin) - aMin(c.ini), 0) / 60).toFixed(1)]);
  const maxH = Math.max(...horas.map((h) => h[1]));
  // Actividades por tema (dato real)
  const temas = Object.entries(acts.reduce((o, c) => ((o[c.area] = (o[c.area] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]);
  // Carga por franja horaria (dato real): actividades en curso por hora, sumando los 3 días
  const franjas = [];
  for (let h = 9; h < 18; h++) franjas.push([h, acts.filter((c) => aMin(c.ini) < (h + 1) * 60 && aMin(c.fin) > h * 60).length]);
  const maxF = Math.max(...franjas.map((f) => f[1]));
  const pico = franjas.filter((f) => f[1] === maxF).map((f) => `${f[0]}:00`).join(' y las ');
  // Interés (demostración)
  const interes = acts.map((c) => [c, interesDemo(c)]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxI = interes[0]?.[1] || 1;
  const salaTop = horas.slice().sort((a, b) => b[1] - a[1])[0];
  const totalH = horas.reduce((t, h) => t + h[1], 0);

  $('[data-panel="resumen"]').innerHTML = `
    <ul class="kpis">
      <li class="card"><span>Actividades</span><strong>${acts.length}</strong><small>${ev.dias.length} días</small></li>
      <li class="card"><span>Expositores</span><strong>${personas.length}</strong><small>${new Set(personas.map((x) => x.institucion)).size} instituciones</small></li>
      <li class="card"><span>Entradas emitidas</span><strong>${entradas.length}</strong><small>en este dispositivo</small></li>
      <li class="card"><span>Ingresos (check-in)</span><strong>${conIngreso}</strong><small>${entradas.length ? Math.round((conIngreso / entradas.length) * 100) : 0}% de las entradas</small></li>
    </ul>

    <div class="hallazgos card">
      <h2><i data-lucide="lightbulb"></i>Hallazgos automáticos</h2>
      <ul>
        <li>El <strong>${escapar(salaTop[0])}</strong> concentra el <strong>${Math.round((salaTop[1] / totalH) * 100)}%</strong> de las horas del congreso: conviene reforzar ahí la logística (ascensores, señalización).</li>
        <li>La franja más cargada es a las <strong>${pico}</strong>, con ${maxF} actividades simultáneas sumando los tres días.</li>
        <li>El tema con más actividades es <strong>${escapar(areaDe(temas[0][0]).nombre)}</strong> (${temas[0][1]}).</li>
        ${CONGRESO.salas.filter((s) => !acts.some((c) => c.sala === s.id)).map((s) => `<li>El lugar <strong>${escapar(s.nombre)}</strong> no tiene actividades asignadas.</li>`).join('')}
      </ul>
    </div>

    <div class="graficos">
      <article class="card grafico">
        <h2>Interés por actividad</h2>
        <p class="grafico__nota">Personas que la guardaron en «Mi agenda». <span class="tag">Datos de demostración</span></p>
        ${barras(interes.map(([c, v]) => [escapar(c.titulo.length > 46 ? c.titulo.slice(0, 44) + '…' : c.titulo), v, areaDe(c.area).color]), maxI)}
      </article>
      <article class="card grafico">
        <h2>Uso de cada lugar</h2>
        <p class="grafico__nota">Horas programadas en los tres días.</p>
        ${barras(horas.map(([n, v]) => [escapar(n), v]), maxH, ' h')}
      </article>
      <article class="card grafico">
        <h2>Actividades por tema</h2>
        <p class="grafico__nota">Según la agenda vigente.</p>
        ${barras(temas.map(([a, v]) => [escapar(areaDe(a).nombre), v, areaDe(a).color]), temas[0][1])}
      </article>
      <article class="card grafico">
        <h2>Carga por hora</h2>
        <p class="grafico__nota">Actividades en curso en cada hora (suma de los tres días).</p>
        <div class="calor" role="img" aria-label="Carga por hora: ${franjas.map((f) => `${f[0]}h ${f[1]}`).join(', ')}">
          ${franjas.map(([h, v]) => `<div class="calor__col"><span class="calor__barra" style="height:${(v / maxF) * 100}%"></span><small>${h}</small></div>`).join('')}
        </div>
      </article>
    </div>`;
}

// ---------- Actividades ----------
function pintarActividades() {
  const filas = ev.dias.map((_, i) => {
    const d = i + 1;
    const cs = reales().filter((c) => c.dia === d).sort((a, b) => aMin(a.ini) - aMin(b.ini));
    return `<h2 class="grupo-tit">${mayus(new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).format(fechaDia(d)))}</h2>
      <ul class="gestion card">${cs.map((c) => {
        const x = expositorDe(c.exp[0]);
        return `<li>
          <span class="gestion__hora">${c.ini}<small>${c.fin}</small></span>
          <span class="gestion__txt"><strong>${escapar(c.titulo)}</strong><small>${tipoDe(c.tipo).nombre} · ${escapar(salaDe(c.sala)?.nombre || '')}${x ? ` · ${escapar(x.nombre)}` : ''}</small></span>
          <span class="gestion__acc">
            <button class="btn btn--secondary btn--icon" type="button" data-editar-act="${c.id}" aria-label="Editar «${escapar(c.titulo)}»"><i data-lucide="pencil"></i></button>
            <button class="btn btn--peligro btn--icon" type="button" data-borrar-act="${c.id}" aria-label="Eliminar «${escapar(c.titulo)}»"><i data-lucide="trash-2"></i></button>
          </span></li>`;
      }).join('') || '<li class="gestion__vacio">Sin actividades</li>'}</ul>`;
  }).join('');
  $('[data-panel="actividades"]').innerHTML = `
    <div class="barra-acc">
      <button class="btn btn--primary" type="button" data-nueva-act><i data-lucide="plus"></i>Nueva actividad</button>
      ${DatosEditables.editado() ? '<button class="btn btn--ghost btn--sm" type="button" data-restablecer><i data-lucide="rotate-ccw"></i>Restablecer agenda original</button>' : ''}
    </div>${filas}`;
}

function formActividad(c) {
  const nueva = !c;
  c = c || { dia: 1, ini: '09:00', fin: '10:00', sala: 'volcanes', tipo: 'conferencia', area: 'investigacion', titulo: '', exp: [] };
  const opt = (pares, val) => pares.map(([v, t]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${escapar(t)}</option>`).join('');
  $('#editorCuerpo').innerHTML = `
    <div class="hoja__cab"><h2 id="edTitulo">${nueva ? 'Nueva actividad' : 'Editar actividad'}</h2><button class="cerrar" type="button" data-cerrar aria-label="Cerrar"><i data-lucide="x"></i></button></div>
    <form class="form hoja__cuerpo" id="formAct" novalidate>
      <label>Tema de la actividad<input name="titulo" required maxlength="160" value="${escapar(c.titulo)}"></label>
      <div class="fila2">
        <label>Tipo<select name="tipo">${opt(Object.entries(CONGRESO.tipos).filter(([k]) => k !== 'receso').map(([k, v]) => [k, v.nombre]), c.tipo)}</select></label>
        <label>Área<select name="area">${opt(Object.entries(CONGRESO.areas).filter(([k]) => k !== 'general').map(([k, v]) => [k, v.nombre]), c.area)}</select></label>
      </div>
      <div class="fila2">
        <label>Día<select name="dia">${opt(ev.dias.map((_, i) => [i + 1, diaCorto(i + 1)]), c.dia)}</select></label>
        <label>Lugar<select name="sala">${opt(CONGRESO.salas.map((s) => [s.id, s.nombre]), c.sala)}</select></label>
      </div>
      <div class="fila2">
        <label>Inicio<input name="ini" type="time" required value="${c.ini}"></label>
        <label>Fin<input name="fin" type="time" required value="${c.fin}"></label>
      </div>
      <label>Expositor<select name="exp">${opt([['', '— Sin expositor —'], ...CONGRESO.expositores.map((x) => [x.id, `${x.nombre} (${x.institucion})`])], c.exp[0] ?? '')}</select></label>
      <p class="error" id="errAct" role="alert" hidden></p>
      <div class="hoja__pie"><button class="btn btn--secondary" type="button" data-cerrar>Cancelar</button><button class="btn btn--primary" type="submit">${nueva ? 'Crear actividad' : 'Guardar cambios'}</button></div>
    </form>`;
  iconos();
  $('#editor').showModal();
  $('#formAct [name="titulo"]').focus();
  $('#formAct').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const err = (m) => { const p = $('#errAct'); p.textContent = m; p.hidden = false; };
    if (!f.titulo.trim()) return err('Escribe el tema de la actividad.');
    if (!f.ini || !f.fin || aMin(f.fin) <= aMin(f.ini)) return err('La hora de fin debe ser posterior a la de inicio.');
    const datos = { titulo: f.titulo.trim(), tipo: f.tipo, area: f.area, dia: +f.dia, sala: f.sala, ini: f.ini, fin: f.fin, exp: f.exp ? [+f.exp] : [] };
    // Prevención de errores: el lugar no puede tener dos actividades a la vez
    const choque = reales().find((o) => o.id !== c.id && o.sala === datos.sala && seCruzan({ ...datos, id: -1 }, o));
    if (choque) return err(`Ese lugar ya está ocupado por «${choque.titulo}» (${choque.ini} – ${choque.fin}). Cambia la hora o el lugar.`);
    if (nueva) CONGRESO.charlas.push({ id: Math.max(...CONGRESO.charlas.map((x) => x.id)) + 1, carreras: ['sistemas'], ...datos });
    else Object.assign(CONGRESO.charlas.find((x) => x.id === c.id), datos);
    DatosEditables.guardar();
    $('#editor').close();
    pintar();
    avisar(nueva ? 'Actividad creada. Ya aparece en la agenda.' : 'Cambios guardados. La agenda se actualizó.');
  });
}

// ---------- Expositores ----------
const filtroExp = { q: '', origen: '' };
const esLocalExp = (x) => /PUCESA|PUCE|alumni/i.test(x.institucion);
const actsDe = (x) => {
  const cs = CONGRESO.charlas.filter((c) => c.exp.includes(x.id) && !esReceso(c)).sort((a, b) => a.dia - b.dia || aMin(a.ini) - aMin(b.ini));
  return cs.filter((c, i) => cs.findIndex((o) => o.titulo === c.titulo) === i);
};

function pintarExpositores() {
  const personas = CONGRESO.expositores.filter((x) => !x.grupo);
  const inst = new Set(personas.map((x) => x.institucion)).size;
  const inv = personas.filter((x) => !esLocalExp(x)).length;
  const grupos = CONGRESO.expositores.length - personas.length;
  $('[data-panel="expositores"]').innerHTML = `
    <ul class="xc-cifras">
      <li><i data-lucide="mic"></i><strong>${personas.length}</strong><span>expositores</span></li>
      <li><i data-lucide="plane"></i><strong>${inv}</strong><span>invitados externos</span></li>
      <li><i data-lucide="landmark"></i><strong>${inst}</strong><span>instituciones</span></li>
      <li><i data-lucide="users"></i><strong>${grupos}</strong><span>grupos</span></li>
    </ul>
    <div class="xc-barra">
      <label class="campo xc-buscar"><i data-lucide="search"></i><span class="sr-only">Buscar expositor</span>
        <input id="qExp" type="search" placeholder="Buscar por nombre, institución, código o ponencia" value="${escapar(filtroExp.q)}" autocomplete="off"></label>
      <div class="segmento xc-filtros" role="group" aria-label="Filtrar expositores">
        ${[['', 'Todos'], ['invitados', 'Invitados'], ['pucesa', 'PUCESA'], ['grupos', 'Grupos']].map(([v, t]) =>
          `<button type="button" data-filtro-exp="${v}" aria-pressed="${filtroExp.origen === v}">${t}</button>`).join('')}
      </div>
      <div class="xc-acc-barra">
        <button class="btn btn--secondary btn--sm" type="button" data-copiar-todos><i data-lucide="clipboard-list"></i>Copiar todos los códigos</button>
        <button class="btn btn--primary btn--sm" type="button" data-nuevo-exp><i data-lucide="user-plus"></i>Nuevo expositor</button>
      </div>
    </div>
    <p class="xc-resumen" id="resExp" aria-live="polite"></p>
    <div class="xc-grid" id="gridExp"></div>`;
  pintarGridExp();
  $('#qExp').addEventListener('input', (e) => { filtroExp.q = e.target.value; pintarGridExp(); });
}

function pintarGridExp() {
  const q = normal(filtroExp.q.trim());
  const lista = CONGRESO.expositores.filter((x) => {
    if (filtroExp.origen === 'grupos' && !x.grupo) return false;
    if (filtroExp.origen === 'invitados' && (x.grupo || esLocalExp(x))) return false;
    if (filtroExp.origen === 'pucesa' && (x.grupo || !esLocalExp(x))) return false;
    if (!q) return true;
    const texto = normal([x.nombre, x.institucion, x.codigo || '', ...actsDe(x).map((c) => c.titulo)].join(' '));
    return q.split(/\s+/).every((p) => texto.includes(p));
  });
  $$('[data-filtro-exp]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtroExp === filtroExp.origen)));
  $('#resExp').textContent = `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}`;
  $('#gridExp').innerHTML = lista.length ? lista.map(tarjetaExp).join('')
    : '<div class="vacio"><i data-lucide="search-x"></i><p>No hay expositores con esa búsqueda.</p></div>';
  iconos();
}

function tarjetaExp(x) {
  const acts = actsDe(x);
  const ar = areaDe(acts[0]?.area);
  const portada = typeof Portadas !== 'undefined' && acts[0] ? Portadas.svg(acts[0]) : '';
  const etiqueta = x.grupo ? '<span class="xc-tag xc-tag--grupo"><i data-lucide="users"></i>Grupo</span>'
    : esLocalExp(x) ? '<span class="xc-tag"><i data-lucide="school"></i>PUCESA</span>'
    : '<span class="xc-tag xc-tag--inv"><i data-lucide="plane"></i>Invitado</span>';
  return `<article class="xc${x.grupo ? ' xc--grupo' : ''}" style="--c:${ar.color}">
    <div class="xc__img">${portada}<div class="xc__tags">${etiqueta}<span class="xc-tag">${acts.length} ${acts.length === 1 ? 'ponencia' : 'ponencias'}</span></div></div>
    <div class="xc__cuerpo">
      <div class="xc__id">
        <span class="xc__avatar" aria-hidden="true">${x.grupo ? '<i data-lucide="users"></i>' : iniciales(x.nombre)}</span>
        <div><h3>${escapar(x.nombre)}</h3><p>${escapar(x.institucion)}</p></div>
      </div>
      ${x.codigo ? `<div class="xc__codigo">
          <span class="xc__codigo-lbl"><i data-lucide="key-round"></i>Código de acceso</span>
          <code>${x.codigo}</code>
          <button class="xc__copiar" type="button" data-copiar="${x.codigo}" aria-label="Copiar el código de ${escapar(x.nombre)}" title="Copiar código"><i data-lucide="copy"></i></button>
        </div>`
        : '<p class="xc__nota"><i data-lucide="info"></i>Es un grupo: no tiene panel ni código propio.</p>'}
      <ul class="xc__acts">${acts.slice(0, 3).map((c) => {
        const a = areaDe(c.area);
        return `<li style="--c:${a.color}"><span class="xc__dot" aria-hidden="true"></span><span class="xc__act-t">${escapar(c.titulo)}</span><small>${diaCorto(c.dia).split(' ')[0]} ${c.ini}</small></li>`;
      }).join('')}${acts.length > 3 ? `<li class="xc__mas">+${acts.length - 3} más</li>` : ''}${acts.length ? '' : '<li class="xc__mas">Sin ponencias asignadas</li>'}</ul>
      <div class="xc__acc">
        ${x.codigo ? `<a class="btn btn--primary btn--sm" href="expositor.html?codigo=${x.codigo}" target="_blank" rel="noopener"><i data-lucide="log-in"></i>Probar acceso<span class="sr-only"> (se abre en otra pestaña)</span></a>` : ''}
        <button class="btn btn--secondary btn--sm" type="button" data-editar-exp="${x.id}"><i data-lucide="pencil"></i>Editar<span class="sr-only"> a ${escapar(x.nombre)}</span></button>
        <button class="btn btn--peligro btn--icon btn--sm" type="button" data-borrar-exp="${x.id}" aria-label="Eliminar a ${escapar(x.nombre)}" title="Eliminar"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  </article>`;
}

// Copiar al portapapeles (con alternativa para navegadores antiguos)
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch {
    const t = document.createElement('textarea'); t.value = texto; t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t); t.select();
    const ok = document.execCommand?.('copy'); t.remove(); return !!ok;
  }
}

function formExpositor(x) {
  const nuevo = !x;
  x = x || { nombre: '', institucion: '' };
  $('#editorCuerpo').innerHTML = `
    <div class="hoja__cab"><h2 id="edTitulo">${nuevo ? 'Nuevo expositor' : 'Editar expositor'}</h2><button class="cerrar" type="button" data-cerrar aria-label="Cerrar"><i data-lucide="x"></i></button></div>
    <form class="form hoja__cuerpo" id="formExp" novalidate>
      <label>Nombre completo <small>con título, p. ej. «Mg. Ana Pérez»</small><input name="nombre" required maxlength="100" value="${escapar(x.nombre)}"></label>
      <label>Institución que representa<input name="institucion" required maxlength="120" value="${escapar(x.institucion)}"></label>
      ${nuevo ? '<p class="aviso-demo"><i data-lucide="key-round"></i><span>Al crearlo se genera su código de acceso para el panel de expositores.</span></p>' : ''}
      <p class="error" id="errExp" role="alert" hidden></p>
      <div class="hoja__pie"><button class="btn btn--secondary" type="button" data-cerrar>Cancelar</button><button class="btn btn--primary" type="submit">${nuevo ? 'Crear expositor' : 'Guardar cambios'}</button></div>
    </form>`;
  iconos();
  $('#editor').showModal();
  $('#formExp [name="nombre"]').focus();
  $('#formExp').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const err = (m) => { const p = $('#errExp'); p.textContent = m; p.hidden = false; };
    if (!f.nombre.trim() || !f.institucion.trim()) return err('Completa el nombre y la institución.');
    if (nuevo) {
      const id = Math.max(...CONGRESO.expositores.map((e) => e.id)) + 1;
      const codigo = `EXP-${1000 + id}`;
      CONGRESO.expositores.push({ id, nombre: f.nombre.trim(), institucion: f.institucion.trim(), codigo });
      DatosEditables.guardar(); $('#editor').close(); pintar();
      avisar(`Expositor creado. Su código de acceso es ${codigo}`, { ms: 6000 });
    } else {
      Object.assign(CONGRESO.expositores.find((e) => e.id === x.id), { nombre: f.nombre.trim(), institucion: f.institucion.trim() });
      DatosEditables.guardar(); $('#editor').close(); pintar(); avisar('Cambios guardados');
    }
  });
}

// ---------- Check-in ----------
function pintarCheckin() {
  const lista = Entradas.todas().slice().reverse();
  const camara = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
  $('[data-panel="checkin"]').innerHTML = `
    <div class="checkin card">
      <h2>Registrar ingreso</h2>
      <form class="form checkin__form" id="formCheck" novalidate>
        <label>Código de la entrada<input id="codEntrada" autocomplete="off" autocapitalize="characters" placeholder="CSIU-XXXX00" required></label>
        <button class="btn btn--primary" type="submit"><i data-lucide="check"></i>Registrar</button>
        ${camara ? '<button class="btn btn--secondary" type="button" id="btnCamara"><i data-lucide="camera"></i>Escanear QR</button>' : ''}
      </form>
      <video id="video" class="checkin__video" playsinline muted hidden></video>
      <div id="resCheck" role="status" aria-live="polite"></div>
      ${camara ? '' : '<p class="grafico__nota">Este navegador no permite escanear con la cámara; escribe el código que aparece bajo el QR.</p>'}
    </div>
    <h2 class="grupo-tit">Entradas emitidas en este dispositivo (${lista.length})</h2>
    ${lista.length ? `<ul class="gestion card">${lista.map((e) => `<li>
      <span class="avatar" aria-hidden="true">${iniciales(e.nombre)}</span>
      <span class="gestion__txt"><strong>${escapar(e.nombre)}</strong><small>${e.codigo}${e.institucion ? ` · ${escapar(e.institucion)}` : ''}</small></span>
      ${e.checkin ? `<span class="estado estado--ok"><i data-lucide="check"></i>Ingresó ${new Date(e.checkin).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span>` : `<button class="btn btn--secondary btn--sm" type="button" data-check="${e.codigo}">Registrar</button>`}
    </li>`).join('')}</ul>` : '<p class="vacio">Todavía no hay entradas. Para probar, genera una en <a class="link" href="mi-entrada.html">Mi entrada</a> y vuelve aquí.</p>'}`;
  $('#formCheck').addEventListener('submit', (e) => { e.preventDefault(); registrar($('#codEntrada').value); });
  $('#btnCamara')?.addEventListener('click', alternarCamara);
}

function registrar(codigo) {
  const ya = Entradas.buscar(codigo);
  const res = $('#resCheck');
  if (!String(codigo).trim()) { res.innerHTML = '<p class="resultado resultado--error">Escribe un código.</p>'; return; }
  if (!ya) { res.innerHTML = `<p class="resultado resultado--error"><i data-lucide="x-circle"></i>No existe ninguna entrada con el código «${escapar(codigo.toUpperCase())}».</p>`; iconos(); return; }
  const antes = ya.checkin;
  const e = Entradas.marcar(codigo);
  detenerCamara();
  pintarCheckin();
  $('#resCheck').innerHTML = antes
    ? `<p class="resultado resultado--aviso"><i data-lucide="info"></i>${escapar(e.nombre)} ya había ingresado a las ${new Date(antes).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}.</p>`
    : `<p class="resultado resultado--ok"><i data-lucide="check-circle"></i>Bienvenida/o, ${escapar(e.nombre)}. Ingreso registrado.</p>`;
  iconos();
}

let flujo, detector, bucle;
async function alternarCamara() {
  if (flujo) return detenerCamara();
  try {
    detector = new BarcodeDetector({ formats: ['qr_code'] });
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = $('#video'); v.srcObject = flujo; v.hidden = false; await v.play();
    $('#btnCamara').innerHTML = '<i data-lucide="camera-off"></i>Detener cámara'; iconos();
    const leer = async () => {
      if (!flujo) return;
      try { const r = await detector.detect(v); if (r[0]) return registrar(r[0].rawValue); } catch { /* sigue intentando */ }
      bucle = requestAnimationFrame(leer);
    };
    leer();
  } catch {
    detenerCamara();
    $('#resCheck').innerHTML = '<p class="resultado resultado--error">No se pudo usar la cámara. Revisa el permiso o escribe el código.</p>';
  }
}
function detenerCamara() {
  cancelAnimationFrame(bucle);
  flujo?.getTracks().forEach((t) => t.stop());
  flujo = null;
  const v = $('#video'); if (v) { v.hidden = true; v.srcObject = null; }
}

// ---------- Acciones ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-cerrar]')) return $('#editor').close();
  if (t.closest('[data-nueva-act]')) return formActividad();
  const ea = t.closest('[data-editar-act]'); if (ea) return formActividad(CONGRESO.charlas.find((c) => c.id === +ea.dataset.editarAct));
  const ba = t.closest('[data-borrar-act]');
  if (ba) {
    const c = CONGRESO.charlas.find((x) => x.id === +ba.dataset.borrarAct);
    if (!confirm(`¿Eliminar «${c.titulo}»? Dejará de aparecer en la agenda.`)) return;
    const copia = { ...c }, pos = CONGRESO.charlas.indexOf(c);
    CONGRESO.charlas.splice(pos, 1); DatosEditables.guardar(); pintar();
    return avisar('Actividad eliminada', { accion: 'Deshacer', alHacer: () => { CONGRESO.charlas.splice(pos, 0, copia); DatosEditables.guardar(); pintar(); } });
  }
  const fe = t.closest('[data-filtro-exp]'); if (fe) { filtroExp.origen = fe.dataset.filtroExp; return pintarGridExp(); }
  const cp = t.closest('[data-copiar]');
  if (cp) {
    copiar(cp.dataset.copiar).then((ok) => {
      if (!ok) return avisar(`No se pudo copiar. El código es ${cp.dataset.copiar}`, { ms: 5000 });
      avisar(`Código ${cp.dataset.copiar} copiado`);
      cp.classList.add('is-ok'); cp.innerHTML = '<i data-lucide="check"></i>'; iconos();
      setTimeout(() => { cp.classList.remove('is-ok'); cp.innerHTML = '<i data-lucide="copy"></i>'; iconos(); }, 1600);
    });
    return;
  }
  if (t.closest('[data-copiar-todos]')) {
    const texto = CONGRESO.expositores.filter((x) => x.codigo).map((x) => `${x.nombre} — ${x.institucion} — ${x.codigo}`).join('\n');
    copiar(texto).then((ok) => avisar(ok ? 'Lista de códigos copiada. Pégala en un correo o documento.' : 'No se pudo copiar la lista', { ms: 4000 }));
    return;
  }
  if (t.closest('[data-nuevo-exp]')) return formExpositor();
  const ee = t.closest('[data-editar-exp]'); if (ee) return formExpositor(CONGRESO.expositores.find((x) => x.id === +ee.dataset.editarExp));
  const be = t.closest('[data-borrar-exp]');
  if (be) {
    const x = CONGRESO.expositores.find((y) => y.id === +be.dataset.borrarExp);
    const n = CONGRESO.charlas.filter((c) => c.exp.includes(x.id)).length;
    if (n) return avisar(`No se puede eliminar: ${x.nombre} tiene ${n} ${n === 1 ? 'actividad' : 'actividades'}. Reasígnalas primero.`, { ms: 5000 });
    if (!confirm(`¿Eliminar a ${x.nombre}?`)) return;
    const pos = CONGRESO.expositores.indexOf(x);
    CONGRESO.expositores.splice(pos, 1); DatosEditables.guardar(); pintar();
    return avisar('Expositor eliminado', { accion: 'Deshacer', alHacer: () => { CONGRESO.expositores.splice(pos, 0, x); DatosEditables.guardar(); pintar(); } });
  }
  if (t.closest('[data-restablecer]')) {
    if (!confirm('¿Volver a la agenda original del Excel? Se perderán los cambios hechos en este navegador.')) return;
    DatosEditables.restablecer(); location.reload();
  }
  const ck = t.closest('[data-check]'); if (ck) return registrar(ck.dataset.check);
});
$('#editor').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

mostrar();
