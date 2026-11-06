// =====================================================================
//  Ruta interactiva sobre un plano propio del campus (sin Google Maps)
//  - El camino se dibuja desde la calle hasta la puerta del edificio
//  - En edificios altos, una columna de pisos «sube» hasta el destino
//  - Los pasos se pueden tocar, avanzar, retroceder o repetir
//  - Tocar otro edificio del plano cambia el destino
//  Uso: Ruta.abrir('volcanes') · Ruta.montar(elemento, 'lab107', { alElegir })
//  Cualquier elemento con data-ruta="idSala" abre la ruta.
// =====================================================================
const Ruta = (() => {
  const C = () => CONGRESO.campus;
  const edificioDe = (id) => C().edificios.find((e) => e.id === id);
  const salaDeEdificio = (id) => CONGRESO.salas.find((s) => s.edificio === id);
  const CALLE_Y = 426;

  function pasosDe(sala) {
    if (sala.pasos?.length) return sala.pasos;
    const ed = edificioDe(sala.edificio);
    const p = [
      { t: 'Entra al campus', d: `Ingresa por la puerta principal, en la ${C().calle}.`, i: 'door-open' },
      { t: `Ve a ${ed ? ed.nombre : 'tu edificio'}`, d: 'Sigue el camino central y gira hacia el edificio marcado.', i: 'footprints' },
    ];
    if (sala.nivel > 0) p.push({ t: `Sube al ${sala.piso || `piso ${sala.nivel}`}`, d: 'Usa el ascensor o las gradas.', i: 'arrow-up-down' });
    p.push({ t: 'Llegaste', d: `Busca la señalización de «${sala.nombre}».`, i: 'map-pin-check' });
    return p;
  }

  function geometria(ed) {
    const [ex, ey] = C().entrada;
    const pts = [[ex, CALLE_Y], [ex, ey], ed.cruce, ed.puerta];
    const acum = [0];
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { d: 'M' + pts.map((p) => p.join(' ')).join(' L'), entrada: acum[1], total: acum.at(-1) };
  }

  // Etapas del recorrido; cada paso se asigna a una etapa
  function etapas(sala, geo) {
    const e = [{ L: geo.entrada }, { L: geo.total }];
    if (sala.nivel > 0) e.push({ L: geo.total, piso: true });
    e.push({ L: geo.total, piso: true, fin: true });
    return e;
  }

  function lineas(txt, max = 12) {
    const out = [];
    for (const w of txt.split(' ')) {
      if (out.length && (out.at(-1) + ' ' + w).length <= max) out[out.length - 1] += ' ' + w;
      else out.push(w);
    }
    return out;
  }

  function svgPlano(sala, geo) {
    const c = C();
    const destino = edificioDe(sala.edificio);
    const arboles = [[44, 312, 10], [66, 336, 13], [42, 364, 9], [300, 316, 12], [322, 344, 10], [296, 370, 9], [118, 360, 8], [244, 352, 8]]
      .map(([x, y, r]) => `<circle class="m-arbol" cx="${x}" cy="${y}" r="${r}"/>`).join('');
    const sendas = `M${c.entrada[0]} ${c.entrada[1] + 4} V100 ` + c.edificios.map((e) => `M${e.cruce.join(' ')} L${e.puerta.join(' ')}`).join(' ');

    const edificios = c.edificios.map((e) => {
      const s = salaDeEdificio(e.id);
      const esDest = e.id === destino.id;
      const nom = lineas(e.nombre);
      const tx = e.x + 12;
      let txt = nom.map((l, i) => `<text class="m-edif-nom" x="${tx}" y="${e.y + 20 + i * 13}">${escapar(l)}</text>`).join('');
      if (s && s.nombre !== e.nombre) {
        txt += lineas(s.corto, 12).map((l, i) => `<text class="m-edif-sala" x="${tx}" y="${e.y + 22 + nom.length * 13 + i * 12}">${escapar(l)}</text>`).join('');
      }
      let pisos = '';
      if (esDest && e.pisos > 1) {
        const bh = (e.h - 20) / e.pisos;
        for (let k = 0; k < e.pisos; k++) {
          const y = e.y + e.h - 10 - (k + 1) * bh;
          pisos += `<rect class="m-piso${k === sala.nivel ? ' is-dest' : ''}" data-k="${k}" x="${e.x + e.w - 24}" y="${y + 1}" width="14" height="${bh - 2}" rx="2"/>`;
        }
        const yDest = e.y + e.h - 10 - (sala.nivel + .5) * bh;
        pisos += `<text class="m-piso-txt" x="${e.x + e.w - 17}" y="${yDest + 3.5}">${sala.nivel === 0 ? 'PB' : sala.nivel}</text>`;
      }
      const etiqueta = s ? `${e.nombre}: ${s.nombre}${s.piso ? `, ${s.piso}` : ''}` : e.nombre;
      const puertaX = e.puerta[0] > e.x + e.w / 2 ? e.puerta[0] - 3 : e.puerta[0];
      return `<g class="m-edif${esDest ? ' is-dest' : ''}" data-edif="${e.id}" ${s ? `tabindex="0" role="button" aria-label="Ver ruta a ${escapar(etiqueta)}"` : ''}>
        <rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="10"/>${txt}${pisos}
        <rect class="m-puerta" x="${puertaX}" y="${e.puerta[1] - 7}" width="3" height="14" rx="1.5"/>
      </g>`;
    }).join('');

    const [px, py] = destino.puerta;
    return `<svg class="mapa" viewBox="0 0 360 440" role="img" aria-label="Plano referencial del campus con la ruta hasta ${escapar(sala.nombre)}">
      <rect class="m-calle" x="0" y="406" width="360" height="34"/>
      <text class="m-calle-txt" x="264" y="${CALLE_Y + 4}">${escapar(c.calle)}</text>
      <rect class="m-campus" x="10" y="10" width="340" height="394" rx="18"/>
      ${arboles}
      <path class="m-senda" d="${sendas}"/>
      <circle class="m-plaza" cx="${c.entrada[0]}" cy="322" r="24"/>
      <rect class="m-acceso" x="${c.entrada[0] - 18}" y="400" width="36" height="8" rx="3"/>
      <text class="m-mini" x="${c.entrada[0] - 26}" y="396">Entrada</text>
      <g class="m-norte" transform="translate(180 30)" aria-hidden="true"><path d="M0 -9 L5 5 L0 2 L-5 5 Z"/><text y="18">N</text></g>
      ${edificios}
      <path class="m-ruta-base" d="${geo.d}"/>
      <path class="m-ruta" d="${geo.d}" style="stroke-dasharray:${geo.total};stroke-dashoffset:${geo.total}"/>
      <g class="m-pin" transform="translate(${px} ${py})"><circle r="9"/><circle class="m-pin__in" r="3.5"/></g>
      <g class="m-yo" transform="translate(${c.entrada[0]} ${CALLE_Y})"><circle r="8"/></g>
    </svg>`;
  }

  function montar(contenedor, salaId, { enDialogo = false, alElegir } = {}) {
    const sala = salaDe(salaId);
    const ed = sala && edificioDe(sala.edificio);
    if (!sala || !ed) return;
    contenedor._ruta?.destruir();
    const pasos = pasosDe(sala);
    const geo = geometria(ed);
    const ets = etapas(sala, geo);
    const n = CONGRESO.charlas.filter((c) => c.sala === sala.id).length;

    contenedor.innerHTML = `<div class="ruta">
      ${enDialogo ? `<div class="hoja__cab"><h2 id="rutaTit">Cómo llegar</h2><button class="cerrar" type="button" data-cerrar-ruta aria-label="Cerrar"><i data-lucide="x"></i></button></div>` : ''}
      <div class="ruta__cuerpo">
        <header class="ruta__dest">
          <span class="ruta__ico"><i data-lucide="map-pin"></i></span>
          <div><h3>${escapar(sala.nombre)}</h3><p>${escapar([ed.nombre, sala.piso || (sala.nivel === 0 ? 'Planta baja' : '')].filter(Boolean).join(' · '))}${n ? ` · ${n} ${n === 1 ? 'actividad' : 'actividades'}` : ''}</p></div>
        </header>
        <div class="ruta__grid">
          <figure class="ruta__plano">
            ${svgPlano(sala, geo)}
            <figcaption>Plano referencial · toca un edificio para ver su ruta</figcaption>
          </figure>
          <div class="ruta__lado">
            <ol class="ruta__pasos">${pasos.map((p, i) => `<li><button type="button" data-paso="${i}">
              <span class="ruta__num" aria-hidden="true">${i + 1}</span>
              <span class="ruta__txt"><strong>${escapar(p.t)}</strong><small>${escapar(p.d)}</small></span></button></li>`).join('')}</ol>
            <div class="ruta__ctrl">
              <button type="button" class="btn btn--secondary btn--icon" data-accion="ant" aria-label="Paso anterior"><i data-lucide="chevron-left"></i></button>
              <span class="ruta__estado" aria-live="polite"></span>
              <button type="button" class="btn btn--secondary btn--icon" data-accion="sig" aria-label="Paso siguiente"><i data-lucide="chevron-right"></i></button>
              <button type="button" class="btn btn--ghost btn--sm" data-accion="play"><i data-lucide="rotate-ccw"></i>Repetir</button>
            </div>
            <a class="link ruta__ext" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(C().mapaBusqueda)}" target="_blank" rel="noopener">
              ¿Vienes de otra parte de la ciudad? Abrir en Google Maps <i data-lucide="external-link"></i><span class="sr-only">(se abre en otra pestaña)</span></a>
          </div>
        </div>
      </div>
    </div>`;
    iconos();

    const raiz = $('.ruta', contenedor);
    const prog = $('.m-ruta', raiz), yo = $('.m-yo', raiz);
    const items = $$('[data-paso]', raiz);
    const barras = $$('.m-piso', raiz).sort((a, b) => a.dataset.k - b.dataset.k);
    const estado = $('.ruta__estado', raiz);
    const etapaDe = (i) => ets[Math.round((i * (ets.length - 1)) / Math.max(pasos.length - 1, 1))];

    let actual = -1, L = 0, anim, auto, tPisos;

    function dibujar(len) {
      prog.style.strokeDashoffset = geo.total - len;
      const p = prog.getPointAtLength(len);
      yo.setAttribute('transform', `translate(${p.x} ${p.y})`);
    }

    function pisos(subir) {
      clearInterval(tPisos);
      barras.forEach((b) => b.classList.remove('is-on'));
      if (!subir || !barras.length) return;
      let k = 0;
      const pintar = () => { barras[k]?.classList.add('is-on'); k++; if (k > sala.nivel) clearInterval(tPisos); };
      if (reduceMotion) { while (k <= sala.nivel) pintar(); return; }
      pintar();
      tPisos = setInterval(pintar, 110);
    }

    function irA(i, { manual = true } = {}) {
      if (manual) pararAuto();
      i = Math.max(0, Math.min(pasos.length - 1, i));
      const antes = actual;
      actual = i;
      const et = etapaDe(i);
      items.forEach((b, k) => {
        b.classList.toggle('is-on', k === i);
        b.classList.toggle('is-ok', k < i);
        k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current');
      });
      estado.textContent = `Paso ${i + 1} de ${pasos.length}`;
      raiz.classList.toggle('is-fin', !!et.fin);
      if (et.piso && !(antes >= 0 && etapaDe(antes).piso)) pisos(true);
      if (!et.piso) pisos(false);
      const desde = L, hasta = et.L;
      cancelAnimationFrame(anim);
      if (reduceMotion || desde === hasta) { L = hasta; dibujar(L); return; }
      const dur = Math.min(1400, Math.max(450, Math.abs(hasta - desde) * 3.2));
      const t0 = performance.now();
      const paso = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        L = desde + (hasta - desde) * e;
        dibujar(L);
        if (k < 1) anim = requestAnimationFrame(paso);
      };
      anim = requestAnimationFrame(paso);
    }

    function pararAuto() { clearTimeout(auto); auto = null; }
    function reproducir() {
      pararAuto();
      L = 0; dibujar(0); actual = -1; pisos(false);
      const sig = () => {
        irA(actual + 1, { manual: false });
        if (actual < pasos.length - 1) auto = setTimeout(sig, 1500);
      };
      auto = setTimeout(sig, 250);
    }

    function elegir(edId) {
      const s = salaDeEdificio(edId);
      if (!s || s.id === sala.id) return;
      alElegir ? alElegir(s.id) : montar(contenedor, s.id, { enDialogo, alElegir });
    }
    raiz.addEventListener('click', (e) => {
      const b = e.target.closest('[data-paso]');
      if (b) return irA(+b.dataset.paso);
      const a = e.target.closest('[data-accion]')?.dataset.accion;
      if (a === 'ant') return irA(actual - 1);
      if (a === 'sig') return irA(actual + 1);
      if (a === 'play') return reproducir();
      const edEl = e.target.closest('.m-edif[role="button"]');
      if (edEl) elegir(edEl.dataset.edif);
    });
    raiz.addEventListener('keydown', (e) => {
      const edEl = e.target.closest?.('.m-edif[role="button"]');
      if (edEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); elegir(edEl.dataset.edif); }
    });

    dibujar(0);
    reduceMotion ? irA(pasos.length - 1, { manual: false }) : reproducir();
    const ctrl = { destruir() { pararAuto(); cancelAnimationFrame(anim); clearInterval(tPisos); } };
    contenedor._ruta = ctrl;
    return ctrl;
  }

  // ----- Diálogo (hoja inferior en celular) -----
  let dlg;
  function abrir(salaId) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'hoja hoja--ruta';
      dlg.setAttribute('aria-labelledby', 'rutaTit');
      dlg.innerHTML = '<div class="hoja__scroll"></div>';
      document.body.append(dlg);
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-cerrar-ruta]')) dlg.close(); });
      dlg.addEventListener('close', () => $('.hoja__scroll', dlg)._ruta?.destruir());
    }
    if (!dlg.open) dlg.showModal();
    montar($('.hoja__scroll', dlg), salaId, { enDialogo: true });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ruta]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    abrir(b.dataset.ruta);
  }, true);

  return { abrir, montar };
})();
