// =====================================================================
//  Autocompletado accesible con índice (patrón ARIA «combobox»)
//  - El índice se arma una vez: textos sin tildes ni mayúsculas, por campo
//  - Cada palabra escrita debe coincidir; puntúa más el inicio de palabra
//    y los campos con más peso (p. ej. nombre > actividad > institución)
//  - Teclado: ↑ ↓ para moverse, Enter para elegir, Escape para cerrar
//
//  Uso:
//    Autocompletar(input, {
//      elementos: () => [{ id, titulo, sub, avatar, campos: [{ texto, peso, etiqueta }] }],
//      alElegir: (elemento) => {...},
//      max: 6,
//    })
// =====================================================================
function Autocompletar(input, { elementos, alElegir, max = 6, vacio = 'Sin coincidencias' }) {
  const norm = (s) => [...String(s || '')].map((ch) => normal(ch) || ' ').join('');
  let indice = [];
  const indexar = () => {
    indice = elementos().map((e) => ({
      e,
      campos: e.campos.map((c) => ({ ...c, n: norm(c.texto), palabras: norm(c.texto).split(/[^a-z0-9]+/).filter(Boolean) })),
    }));
  };
  indexar();

  // Estructura ARIA
  const id = input.id || `ac${Math.random().toString(36).slice(2, 7)}`;
  input.id = id;
  const lista = document.createElement('ul');
  lista.className = 'ac__lista';
  lista.id = `${id}-lista`;
  lista.setAttribute('role', 'listbox');
  lista.hidden = true;
  input.parentElement.classList.add('ac');
  input.parentElement.append(lista);
  Object.entries({ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': lista.id, autocomplete: 'off' })
    .forEach(([k, v]) => input.setAttribute(k, v));
  const estado = document.createElement('p');
  estado.className = 'sr-only';
  estado.setAttribute('aria-live', 'polite');
  input.parentElement.append(estado);

  let resultados = [], activo = -1;

  function buscar(q) {
    const tokens = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
    if (!tokens.length) return [];
    const res = [];
    for (const item of indice) {
      let total = 0, campoTop = null, mejorCampo = 0;
      let ok = true;
      for (const t of tokens) {
        let mejor = 0, cual = null;
        for (const c of item.campos) {
          const p = c.palabras.some((w) => w.startsWith(t)) ? c.peso * 2 : c.n.includes(t) ? c.peso : 0;
          if (p > mejor) { mejor = p; cual = c; }
        }
        if (!mejor) { ok = false; break; }
        total += mejor;
        if (mejor > mejorCampo) { mejorCampo = mejor; campoTop = cual; }
      }
      if (ok) res.push({ ...item, total, campoTop, tokens });
    }
    return res.sort((a, b) => b.total - a.total || a.e.titulo.localeCompare(b.e.titulo)).slice(0, max);
  }

  // Resalta las coincidencias respetando tildes del texto original
  function resaltar(texto, tokens) {
    const n = norm(texto);
    const marcas = new Array(texto.length).fill(false);
    for (const t of tokens) {
      let i = n.indexOf(t);
      while (i !== -1) { for (let k = i; k < i + t.length; k++) marcas[k] = true; i = n.indexOf(t, i + 1); }
    }
    let html = '', abierto = false;
    [...texto].forEach((ch, i) => {
      if (marcas[i] && !abierto) { html += '<mark>'; abierto = true; }
      if (!marcas[i] && abierto) { html += '</mark>'; abierto = false; }
      html += escapar(ch);
    });
    return html + (abierto ? '</mark>' : '');
  }

  // Si la coincidencia está lejos del inicio, muestra el fragmento donde aparece
  function extracto(texto, tokens) {
    const n = norm(texto);
    const pos = Math.min(...tokens.map((t) => n.indexOf(t)).filter((i) => i >= 0));
    if (!isFinite(pos) || pos < 18) return texto;
    const ini = texto.lastIndexOf(' ', pos - 10);
    return '…' + texto.slice(ini > 0 ? ini + 1 : pos - 10);
  }

  function pintar() {
    const q = input.value.trim();
    resultados = q ? buscar(q) : [];
    activo = resultados.length ? 0 : -1;
    if (!q) { cerrar(); return; }
    lista.innerHTML = resultados.length
      ? resultados.map((r, i) => {
          const pista = r.campoTop && r.campoTop.etiqueta
            ? `<small class="ac__pista">${escapar(r.campoTop.etiqueta)}: ${resaltar(extracto(r.campoTop.texto, r.tokens), r.tokens)}</small>` : '';
          return `<li role="option" id="${id}-op${i}" class="ac__op" data-i="${i}" aria-selected="${i === activo}">
            ${r.e.avatar ? `<span class="avatar ac__avatar" aria-hidden="true">${r.e.avatar}</span>` : ''}
            <span class="ac__txt"><strong>${resaltar(r.e.titulo, r.tokens)}</strong>${r.e.sub ? `<small>${resaltar(r.e.sub, r.tokens)}</small>` : ''}${pista}</span>
          </li>`;
        }).join('')
      : `<li class="ac__vacio" role="option" aria-disabled="true">${escapar(vacio)}</li>`;
    lista.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    marcarActivo();
    estado.textContent = resultados.length ? `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}. Usa las flechas para elegir.` : vacio;
  }

  function marcarActivo() {
    $$('.ac__op', lista).forEach((li, i) => li.setAttribute('aria-selected', String(i === activo)));
    const li = $(`#${id}-op${activo}`, lista);
    if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }

  function elegir(i) {
    const r = resultados[i];
    if (!r) return;
    cerrar();
    alElegir(r.e);
  }

  function cerrar() {
    lista.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  input.addEventListener('input', pintar);
  input.addEventListener('focus', () => { if (input.value.trim()) pintar(); });
  input.addEventListener('keydown', (e) => {
    if (lista.hidden && e.key === 'ArrowDown') { pintar(); return; }
    if (lista.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(resultados.length - 1, activo + 1); marcarActivo(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(0, activo - 1); marcarActivo(); }
    else if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); elegir(activo); }
    else if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
  });
  lista.addEventListener('mousedown', (e) => e.preventDefault()); // no perder el foco al tocar
  lista.addEventListener('click', (e) => { const li = e.target.closest('.ac__op'); if (li) elegir(+li.dataset.i); });
  document.addEventListener('click', (e) => { if (!input.parentElement.contains(e.target)) cerrar(); });

  return { reindexar: indexar, cerrar };
}

// Índice estándar de expositores: nombre, actividades e institución
function elementosExpositores({ soloConCodigo = false } = {}) {
  return CONGRESO.expositores
    .filter((x) => !x.grupo && (!soloConCodigo || x.codigo))
    .map((x) => {
      const acts = [...new Set(CONGRESO.charlas.filter((c) => c.exp.includes(x.id)).map((c) => c.titulo))];
      return {
        id: x.id,
        titulo: x.nombre,
        sub: x.institucion,
        avatar: iniciales(x.nombre),
        campos: [
          { texto: x.nombre.replace(/\b(Mg|Dra|Dr|PhD|Ing|Ab|Lic)\.\s*/g, ''), peso: 5 },
          ...acts.map((t) => ({ texto: t, peso: 3, etiqueta: 'Exposición' })),
          { texto: x.institucion, peso: 2 },
        ],
      };
    });
}
