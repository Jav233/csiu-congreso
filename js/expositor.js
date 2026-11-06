// =====================================================================
//  Panel del expositor: acceso por código, sus actividades,
//  semáforo de tiempo a pantalla completa y certificado de ponente.
// =====================================================================
const fmtLargo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
const PRUEBA = 'EXP-1009';

function expositorPorCodigo(cod) {
  return CONGRESO.expositores.find((x) => x.codigo && x.codigo === String(cod).trim().toUpperCase());
}

// ---------- Ingreso: buscarse (opcional) + código (obligatorio) ----------
let elegido = null; // expositor elegido en el buscador

function errorAcceso(msg) {
  const e = $('#errAcceso'); e.textContent = msg; e.hidden = false;
  $('#codigoExp').setAttribute('aria-invalid', 'true'); $('#codigoExp').focus();
}

// Elegir a la persona completa todo lo demás: su tarjeta y su código.
// { desdeCodigo: true } cuando la persona se reconoce al escribir el código.
function elegir(x, { desdeCodigo = false } = {}) {
  elegido = x;
  $('#elegidoAv').textContent = iniciales(x.nombre);
  $('#elegidoNom').textContent = x.nombre;
  $('#elegidoInst').textContent = x.institucion;
  $('#elegido').hidden = false;
  $('#pasoBuscar').hidden = true;
  $('#lblCodigo').firstChild.textContent = 'Tu código de acceso ';
  $('#errAcceso').hidden = true;
  $('#codigoExp').removeAttribute('aria-invalid');
  if (!desdeCodigo) $('#codigoExp').value = x.codigo;
  $('#estadoAcceso').textContent = `${x.nombre} — ${x.institucion}. Código completado. Pulsa Entrar.`;
  if (!desdeCodigo) $('#btnEntrar').focus();
}

function cambiar() {
  elegido = null;
  $('#elegido').hidden = true;
  $('#pasoBuscar').hidden = false;
  $('#lblCodigo').firstChild.textContent = 'Código de acceso ';
  $('#codigoExp').value = '';
  $('#buscaExp').value = '';
  $('#buscaExp').focus();
}

// Escribir el código también reconoce a la persona (sin tener que buscarla)
$('#codigoExp').addEventListener('input', (e) => {
  const x = expositorPorCodigo(e.target.value);
  if (x && elegido?.id !== x.id) elegir(x, { desdeCodigo: true });
  else if (!x && elegido && e.target.value.trim().length >= 8) { // código completo pero no coincide
    elegido = null; $('#elegido').hidden = true; $('#pasoBuscar').hidden = false;
  }
});
// Si escriben el código en el buscador, se reconoce igual
$('#buscaExp').addEventListener('input', (e) => {
  const x = expositorPorCodigo(e.target.value);
  if (x) { $('#codigoExp').value = x.codigo; elegir(x); }
});

function entrar(cod) {
  const limpio = String(cod).trim().toUpperCase();
  if (!limpio) return errorAcceso(elegido ? 'Escribe tu código de acceso para continuar.' : 'Busca tu nombre o escribe tu código de acceso.');
  const x = expositorPorCodigo(limpio);
  if (!x) return errorAcceso('No encontramos ese código. Revisa que esté bien escrito (por ejemplo, EXP-1009).');
  // Si eligió a una persona, el código debe ser de esa persona
  if (elegido && x.id !== elegido.id) return errorAcceso(`Ese código no corresponde a ${elegido.nombre.replace(/\.$/, '')}. Revisa el correo del comité organizador.`);
  $('#codigoExp').removeAttribute('aria-invalid');
  Sesion.set('expositor', { id: x.id });
  mostrar();
  avisar(`Hola, ${x.nombre}`);
}

Autocompletar($('#buscaExp'), {
  elementos: () => elementosExpositores({ soloConCodigo: true }),
  alElegir: (item) => elegir(CONGRESO.expositores.find((x) => x.id === item.id)),
  vacio: 'No encontramos a nadie con esa búsqueda. Prueba con tu apellido o una palabra de tu exposición.',
});
$('#btnCambiar').addEventListener('click', cambiar);
$('#formAcceso').addEventListener('submit', (e) => { e.preventDefault(); entrar($('#codigoExp').value); });
$('#btnSalir').addEventListener('click', () => { Sesion.salir('expositor'); mostrar(); avisar('Sesión cerrada'); });

function faltaTexto(c) {
  const ms = instante(c, c.ini) - new Date();
  if (instante(c, c.fin) < new Date()) return 'Finalizada';
  if (ms <= 0) return 'En curso';
  const d = Math.floor(ms / 86400000);
  if (d >= 1) return `Faltan ${d} ${d === 1 ? 'día' : 'días'}`;
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h ? `Faltan ${h} h ${m} min` : `Faltan ${m} min`;
}

function mostrar() {
  const s = Sesion.get('expositor');
  const x = s && CONGRESO.expositores.find((e) => e.id === s.id);
  $('#acceso').hidden = !!x;
  $('#panel').hidden = !x;
  $('#btnSalir').hidden = !x;
  if (!x) { iconos(); return; }

  const acts = CONGRESO.charlas.filter((c) => c.exp.includes(x.id) && !esReceso(c)).sort((a, b) => a.dia - b.dia || aMin(a.ini) - aMin(b.ini));
  const unicas = acts.filter((c, i) => acts.findIndex((o) => o.titulo === c.titulo) === i);
  const dias = new Set(acts.map((c) => c.dia)).size;
  const minutos = acts.reduce((t, c) => t + aMin(c.fin) - aMin(c.ini), 0);
  const proxima = acts.find((c) => instante(c, c.fin) > new Date());
  const ar0 = areaDe(acts[0]?.area);
  const fmtMesCorto = new Intl.DateTimeFormat('es-EC', { month: 'short' });
  const fmtSem = new Intl.DateTimeFormat('es-EC', { weekday: 'long' });
  const checklist = almacen.get(`csiu.prep.${x.id}`, {});
  const TAREAS = [
    ['presentacion', 'Tengo mi presentación lista (PDF o PPT de respaldo)'],
    ['llegar', 'Llegaré 15 minutos antes al lugar'],
    ['equipo', 'Revisé proyector, micrófono y adaptadores'],
    ['tiempo', 'Ensayé con el semáforo de tiempo'],
    ['preguntas', 'Preparé 2 o 3 preguntas para abrir el diálogo'],
  ];
  const hechas = TAREAS.filter(([k]) => checklist[k]).length;

  $('#panel').innerHTML = `
    <section class="perfil" style="--c:${ar0.color}">
      <div class="perfil__banda" aria-hidden="true"></div>
      <div class="perfil__cuerpo">
        <span class="perfil__avatar" aria-hidden="true">${iniciales(x.nombre)}</span>
        <div class="perfil__id">
          <h2>${escapar(x.nombre)}</h2>
          <p><i data-lucide="landmark"></i>${escapar(x.institucion)}</p>
        </div>
        <ul class="perfil__cifras">
          <li><strong>${unicas.length}</strong><span>${unicas.length === 1 ? 'ponencia' : 'ponencias'}</span></li>
          <li><strong>${dias}</strong><span>${dias === 1 ? 'día' : 'días'}</span></li>
          <li><strong>${minutos >= 60 ? `${+(minutos / 60).toFixed(1)} h` : `${minutos} min`}</strong><span>en escena</span></li>
        </ul>
      </div>
      ${proxima ? `<div class="perfil__prox" id="cuentaProx" data-id="${proxima.id}" aria-live="off">
        <span class="perfil__prox-lbl"><i data-lucide="hourglass"></i>Tu próxima ponencia empieza en</span>
        <div class="cuenta-reg"><span><b data-u="d">0</b>días</span><span><b data-u="h">0</b>horas</span><span><b data-u="m">0</b>min</span></div>
      </div>` : ''}
    </section>

    <div class="exp-grid">
      <div class="exp-main">
        <div class="sec__head"><h2>Mis ponencias</h2><span class="muted">${acts.length} ${acts.length === 1 ? 'sesión' : 'sesiones'}</span></div>
        <div class="pon-lista">${acts.map((c) => {
          const sala = salaDe(c.sala), ar = areaDe(c.area), f = fechaDia(c.dia), dur = aMin(c.fin) - aMin(c.ini);
          const estado = faltaTexto(c);
          return `<article class="pon" style="--c:${ar.color}">
            <div class="pon__img">${Portadas.svg(c)}
              <span class="pon__fecha"><b>${f.getDate()}</b><small>${fmtMesCorto.format(f).replace('.', '')}</small></span>
              <span class="pon__estado${estado === 'En curso' ? ' pon__estado--vivo' : ''}">${estado}</span>
            </div>
            <div class="pon__cuerpo">
              <p class="pon__meta"><span>${tipoDe(c.tipo).nombre}${c.turno ? ` · Turno ${c.turno}` : ''}</span><span class="tema" style="--c:${ar.color}"><i data-lucide="${ar.icono}"></i>${ar.nombre}</span></p>
              <h3>${escapar(c.titulo)}</h3>
              <ul class="pon__datos">
                <li><i data-lucide="calendar-days"></i>${mayus(fmtSem.format(f))} ${f.getDate()}</li>
                <li><i data-lucide="clock"></i>${c.ini} – ${c.fin} <span class="muted">(${dur} min)</span></li>
                <li><i data-lucide="map-pin"></i><button type="button" class="link" data-ruta="${sala.id}">${escapar(textoLugar(sala))}</button></li>
              </ul>
              <div class="pon__acc">
                <button class="btn btn--primary btn--sm" type="button" data-semaforo="${c.id}"><i data-lucide="timer"></i>Semáforo</button>
                <button class="btn btn--secondary btn--sm" type="button" data-ruta="${sala.id}"><i data-lucide="navigation"></i>Cómo llegar</button>
                <button class="btn btn--secondary btn--sm" type="button" data-ics="${c.id}"><i data-lucide="calendar-plus"></i>A mi calendario</button>
                <a class="btn btn--ghost btn--sm" href="agenda.html?dia=${c.dia}&charla=${c.id}">Ver en la agenda</a>
              </div>
            </div>
          </article>`;
        }).join('') || '<p class="vacio">Aún no tienes ponencias asignadas. El comité organizador las registrará.</p>'}</div>
      </div>

      <aside class="exp-lado">
        <section class="lado card">
          <div class="lado__tit"><span class="lado__ico"><i data-lucide="award"></i></span><div><h2>Certificado de ponente</h2><p>Con tus ponencias y un código de verificación.</p></div></div>
          <button type="button" class="cert-mini" data-certificado aria-label="Ver tu certificado de ponente">
            <span class="cert-mini__org">PUCE · Sede Ambato</span>
            <span class="cert-mini__tit">Certificado de ponente</span>
            <span class="cert-mini__nom">${escapar(x.nombre)}</span>
            <span class="cert-mini__linea"></span>
          </button>
          <button class="btn btn--primary" type="button" data-certificado><i data-lucide="download"></i>Ver y descargar</button>
        </section>

        <section class="lado card">
          <div class="lado__tit"><span class="lado__ico"><i data-lucide="list-checks"></i></span><div><h2>Antes de tu ponencia</h2><p><span id="prepCuenta">${hechas}</span> de ${TAREAS.length} listas</p></div></div>
          <div class="prep-barra" aria-hidden="true"><span id="prepBarra" style="width:${(hechas / TAREAS.length) * 100}%"></span></div>
          <ul class="prep">${TAREAS.map(([k, t]) => `<li><label class="prep__item">
            <input type="checkbox" data-prep="${k}" ${checklist[k] ? 'checked' : ''}><span class="prep__check" aria-hidden="true"><i data-lucide="check"></i></span><span>${t}</span></label></li>`).join('')}</ul>
        </section>
      </aside>
    </div>`;
  iconos();
  actualizarCuenta();
}

// Cuenta regresiva de la próxima ponencia
let _cuentaTimer;
function actualizarCuenta() {
  clearInterval(_cuentaTimer);
  const box = $('#cuentaProx');
  if (!box) return;
  const c = CONGRESO.charlas.find((o) => o.id === +box.dataset.id);
  const pintar = () => {
    const ms = instante(c, c.ini) - new Date();
    if (ms <= 0) { box.querySelector('.cuenta-reg').innerHTML = '<span class="en-vivo">¡Es ahora!</span>'; clearInterval(_cuentaTimer); return; }
    const v = { d: Math.floor(ms / 86400000), h: Math.floor(ms / 3600000) % 24, m: Math.floor(ms / 60000) % 60 };
    for (const u in v) box.querySelector(`[data-u="${u}"]`).textContent = v[u];
  };
  pintar();
  _cuentaTimer = setInterval(pintar, 30000);
}

// Lista de preparación (se recuerda por expositor)
document.addEventListener('change', (e) => {
  const cb = e.target.closest('[data-prep]');
  if (!cb) return;
  const id = Sesion.get('expositor')?.id;
  const clave = `csiu.prep.${id}`;
  const estado = almacen.get(clave, {});
  estado[cb.dataset.prep] = cb.checked;
  almacen.set(clave, estado);
  const total = $$('[data-prep]').length, hechas = $$('[data-prep]:checked').length;
  $('#prepCuenta').textContent = hechas;
  $('#prepBarra').style.width = `${(hechas / total) * 100}%`;
  if (hechas === total) avisar('¡Todo listo para tu ponencia!');
});

// Añadir una ponencia al calendario del teléfono o computadora (.ics)
function descargarIcs(c) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CSIU//Expositor//ES', 'BEGIN:VEVENT', `UID:csiu-xi-exp-${c.id}@csiu`,
    `DTSTAMP:${f(new Date())}`, `DTSTART:${f(instante(c, c.ini))}`, `DTEND:${f(instante(c, c.fin))}`,
    `SUMMARY:${esc(`Mi ponencia: ${c.titulo}`)}`, `LOCATION:${esc(`${textoLugar(salaDe(c.sala))}, ${CONGRESO.evento.lugar}`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Tu ponencia empieza en 30 minutos', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `mi-ponencia-${c.id}.ics` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avisar('Ponencia lista para tu calendario (con aviso 30 min antes)');
}

// ---------- Semáforo de tiempo ----------
let reloj = null;
function semaforo(c) {
  const total = (aMin(c.fin) - aMin(c.ini)) * 60;
  let restante = total, pausado = false, ultimo = Date.now();
  const capa = document.createElement('div');
  capa.className = 'semaforo';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', 'Semáforo de tiempo');
  capa.innerHTML = `
    <p class="semaforo__tit">${escapar(c.titulo)}</p>
    <p class="semaforo__tiempo" aria-hidden="true">00:00</p>
    <p class="semaforo__msg" role="status" aria-live="polite"></p>
    <div class="semaforo__acc">
      <button class="btn" type="button" data-pausa><i data-lucide="pause"></i><span>Pausar</span></button>
      <button class="btn" type="button" data-reiniciar><i data-lucide="rotate-ccw"></i>Reiniciar</button>
      <button class="btn" type="button" data-salir><i data-lucide="x"></i>Salir</button>
    </div>`;
  document.body.append(capa);
  iconos();
  capa.requestFullscreen?.().catch(() => {});

  let estadoPrevio = '';
  const pintar = () => {
    const ahora = Date.now();
    if (!pausado) restante -= (ahora - ultimo) / 1000;
    ultimo = ahora;
    const r = Math.round(restante), abs = Math.abs(r);
    $('.semaforo__tiempo', capa).textContent = `${r < 0 ? '+' : ''}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
    const estado = r <= 0 ? 'fin' : r <= 120 ? 'rojo' : r <= 600 ? 'amarillo' : 'verde';
    if (estado !== estadoPrevio) {
      capa.dataset.estado = estado;
      $('.semaforo__msg', capa).textContent = { verde: 'Tiempo suficiente', amarillo: 'Quedan 10 minutos o menos', rojo: 'Ve cerrando: quedan 2 minutos', fin: 'Tiempo cumplido' }[estado];
      estadoPrevio = estado;
    }
  };
  pintar();
  reloj = setInterval(pintar, 250);
  const salir = () => { clearInterval(reloj); document.fullscreenElement && document.exitFullscreen?.(); capa.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') salir(); if (e.key === ' ') { e.preventDefault(); $('[data-pausa]', capa).click(); } };
  document.addEventListener('keydown', tecla);
  capa.addEventListener('click', (e) => {
    if (e.target.closest('[data-salir]')) return salir();
    if (e.target.closest('[data-reiniciar]')) { restante = total; ultimo = Date.now(); estadoPrevio = ''; pintar(); }
    const p = e.target.closest('[data-pausa]');
    if (p) {
      pausado = !pausado; ultimo = Date.now();
      p.innerHTML = pausado ? '<i data-lucide="play"></i><span>Continuar</span>' : '<i data-lucide="pause"></i><span>Pausar</span>';
      iconos();
    }
  });
  $('[data-pausa]', capa).focus();
}

document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-semaforo]');
  if (s) return semaforo(CONGRESO.charlas.find((c) => c.id === +s.dataset.semaforo));
  const ic = e.target.closest('[data-ics]');
  if (ic) return descargarIcs(CONGRESO.charlas.find((c) => c.id === +ic.dataset.ics));
  if (e.target.closest('[data-certificado]')) {
    const x = CONGRESO.expositores.find((y) => y.id === Sesion.get('expositor').id);
    const acts = [...new Map(CONGRESO.charlas.filter((c) => c.exp.includes(x.id)).map((c) => [c.titulo, c])).values()];
    Certificado.mostrar({
      titulo: 'Certificado de ponente',
      nombre: x.nombre,
      detalle: `En representación de <strong>${escapar(x.institucion)}</strong>, por su participación como expositor/a con: ${acts.map((c) => `«${escapar(c.titulo)}» (${tipoDe(c.tipo).nombre.toLowerCase()})`).join('; ')}.`,
      codigo: `${x.codigo}-XI`,
    });
  }
});

// «Probar acceso» desde el panel del organizador: expositor.html?codigo=EXP-1009
// Deja elegida a la persona y su código escrito; falta solo tocar «Entrar».
{
  const pedido = new URLSearchParams(location.search).get('codigo');
  const x = pedido && expositorPorCodigo(pedido);
  if (x) {
    if (Sesion.get('expositor')?.id !== x.id) Sesion.salir('expositor');
    if (!Sesion.get('expositor')) {
      elegir(x);
      $('#codigoExp').value = x.codigo;
      avisar(`Acceso de ${x.nombre} listo. Toca «Entrar».`, { ms: 4000 });
    }
  }
}

mostrar();
