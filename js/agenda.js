// =====================================================================
//  Agenda: días, búsqueda, filtros, lista / por lugar, Mi agenda, .ics
// =====================================================================
const ev = CONGRESO.evento;
const fmtDiaLargo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
const params = new URLSearchParams(location.search);

const estado = {
  dia: Math.min(Math.max(parseInt(params.get('dia'), 10) || diaInicial(), 1), ev.dias.length),
  q: '',
  area: CONGRESO.areas[params.get('area')] ? params.get('area') : '',
  lugar: '',
  tipo: '',
  soloMias: params.get('mias') === '1',
  vista: almacen.get('csiu.vista', 'lista'),
  simulado: null,
};

function diaInicial() {
  const hoy = new Date().toDateString();
  const i = ev.dias.findIndex((_, n) => fechaDia(n + 1).toDateString() === hoy);
  return i >= 0 ? i + 1 : 1;
}
const ahora = () => estado.simulado || new Date();
const enVivo = (c) => { const t = ahora(); return instante(c, c.ini) <= t && t < instante(c, c.fin); };
const terminada = (c) => instante(c, c.fin) <= ahora();
const hayFiltros = () => !!(estado.q.trim() || estado.area || estado.lugar || estado.tipo);

// ---------- Controles ----------
function prepararFiltros() {
  const reales = CONGRESO.charlas.filter((c) => !esReceso(c));
  const opts = (sel, pares) => sel.insertAdjacentHTML('beforeend', pares.map(([v, t]) => `<option value="${v}">${escapar(t)}</option>`).join(''));
  opts($('#fLugar'), CONGRESO.salas.map((s) => [s.id, s.nombre]));
  opts($('#fTipo'), [...new Set(reales.map((c) => c.tipo))].map((t) => [t, tipoDe(t).nombre]));
  opts($('#fArea'), [...new Set(reales.map((c) => c.area))].map((a) => [a, areaDe(a).nombre]));
  $('#fArea').value = estado.area;
}

function pintarDias() {
  $('#dias').innerHTML = ev.dias.map((_, i) => {
    const n = i + 1;
    return `<button type="button" role="tab" data-dia="${n}" aria-selected="${estado.dia === n}">${diaCorto(n)}</button>`;
  }).join('');
}

// ---------- Datos filtrados ----------
function filtrar(c, mias) {
  if (esReceso(c)) return !hayFiltros() && !estado.soloMias;
  if (estado.soloMias && !mias.has(c.id)) return false;
  if (estado.area && c.area !== estado.area) return false;
  if (estado.lugar && c.sala !== estado.lugar) return false;
  if (estado.tipo && c.tipo !== estado.tipo) return false;
  const q = estado.q.trim().toLowerCase();
  if (q) {
    const texto = [c.titulo, salaDe(c.sala)?.nombre, areaDe(c.area).nombre,
      ...c.exp.map((id) => { const x = expositorDe(id); return `${x.nombre} ${x.institucion}`; })].join(' ').toLowerCase();
    if (!q.split(/\s+/).every((p) => texto.includes(p))) return false;
  }
  return true;
}
function charlas() {
  const mias = MiAgenda.ids();
  return CONGRESO.charlas
    .filter((c) => (estado.soloMias ? true : c.dia === estado.dia))
    .filter((c) => filtrar(c, mias))
    .sort((a, b) => a.dia - b.dia || aMin(a.ini) - aMin(b.ini) || aMin(a.fin) - aMin(b.fin));
}
function crucesDe(c, mias = MiAgenda.ids()) {
  if (!mias.has(c.id)) return [];
  return CONGRESO.charlas.filter((o) => mias.has(o.id) && seCruzan(c, o));
}

// ---------- Piezas ----------
function htmlSesion(c, mias) {
  if (esReceso(c)) {
    const almuerzo = /almuerzo/i.test(c.titulo);
    const min = aMin(c.fin) - aMin(c.ini);
    return `<div class="pausa${almuerzo ? ' pausa--larga' : ''}">
      <span class="pausa__linea" aria-hidden="true"></span>
      <p class="pausa__pill">
        <span class="pausa__ico" aria-hidden="true"><i data-lucide="${almuerzo ? 'utensils' : 'coffee'}"></i></span>
        <span class="pausa__txt"><strong>${escapar(almuerzo ? 'Almuerzo' : c.titulo)}</strong><small>${c.ini} – ${c.fin} · ${min >= 60 ? `${min / 60} h` : `${min} min`}</small></span>
      </p>
      <span class="pausa__linea" aria-hidden="true"></span>
    </div>`;
  }
  const ar = areaDe(c.area), sala = salaDe(c.sala);
  const fav = mias.has(c.id), vivo = enVivo(c), fin = !vivo && terminada(c);
  const cruces = crucesDe(c, mias);
  const tp = tipoDe(c.tipo);
  const expos = c.exp.map((id) => {
    const x = expositorDe(id);
    return `<p class="tarj__exp"><span class="avatar" aria-hidden="true">${x.grupo ? '<i data-lucide="users"></i>' : iniciales(x.nombre)}</span>
      <span><strong>${escapar(x.nombre)}</strong><small>${escapar(x.institucion)}</small></span></p>`;
  }).join('');
  return `<article class="tarj${vivo ? ' is-live' : ''}${fin ? ' is-done' : ''}" data-id="${c.id}" style="--c:${ar.color}">
    <div class="tarj__img">
      ${Portadas.svg(c)}
      <span class="tarj__hora"><i data-lucide="clock"></i>${c.ini} – ${c.fin}</span>
      ${vivo ? '<span class="tarj__estado tarj__estado--vivo">En vivo</span>' : ''}${fin ? '<span class="tarj__estado">Finalizada</span>' : ''}
      <button type="button" class="fav tarj__fav" data-fav="${c.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de' : 'Guardar en'} Mi agenda: ${escapar(c.titulo)}"><i data-lucide="star"></i></button>
      <span class="tarj__tipo"><i data-lucide="${tp.icono}"></i>${tp.nombre}${c.turno ? ` · Turno ${c.turno}` : ''}</span>
    </div>
    <div class="tarj__cuerpo">
      <span class="tema" style="--c:${ar.color}"><i data-lucide="${ar.icono}"></i>${ar.nombre}</span>
      <h3><button type="button" class="ses__tit" data-abrir="${c.id}">${escapar(c.titulo)}</button></h3>
      ${expos}
      <button type="button" class="link ses__lugar" data-ruta="${sala.id}"><i data-lucide="map-pin"></i>${escapar(textoLugar(sala))}</button>
      ${cruces.length ? `<p class="ses__cruce"><i data-lucide="triangle-alert"></i>Se cruza con «${escapar(cruces[0].titulo)}»</p>` : ''}
    </div>
  </article>`;
}

function pintarLista(lista) {
  const mias = MiAgenda.ids();
  let html = '', diaActual = 0;
  for (const c of lista) {
    if (estado.soloMias && c.dia !== diaActual) {
      diaActual = c.dia;
      html += `<h2 class="lista__dia">${mayus(fmtDiaLargo.format(fechaDia(c.dia)))}</h2>`;
    }
    html += htmlSesion(c, mias);
  }
  $('#lista').innerHTML = html;
  // Simetría: si un bloque entre recesos tiene un número impar de tarjetas,
  // la última se centra en vez de quedar sola a la izquierda
  let bloque = [];
  const cerrar = () => { if (bloque.length % 2 === 1) bloque.at(-1).classList.add('is-sola'); bloque = []; };
  for (const el of $('#lista').children) { if (el.classList.contains('tarj')) bloque.push(el); else cerrar(); }
  cerrar();
}

function pintarGrilla(lista) {
  const PX = 1.4;
  const delDia = CONGRESO.charlas.filter((c) => c.dia === estado.dia);
  const desde = Math.floor(Math.min(...delDia.map((c) => aMin(c.ini))) / 60) * 60;
  const hasta = Math.ceil(Math.max(...delDia.map((c) => aMin(c.fin))) / 60) * 60;
  const alto = (hasta - desde) * PX;
  const mias = MiAgenda.ids();
  let horas = '';
  for (let m = desde; m <= hasta; m += 60) horas += `<span class="g__hora" style="top:${(m - desde) * PX}px">${String(m / 60).padStart(2, '0')}:00</span>`;
  const cols = CONGRESO.salas.map((s) => `<div class="g__col" style="height:${alto}px">${lista.filter((c) => c.sala === s.id).map((c) => {
    const ar = areaDe(c.area), x = expositorDe(c.exp[0]);
    return `<button type="button" class="g__ev${enVivo(c) ? ' is-live' : ''}" data-abrir="${c.id}" style="--c:${ar.color};top:${(aMin(c.ini) - desde) * PX}px;height:${(aMin(c.fin) - aMin(c.ini)) * PX - 4}px">
      <span class="g__evh">${c.ini} – ${c.fin}${mias.has(c.id) ? ' <i data-lucide="star" class="g__star"></i>' : ''}</span>
      <strong>${escapar(c.titulo)}</strong>${x ? `<small>${escapar(x.nombre)}</small>` : ''}</button>`;
  }).join('')}</div>`).join('');
  const recesos = lista.filter(esReceso).map((c) =>
    `<div class="g__receso" style="top:${(aMin(c.ini) - desde) * PX}px;height:${(aMin(c.fin) - aMin(c.ini)) * PX}px"><span>${escapar(c.titulo)}</span></div>`).join('');
  let linea = '';
  const t = ahora();
  if (fechaDia(estado.dia).toDateString() === t.toDateString() || estado.simulado) {
    const min = (t - instante({ dia: estado.dia }, '00:00')) / 60000;
    if (min >= desde && min <= hasta) linea = `<div class="g__ahora" style="top:${(min - desde) * PX}px"><span>Ahora</span></div>`;
  }
  $('#grilla').innerHTML = `<div class="g" style="--n:${CONGRESO.salas.length}">
    <div class="g__head"><span></span>${CONGRESO.salas.map((s) => `<div class="g__sala"><strong>${escapar(s.nombre)}</strong>${s.piso ? `<small>${escapar(s.piso)}</small>` : ''}</div>`).join('')}</div>
    <div class="g__body" style="height:${alto}px"><div class="g__horas">${horas}</div>${cols}<div class="g__capa">${recesos}${linea}</div></div>
  </div>`;
}

// ---------- Render ----------
function render() {
  const mias = MiAgenda.ids();
  pintarDias();
  marcarSeccion(estado.soloMias ? 'mias' : 'agenda');
  $('#agTitulo').textContent = estado.soloMias ? 'Mi agenda' : 'Agenda';
  document.title = `${estado.soloMias ? 'Mi agenda' : 'Agenda'} · XI CSIU`;
  $('#diasWrap').hidden = estado.soloMias;
  $('#fMias').setAttribute('aria-pressed', String(estado.soloMias));
  $('#cuentaMias').textContent = mias.size;
  $('#misAcc').hidden = !estado.soloMias || !mias.size;
  $$('.vista button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === estado.vista)));
  $('.vista').hidden = estado.soloMias;
  ['#fLugar', '#fTipo', '#fArea'].forEach((s) => $(s).classList.toggle('is-set', !!$(s).value));
  $('#btnVivo').setAttribute('aria-pressed', String(!!estado.simulado));
  $('#btnVivo').textContent = estado.simulado ? 'Volver a la hora real' : 'Simular en vivo';

  const lista = charlas();
  const n = lista.filter((c) => !esReceso(c)).length;
  const donde = estado.soloMias ? 'guardadas' : mayus(fmtDiaLargo.format(fechaDia(estado.dia)));
  $('#resumen').textContent = `${n} ${n === 1 ? 'actividad' : 'actividades'} · ${donde}`;
  $('#btnLimpiar').hidden = !hayFiltros();

  const vista = estado.soloMias ? 'lista' : estado.vista;
  $('#vacio').hidden = n > 0;
  $('#lista').hidden = n === 0 || vista !== 'lista';
  $('#grilla').hidden = n === 0 || vista !== 'grilla';
  if (n === 0) {
    $('#vacio').innerHTML = estado.soloMias && !mias.size
      ? '<i data-lucide="star"></i><p><strong>Aún no guardas actividades</strong></p><p>Toca la estrella de una actividad para tenerla aquí.</p><button class="btn btn--secondary btn--sm" type="button" data-salir-mias>Ver la agenda</button>'
      : '<i data-lucide="search-x"></i><p>No hay actividades con esos filtros.</p><button class="btn btn--secondary btn--sm" type="button" data-limpiar>Limpiar filtros</button>';
  } else {
    vista === 'lista' ? pintarLista(lista) : pintarGrilla(lista);
  }
  iconos();
}

// ---------- Detalle ----------
function abrirDetalle(id) {
  const c = CONGRESO.charlas.find((x) => x.id === id);
  if (!c || esReceso(c)) return;
  const ar = areaDe(c.area), tp = tipoDe(c.tipo), sala = salaDe(c.sala);
  const fav = MiAgenda.tiene(c.id);
  const cruces = crucesDe(c);
  $('#detalleCard').innerHTML = `
    <div class="hoja__cab"><h2 id="dTitulo">${escapar(c.titulo)}</h2><button class="cerrar" type="button" data-cerrar aria-label="Cerrar"><i data-lucide="x"></i></button></div>
    <div class="det__portada">${Portadas.svg(c)}</div>
    <div class="hoja__cuerpo">
      <p class="det__meta">${enVivo(c) ? '<span class="en-vivo">En vivo</span>' : ''}<span>${tp.nombre}</span><span class="tema" style="--c:${ar.color}"><i data-lucide="${ar.icono}"></i>${ar.nombre}</span>${c.turno ? `<span>· Turno ${c.turno}</span>` : ''}</p>
      <dl class="det__datos">
        <div><dt>Fecha</dt><dd>${mayus(fmtDiaLargo.format(fechaDia(c.dia)))}</dd></div>
        <div><dt>Hora</dt><dd>${c.ini} – ${c.fin} <span class="muted">(${aMin(c.fin) - aMin(c.ini)} min)</span></dd></div>
        <div><dt>Lugar</dt><dd><button type="button" class="link" data-ruta="${sala.id}">${escapar(textoLugar(sala))}<i data-lucide="chevron-right"></i></button></dd></div>
      </dl>
      ${cruces.length ? `<p class="ses__cruce"><i data-lucide="triangle-alert"></i>Se cruza con otra actividad de Mi agenda: «${escapar(cruces[0].titulo)}»</p>` : ''}
      <h3 class="det__sub">${c.exp.length > 1 ? 'Expositores' : 'Expositor'}</h3>
      <ul class="det__expos">${c.exp.map((id) => {
        const x = expositorDe(id);
        const inner = `<span class="avatar" aria-hidden="true">${x.grupo ? '<i data-lucide="users"></i>' : iniciales(x.nombre)}</span><span><strong>${escapar(x.nombre)}</strong><small>${escapar(x.institucion)}</small></span>`;
        return `<li>${x.grupo ? `<div class="det__expo">${inner}</div>` : `<a class="det__expo" href="expositores.html#exp-${x.id}">${inner}<i data-lucide="chevron-right"></i></a>`}</li>`;
      }).join('')}</ul>
    </div>
    <div class="hoja__pie">
      <button class="btn ${fav ? 'btn--secondary' : 'btn--primary'}" type="button" data-fav="${c.id}" aria-pressed="${fav}"><i data-lucide="star"></i>${fav ? 'Guardada' : 'Guardar'}</button>
      <button class="btn btn--secondary" type="button" data-ruta="${sala.id}"><i data-lucide="navigation"></i>Cómo llegar</button>
      <button class="btn btn--secondary" type="button" data-ics="${c.id}"><i data-lucide="calendar-plus"></i>Calendario</button>
    </div>`;
  iconos();
  const dlg = $('#detalle');
  if (!dlg.open) dlg.showModal();
}

// ---------- Guardar (con «Deshacer») ----------
function alternarFav(id, { silencioso = false } = {}) {
  const agregado = MiAgenda.alternar(id);
  render();
  if ($('#detalle').open) abrirDetalle(id);
  if (silencioso) return;
  const c = CONGRESO.charlas.find((x) => x.id === id);
  const cruces = agregado ? crucesDe(c) : [];
  const msg = cruces.length ? `Guardada. Se cruza con «${cruces[0].titulo}»` : agregado ? 'Guardada en Mi agenda' : 'Quitada de Mi agenda';
  avisar(msg, { accion: 'Deshacer', alHacer: () => alternarFav(id, { silencioso: true }) });
}

// ---------- Exportar (.ics) ----------
function descargarIcs(lista, nombre) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  const sello = f(new Date());
  const eventos = lista.map((c) => {
    const expos = c.exp.map((id) => { const x = expositorDe(id); return `${x.nombre} (${x.institucion})`; }).join(', ');
    return ['BEGIN:VEVENT', `UID:csiu-xi-${c.id}@csiu`, `DTSTAMP:${sello}`, `DTSTART:${f(instante(c, c.ini))}`, `DTEND:${f(instante(c, c.fin))}`,
      `SUMMARY:${esc(`${tipoDe(c.tipo).nombre}: ${c.titulo}`)}`, `LOCATION:${esc(`${textoLugar(salaDe(c.sala))}, ${ev.lugar}`)}`,
      `DESCRIPTION:${esc(`${ev.corto}\nExpositor: ${expos}`)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Empieza en 15 minutos', 'END:VALARM', 'END:VEVENT'].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CSIU//Agenda//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...eventos, 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avisar(lista.length > 1 ? `${lista.length} actividades listas para tu calendario` : 'Actividad lista para tu calendario');
}

// ---------- Eventos ----------
function actualizarUrl() {
  const u = new URL(location);
  u.searchParams.set('dia', estado.dia);
  estado.soloMias ? u.searchParams.set('mias', '1') : u.searchParams.delete('mias');
  u.searchParams.delete('charla'); u.searchParams.delete('area');
  history.replaceState(null, '', u);
}
function limpiar() {
  Object.assign(estado, { q: '', area: '', lugar: '', tipo: '' });
  $('#q').value = ''; $('#fLugar').value = ''; $('#fTipo').value = ''; $('#fArea').value = '';
  render();
}

$('#dias').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dia]');
  if (!b) return;
  estado.dia = +b.dataset.dia;
  if (estado.simulado) estado.simulado = instante({ dia: estado.dia }, '11:40');
  actualizarUrl(); render();
});
$('#dias').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  estado.dia = Math.min(ev.dias.length, Math.max(1, estado.dia + (e.key === 'ArrowRight' ? 1 : -1)));
  actualizarUrl(); render(); $(`[data-dia="${estado.dia}"]`).focus();
});
let tq;
$('#q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { estado.q = e.target.value; render(); }, 150); });
$('#fLugar').addEventListener('change', (e) => { estado.lugar = e.target.value; render(); });
$('#fTipo').addEventListener('change', (e) => { estado.tipo = e.target.value; render(); });
$('#fArea').addEventListener('change', (e) => { estado.area = e.target.value; render(); });
$('#fMias').addEventListener('click', () => { estado.soloMias = !estado.soloMias; actualizarUrl(); render(); });
$('#btnLimpiar').addEventListener('click', limpiar);
$$('.vista button').forEach((b) => b.addEventListener('click', () => { estado.vista = b.dataset.vista; almacen.set('csiu.vista', estado.vista); render(); }));
$('#btnVivo').addEventListener('click', () => {
  estado.simulado = estado.simulado ? null : instante({ dia: estado.dia }, '11:40');
  avisar(estado.simulado ? `Simulando el día ${estado.dia} a las 11:40` : 'Mostrando la hora real');
  render();
  if (estado.simulado) $('.is-live')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
});
$('#btnIcs').addEventListener('click', () => {
  const mias = MiAgenda.ids();
  descargarIcs(CONGRESO.charlas.filter((c) => mias.has(c.id)), 'csiu-xi-mi-agenda.ics');
});

// La pestaña «Mi agenda» de la barra inferior cambia de modo sin recargar
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tabbar [data-sec="mias"], .tabbar [data-sec="agenda"]');
  if (tab) {
    e.preventDefault();
    estado.soloMias = tab.dataset.sec === 'mias';
    actualizarUrl(); render(); scrollTo({ top: 0 });
    return;
  }
  const fav = e.target.closest('[data-fav]');
  if (fav) return alternarFav(+fav.dataset.fav);
  const ics = e.target.closest('[data-ics]');
  if (ics) return descargarIcs([CONGRESO.charlas.find((x) => x.id === +ics.dataset.ics)], `csiu-xi-${ics.dataset.ics}.ics`);
  if (e.target.closest('[data-cerrar]')) return $('#detalle').close();
  if (e.target.closest('[data-limpiar]')) return limpiar();
  if (e.target.closest('[data-salir-mias]')) { estado.soloMias = false; actualizarUrl(); return render(); }
  const abrir = e.target.closest('[data-abrir]');
  if (abrir) return abrirDetalle(+abrir.dataset.abrir);
  // Toda la tarjeta abre el detalle (salvo enlaces y botones internos)
  const card = e.target.closest('.tarj');
  if (card && !e.target.closest('a, button')) abrirDetalle(+card.dataset.id);
});
$('#detalle').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

setInterval(() => { if (!estado.simulado) render(); }, 60000);

prepararFiltros();
render();
if (params.get('charla')) abrirDetalle(+params.get('charla'));
