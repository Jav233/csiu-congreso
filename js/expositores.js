// =====================================================================
//  Expositores: quién es, de qué institución viene, qué presenta y dónde
// =====================================================================
const esLocal = (x) => /PUCESA|PUCE|alumni/i.test(x.institucion);
const estado = { q: '', origen: '' };

// Actividades de un expositor (los turnos del mismo taller se juntan)
function actividadesDe(id) {
  const grupos = new Map();
  for (const c of CONGRESO.charlas.filter((c) => c.exp.includes(id))) {
    const k = `${c.dia}|${c.titulo}|${c.sala}`;
    if (!grupos.has(k)) grupos.set(k, { ...c, turnos: [] });
    grupos.get(k).turnos.push(c);
  }
  return [...grupos.values()].sort((a, b) => a.dia - b.dia || aMin(a.ini) - aMin(b.ini));
}
const horario = (a) => {
  const ini = a.turnos[0].ini, fin = a.turnos.at(-1).fin;
  return a.turnos.length > 1 ? `${ini} – ${fin} (${a.turnos.length} turnos)` : `${ini} – ${fin}`;
};

function tarjeta(x) {
  const acts = actividadesDe(x.id);
  const color = areaDe(acts[0]?.area).color;
  return `<article class="xp card" id="exp-${x.id}" tabindex="-1" style="--c:${color}">
    <div class="xp__portada">${Portadas.svg(acts[0])}</div>
    <header class="xp__cab">
      <span class="avatar xp__avatar" aria-hidden="true">${iniciales(x.nombre)}</span>
      <div class="xp__id">
        <h2>${escapar(x.nombre)}</h2>
        <p>${escapar(x.institucion)}</p>
      </div>
      ${esLocal(x) ? '' : '<span class="tag">Invitado</span>'}
    </header>
    <ul class="xp__acts">${acts.map((a) => {
      const ar = areaDe(a.area), sala = salaDe(a.sala);
      return `<li class="xp__act">
        <span class="xp__thumb" aria-hidden="true">${Portadas.svg(a)}</span>
        <div class="xp__act-info">
          <p class="xp__cuando"><span>${diaCorto(a.dia)} · ${horario(a)}</span><span>·</span><span>${tipoDe(a.tipo).nombre}</span><span class="tema" style="--c:${ar.color}"><i data-lucide="${ar.icono}"></i>${ar.nombre}</span></p>
          <a class="xp__tit" href="agenda.html?dia=${a.dia}&charla=${a.id}">${escapar(a.titulo)}</a>
          <button type="button" class="link xp__lugar" data-ruta="${sala.id}"><i data-lucide="map-pin"></i>${escapar(textoLugar(sala))}</button>
        </div>
      </li>`;
    }).join('')}</ul>
  </article>`;
}

function coincide(x) {
  if (estado.origen === 'invitados' && esLocal(x)) return false;
  if (estado.origen === 'pucesa' && !esLocal(x)) return false;
  const q = estado.q.trim().toLowerCase();
  if (!q) return true;
  const texto = [x.nombre, x.institucion, ...actividadesDe(x.id).map((a) => `${a.titulo} ${areaDe(a.area).nombre} ${salaDe(a.sala).nombre}`)].join(' ').toLowerCase();
  return q.split(/\s+/).every((p) => texto.includes(p));
}

function render() {
  const lista = CONGRESO.expositores.filter((x) => !x.grupo && coincide(x));
  $('#xps').innerHTML = lista.map(tarjeta).join('');
  $('#vacio').hidden = lista.length > 0;
  $$('#fOrigen [data-origen]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.origen === estado.origen)));

  const grupos = CONGRESO.expositores.filter((x) => x.grupo && coincide(x));
  $('#grupos').innerHTML = grupos.length ? `<h2>También participan</h2><ul class="filas-xp card">${grupos.map((x) => {
    const acts = actividadesDe(x.id);
    return `<li><span class="filas-xp__thumb" aria-hidden="true">${Portadas.svg(acts[0])}</span>
      <span><strong>${escapar(x.nombre)}</strong><small>${acts.map((a) => `${escapar(a.titulo)} · ${diaCorto(a.dia)}, ${a.ini}`).join('<br>')}</small></span></li>`;
  }).join('')}</ul>` : '';
  iconos();
}

// Cifras
{
  const personas = CONGRESO.expositores.filter((x) => !x.grupo);
  const inst = new Set(personas.map((x) => x.institucion)).size;
  const inv = personas.filter((x) => !esLocal(x)).length;
  $('#cifras').textContent = `${personas.length} expositores · ${inst} instituciones · ${inv} invitados externos`;
}

let tq;
$('#q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { estado.q = e.target.value; render(); }, 150); });
$('#fOrigen').addEventListener('click', (e) => {
  const b = e.target.closest('[data-origen]');
  if (b) { estado.origen = b.dataset.origen; render(); }
});

render();

// Si se llega con #exp-ID, llevar el foco a esa tarjeta
if (location.hash.startsWith('#exp-')) {
  const t = $(location.hash);
  if (t) { t.classList.add('is-foco'); t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); }
}

// Autocompletado: elegir una sugerencia lleva directo a la tarjeta del expositor
Autocompletar($('#q'), {
  elementos: () => elementosExpositores(),
  alElegir: (item) => {
    estado.q = ''; $('#q').value = ''; render();
    const t = $(`#exp-${item.id}`);
    if (!t) return;
    $$('.xp.is-foco').forEach((x) => x.classList.remove('is-foco'));
    t.classList.add('is-foco');
    t.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    t.focus({ preventScroll: true });
  },
  vacio: 'Sin coincidencias. Prueba con un apellido, una institución o un tema.',
});
