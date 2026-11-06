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

  const acts = CONGRESO.charlas.filter((c) => c.exp.includes(x.id)).sort((a, b) => a.dia - b.dia || aMin(a.ini) - aMin(b.ini));
  const interesados = acts.reduce((t, c) => t + (MiAgenda.tiene(c.id) ? 1 : 0), 0);
  $('#panel').innerHTML = `
    <section class="saludo card">
      <span class="avatar" aria-hidden="true">${iniciales(x.nombre)}</span>
      <div><h2>${escapar(x.nombre)}</h2><p>${escapar(x.institucion)} · ${acts.length} ${acts.length === 1 ? 'actividad' : 'actividades'}</p></div>
    </section>

    <div class="sec__head"><h2>Mis actividades</h2></div>
    <div class="mis-acts">${acts.map((c) => {
      const sala = salaDe(c.sala), ar = areaDe(c.area);
      return `<article class="card mi-act mi-act--img">
        <div class="mi-act__img">${Portadas.svg(c)}</div>
        <p class="mi-act__cuando"><span class="falta">${faltaTexto(c)}</span><span>·</span><span>${mayus(fmtLargo.format(fechaDia(c.dia)))}, ${c.ini} – ${c.fin}</span></p>
        <p class="mi-act__cuando"><span>${tipoDe(c.tipo).nombre}</span><span class="tema" style="--c:${ar.color}"><i data-lucide="${ar.icono}"></i>${ar.nombre}</span>${c.turno ? `<span>Turno ${c.turno}</span>` : ''}</p>
        <h3>${escapar(c.titulo)}</h3>
        <button type="button" class="link" data-ruta="${sala.id}"><i data-lucide="map-pin"></i>${escapar(textoLugar(sala))}</button>
        <div class="mi-act__acc">
          <button class="btn btn--primary btn--sm" type="button" data-semaforo="${c.id}"><i data-lucide="timer"></i>Semáforo de tiempo</button>
          <a class="btn btn--secondary btn--sm" href="agenda.html?dia=${c.dia}&charla=${c.id}">Ver en la agenda</a>
        </div>
      </article>`;
    }).join('') || '<p class="vacio">Aún no tienes actividades asignadas. El comité organizador las registrará.</p>'}</div>

    <div class="sec__head"><h2>Certificado de ponente</h2></div>
    <section class="card mi-act">
      <p>Descárgalo para tu portafolio. Incluye tus actividades en el congreso y un código de verificación.</p>
      <div class="mi-act__acc"><button class="btn btn--secondary" type="button" data-certificado><i data-lucide="award"></i>Ver certificado</button></div>
    </section>
    ${interesados ? `<p class="grafico__nota" style="margin-top:12px">En este dispositivo, ${interesados} de tus actividades están guardadas en «Mi agenda».</p>` : ''}`;
  iconos();
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
