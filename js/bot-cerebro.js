// =====================================================================
//  Cerebro del asistente «Xi»: entiende preguntas en español y responde
//  con los datos oficiales del congreso. Sin servicios externos.
//  Expone: BotCerebro.responder(texto) → { txt, cards, ruta, links, sug }
// =====================================================================
const BotCerebro = (() => {
  const ev = CONGRESO.evento;
  const reales = () => CONGRESO.charlas.filter((c) => !esReceso(c));
  const fmtLargo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  const NOMBRES_DIA = ev.dias.map((_, i) => normal(new Intl.DateTimeFormat('es-EC', { weekday: 'long' }).format(fechaDia(i + 1))));
  const VACIAS = new Set('el la los las de del a al en y o que q cual cuales donde quien quienes como cuando hay es son un una unos unas por para con sobre me mi tu se su sus lo le hoy dia dias hora horas sera seria esta estan queda quedan charla charlas actividad actividades conferencia ponencia tema temas congreso favor dime decir saber quiero puedo puedes ver tiene tienen mas'.split(' '));
  const TITULOS = /\b(mg|dra|dr|phd|ing|ab|lic)\.?\b/g;

  // ---------- Interpretación ----------
  function detectarDia(t) {
    if (/\bhoy\b/.test(t)) { const i = ev.dias.findIndex((_, n) => fechaDia(n + 1).toDateString() === new Date().toDateString()); return i >= 0 ? i + 1 : 'hoy-no'; }
    if (/\bmanana\b/.test(t) && !/\b(la|en la|por la|de la) manana\b/.test(t)) {
      const m = new Date(); m.setDate(m.getDate() + 1);
      const i = ev.dias.findIndex((_, n) => fechaDia(n + 1).toDateString() === m.toDateString()); return i >= 0 ? i + 1 : 'manana-no';
    }
    for (let i = 0; i < NOMBRES_DIA.length; i++) if (t.includes(NOMBRES_DIA[i])) return i + 1;
    const m = t.match(/\bdia (\d)\b/) || t.match(/\b(primer|segundo|tercer|ultimo)\s+dia\b/);
    if (m) { const v = { primer: 1, segundo: 2, tercer: 3, ultimo: ev.dias.length }[m[1]] || +m[1]; if (v >= 1 && v <= ev.dias.length) return v; }
    const num = t.match(/\b(?:el|del)\s+(\d{1,2})\b(?!\s*(?::|h\b|horas|am|pm))/) || t.match(/\b(\d{1,2})\s+de\s+noviembre\b/);
    if (num) { const i = ev.dias.findIndex((_, n) => fechaDia(n + 1).getDate() === +num[1]); if (i >= 0) return i + 1; }
    return null;
  }

  function detectarHora(t) {
    if (/\b(ahora|ahorita|en este momento|ya mismo)\b/.test(t)) return 'ahora';
    if (/\b(siguiente|proxima|proximo|despues|luego)\b/.test(t)) return 'siguiente';
    const m = t.match(/\b(?:a las|a la|las|la|desde las|tipo|como a las)\s*(\d{1,2})(?:[:h.](\d{2}))?\s*(am|pm|de la tarde|de la manana|del dia)?/) || t.match(/\b(\d{1,2}):(\d{2})\b/);
    if (!m) return null;
    let h = +m[1]; const min = +(m[2] || 0);
    if (h > 23 || min > 59) return null;
    if ((m[3] === 'pm' || m[3] === 'de la tarde') && h < 12) h += 12;
    else if (!m[3] && h >= 1 && h <= 6) h += 12; // «a las 3» en un congreso = 15:00
    return h * 60 + min;
  }

  function tokens(t) { return t.replace(TITULOS, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !VACIAS.has(w)); }

  function buscarExpositor(t) {
    const tk = tokens(t);
    let mejor = null, punt = 0;
    for (const x of CONGRESO.expositores) {
      const nom = tokens(normal(x.nombre));
      const p = nom.filter((w) => tk.includes(w)).length;
      // Los grupos («Docentes investigadores de la PUCESA») piden al menos 2 palabras,
      // para que «pucesa» sola busque personas de esa institución
      if (p >= (x.grupo ? 2 : 1) && p > punt) { punt = p; mejor = x; }
    }
    return punt ? mejor : null;
  }

  function buscarSala(t) {
    const claves = { volcanes: ['volcanes', 'volcan'], 'aula-magna': ['aula magna', 'magna'], 'tres-juanes': ['tres juanes', 'juanes', 'cisco'], lab107: ['107', 'laboratorio 107', 'lab 107'] };
    for (const [id, ks] of Object.entries(claves)) if (ks.some((k) => t.includes(k))) return salaDe(id);
    return null;
  }

  function buscarCharlas(t) {
    const tk = tokens(t);
    if (!tk.length) return [];
    return reales().map((c) => {
      const texto = normal([c.titulo, ...c.exp.map((id) => `${expositorDe(id).nombre} ${expositorDe(id).institucion}`), areaDe(c.area).nombre].join(' '));
      const p = tk.filter((w) => texto.includes(w)).length;
      return [c, p];
    }).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]).filter(([, p], _, arr) => p === arr[0][1]).map(([c]) => c);
  }

  function buscarArea(t) {
    const claves = {
      datos: ['inteligencia artificial', ' ia ', 'datos', 'power bi', 'generativa'],
      seguridad: ['seguridad', 'ciberseguridad', 'ingenieria social', 'hacker'],
      diseno: ['diseno', 'accesibilidad', 'interfaz', 'interfaces', 'ux', 'discapacidad'],
      negocios: ['negocio', 'empresa', 'emprend', 'contabilidad', 'tributa'],
      derecho: ['derecho', 'legal', 'laboral', 'propiedad intelectual', 'ley'],
      investigacion: ['investigacion', 'divulga', 'ponencias'],
      profesion: ['profesional', 'carrera', 'internacional', 'onu'],
    };
    const tt = ` ${t} `;
    for (const [id, ks] of Object.entries(claves)) if (ks.some((k) => tt.includes(k))) return id;
    return null;
  }

  // ---------- Respuestas ----------
  const enCurso = (c, t) => instante(c, c.ini) <= t && t < instante(c, c.fin);
  const lista = (cs) => ({ cards: cs });

  // ---------- Búsqueda con índice (nombre > exposición > institución) ----------
  const PEDIR_BUSCAR = /\b(busca|buscar|buscame|buscarme|buscas|buscarlo|buscarla|encuentra|encontrar|encuentrame|localiza|localizar)\b/;
  const QUIEN_DA = /\bquien(es)?\s+(da|dan|dicta|dictan|presenta|presentan|expone|exponen|imparte|hace|hacen|tiene)\b/;
  const RELLENO = new Set('busca buscar buscame buscarme buscas buscarlo buscarla encuentra encontrar encuentrame localiza localizar puedes podrias podria favor porfa ayuda ayudas ayudame quiero necesito expositor expositora expositores ponente ponentes persona personas charla charlas exposicion exposiciones conferencia taller talleres actividad actividades sobre llamado llamada nombre tema institucion universidad quien quienes dicta dictan presenta presentan expone exponen imparte hace hacen tiene alguien algun alguna alguno algo cosa cosas info informacion'.split(' '));
  let _indice = null;
  function indicePersonas() {
    if (_indice) return _indice;
    _indice = CONGRESO.expositores.filter((x) => !x.grupo).map((x) => {
      const acts = [...new Set(CONGRESO.charlas.filter((c) => c.exp.includes(x.id)).map((c) => c.titulo))];
      const campo = (texto, peso) => ({ peso, palabras: normal(texto).split(/[^a-z0-9]+/).filter(Boolean) });
      return { x, campos: [campo(x.nombre.replace(TITULOS, ' '), 5), ...acts.map((a) => campo(a, 3)), campo(x.institucion, 2)] };
    });
    return _indice;
  }
  function puntuar(campos, tk) {
    let total = 0, todos = true;
    for (const w of tk) {
      let mejor = 0;
      for (const c of campos) {
        const p = c.palabras.some((p) => p.startsWith(w)) ? c.peso * 2 : c.palabras.some((p) => p.includes(w)) ? c.peso : 0;
        if (p > mejor) mejor = p;
      }
      if (!mejor) todos = false;
      total += mejor;
    }
    return { total, todos };
  }
  function buscarTodo(t) {
    const tk = tokens(t).filter((w) => !RELLENO.has(w));
    if (!tk.length) return { tk, personas: [], charlas: [] };
    const elegir = (lista) => {
      const exactos = lista.filter((r) => r.todos);
      return (exactos.length ? exactos : lista.filter((r) => r.total > 0)).sort((a, b) => b.total - a.total);
    };
    const personas = elegir(indicePersonas().map((i) => ({ x: i.x, ...puntuar(i.campos, tk) })));
    const charlas = elegir(reales().map((c) => {
      const campos = [{ peso: 4, palabras: normal(c.titulo).split(/[^a-z0-9]+/) }, { peso: 1, palabras: normal(areaDe(c.area).nombre).split(/[^a-z0-9]+/) }];
      return { c, ...puntuar(campos, tk) };
    }));
    // Si hay coincidencias completas, descartar las parciales más débiles
    const corte = (arr) => arr.filter((r) => r.total >= arr[0]?.total * 0.6);
    return { tk, personas: corte(personas).map((r) => r.x), charlas: corte(charlas).map((r) => r.c) };
  }
  const actividadesDe = (x) => {
    const cs = reales().filter((c) => c.exp.includes(x.id));
    return cs.filter((c, i) => cs.findIndex((o) => o.titulo === c.titulo) === i);
  };

  function responder(texto) {
    const t = ` ${normal(texto).replace(/[¿?¡!.,;]/g, ' ').replace(/\s+/g, ' ')} `;
    const dia = detectarDia(t);
    const hora = detectarHora(t);

    if (/^\s*(hola|buenas|buenos|hey|saludos|que tal)\b/.test(t) && t.trim().split(' ').length <= 4)
      return { txt: '¡Hola! Soy el asistente del XI CSIU. Puedo decirte qué hay a cierta hora, dónde es una actividad o quién es un expositor.', sug: true };
    if (/\b(gracias|genial|perfecto|excelente)\b/.test(t)) return { txt: '¡Con gusto! Si necesitas algo más, aquí estoy.' };
    // Búsqueda explícita: «busca a Heredia», «¿puedes buscar la charla de Power BI?», «¿quién da propiedad intelectual?»
    const pideBuscar = PEDIR_BUSCAR.test(t);
    const quienDa = QUIEN_DA.test(t);
    if (pideBuscar || quienDa) {
      const r = buscarTodo(t);
      if (!r.tk.length)
        return { txt: '¡Claro que puedo buscar! Encuentro expositores por su nombre, su institución o el tema de su exposición, y también actividades. Dime qué buscas, por ejemplo: «busca a Heredia», «busca la charla de Power BI» o «¿quién da propiedad intelectual?».' };
      if (quienDa && r.charlas.length) {
        const c = r.charlas[0];
        const ps = c.exp.map(expositorDe);
        return { txt: `«${c.titulo}» la presenta ${ps.map((p) => `${p.nombre} (${p.institucion})`).join(' y ')}.`, personas: ps.filter((p) => !p.grupo), ...lista([c]) };
      }
      if (r.personas.length === 1) {
        const x = r.personas[0];
        return { txt: `Encontré a ${x.nombre}, de ${x.institucion}. Estas son sus actividades:`, personas: [x], ...lista(actividadesDe(x)) };
      }
      if (r.personas.length > 1)
        return { txt: `Encontré ${r.personas.length} expositores con «${r.tk.join(' ')}». Toca uno para ver su perfil:`, personas: r.personas.slice(0, 5) };
      if (r.charlas.length) return { txt: r.charlas.length === 1 ? 'Encontré esta actividad:' : 'Encontré estas actividades:', ...lista(r.charlas) };
      return { txt: `No encontré nada con «${r.tk.join(' ')}». Prueba con un apellido, una institución o una palabra del tema de la exposición.` };
    }

    if (/\b(ayuda|que puedes|que sabes|como funcionas)\b/.test(t))
      return { txt: 'Puedes preguntarme, por ejemplo: «¿Qué hay a las 10 el miércoles?», «¿Dónde es el taller de Power BI?», «¿Quién es Isabel Heredia?», «Busca expositores de la PUCESA» o «¿Qué talleres hay?».', sug: true };

    if (dia === 'hoy-no' || dia === 'manana-no')
      return { txt: `Ese día no hay actividades del congreso. El congreso es del ${fechaDia(1).getDate()} al ${fechaDia(ev.dias.length).getDate()} de noviembre de 2026.`, sug: true };

    if (/\b(certificado|constancia|diploma)\b/.test(t))
      return { txt: 'Los asistentes obtienen su certificado desde «Mi entrada», una vez registrado su ingreso (check-in). Los expositores lo descargan en su panel.', links: [['mi-entrada.html', 'Ir a Mi entrada'], ['expositor.html', 'Panel de expositores']] };
    if (/\b(entrada|registr|inscri|qr|boleto|ticket)\w*/.test(t))
      return { txt: 'Genera tu entrada con código QR en «Mi entrada». La mostrarás al ingresar para registrar tu asistencia.', links: [['mi-entrada.html', 'Obtener mi entrada']] };
    if (/\b(almuerzo|comer|comida|break|receso|cafe|descanso)\b/.test(t)) {
      const d = typeof dia === 'number' ? dia : 1;
      const rec = CONGRESO.charlas.filter((c) => esReceso(c) && c.dia === d);
      return { txt: `Los recesos${typeof dia === 'number' ? ' de ese día' : ' (son iguales los tres días)'}:\n` + rec.map((c) => `• ${c.titulo}: ${c.ini} – ${c.fin}`).join('\n') };
    }

    // Hora
    if (hora !== null) {
      const ahora = new Date();
      if (hora === 'ahora' || hora === 'siguiente') {
        const vivas = reales().filter((c) => enCurso(c, ahora));
        if (hora === 'ahora' && vivas.length) return { txt: 'En este momento:', ...lista(vivas) };
        const prox = reales().sort((a, b) => instante(a, a.ini) - instante(b, b.ini)).find((c) => instante(c, c.ini) > ahora);
        if (!prox) return { txt: 'El congreso ya terminó. ¡Gracias por participar!' };
        return { txt: hora === 'ahora' ? 'Ahora no hay actividades en curso. Lo siguiente es:' : 'Lo siguiente es:', ...lista([prox]) };
      }
      const dias = typeof dia === 'number' ? [dia] : ev.dias.map((_, i) => i + 1);
      const hh = `${String(Math.floor(hora / 60)).padStart(2, '0')}:${String(hora % 60).padStart(2, '0')}`;
      const res = [];
      for (const d of dias) {
        const enEsa = reales().filter((c) => c.dia === d && aMin(c.ini) <= hora && hora < aMin(c.fin));
        const rec = CONGRESO.charlas.find((c) => esReceso(c) && c.dia === d && aMin(c.ini) <= hora && hora < aMin(c.fin));
        if (enEsa.length) res.push(...enEsa);
        else if (rec && typeof dia === 'number') return { txt: `A las ${hh} es el ${rec.titulo.toLowerCase()} (${rec.ini} – ${rec.fin}).` };
      }
      if (!res.length) {
        const sig = reales().filter((c) => dias.includes(c.dia) && aMin(c.ini) > hora).sort((a, b) => a.dia - b.dia || aMin(a.ini) - aMin(b.ini))[0];
        return sig ? { txt: `A las ${hh} no hay ninguna actividad en curso. La siguiente empieza a las ${sig.ini}:`, ...lista([sig]) } : { txt: `A las ${hh} ya no hay actividades ese día.` };
      }
      return { txt: `A las ${hh}${typeof dia === 'number' ? `, ${fmtLargo.format(fechaDia(dia))}` : ''}:`, ...lista(res) };
    }

    // Lugar
    const sala = buscarSala(t);
    const quiereLugar = /\b(donde|ubica|queda|llego|llegar|ruta|piso|lugar|sala)\b/.test(t);
    if (sala && !buscarExpositor(t)) {
      const n = reales().filter((c) => c.sala === sala.id && (typeof dia !== 'number' || c.dia === dia));
      const mas = n.length > 6 ? ` Te muestro las primeras 6; el resto está en la agenda.` : '';
      return { txt: `${sala.nombre}${sala.piso ? `, ${sala.piso}` : ''}. ${n.length ? `Ahí ${n.length === 1 ? 'hay 1 actividad' : `hay ${n.length} actividades`}${typeof dia === 'number' ? ' ese día' : ''}.${mas}` : ''}`,
        ruta: sala.id, ...lista(n.slice(0, 6)), links: n.length > 6 ? [['agenda.html', 'Ver la agenda']] : [] };
    }

    // Expositor
    const x = buscarExpositor(t);
    if (x) {
      const cs = reales().filter((c) => c.exp.includes(x.id));
      const lugares = [...new Set(cs.map((c) => textoLugar(salaDe(c.sala))))];
      const lugarTxt = quiereLugar && lugares.length ? ` ${cs.length === 1 ? 'Su actividad es' : 'Sus actividades son'} en ${lugares.join(' y en ')}.` : '';
      return { txt: `${x.nombre} viene de ${x.institucion}.${lugarTxt} ${cs.length === 1 ? 'Presenta:' : 'Presenta estas actividades:'}`, ...lista(cs), links: x.grupo ? [] : [[`expositores.html#exp-${x.id}`, 'Ver perfil']] };
    }

    // Talleres
    if (/\btaller/.test(t)) {
      const ts = reales().filter((c) => c.tipo === 'taller' && (typeof dia !== 'number' || c.dia === dia));
      const unicos = ts.filter((c, i) => ts.findIndex((o) => o.titulo === c.titulo && o.dia === c.dia) === i);
      const esp = buscarCharlas(t).filter((c) => c.tipo === 'taller');
      if (esp.length && esp.length < ts.length) return { txt: quiereLugar ? `Es en ${textoLugar(salaDe(esp[0].sala))}:` : 'Encontré este taller:', ruta: quiereLugar ? esp[0].sala : null, ...lista(esp) };
      return { txt: `Hay ${unicos.length} ${unicos.length === 1 ? 'taller' : 'talleres'}${typeof dia === 'number' ? ' ese día' : ''}. Se realizan en el Salón Tres Juanes / Lab Cisco y en el Laboratorio 107:`, ...lista(unicos) };
    }

    // Tema
    const area = buscarArea(t);
    const encontradas = buscarCharlas(t).filter((c) => typeof dia !== 'number' || c.dia === dia);
    if (encontradas.length && encontradas.length <= 4) {
      const c = encontradas[0];
      if (quiereLugar) return { txt: `«${c.titulo}» es en ${textoLugar(salaDe(c.sala))}, ${fmtLargo.format(fechaDia(c.dia))} a las ${c.ini}.`, ruta: c.sala, ...lista(encontradas) };
      return { txt: encontradas.length === 1 ? 'Encontré esta actividad:' : 'Encontré estas actividades:', ...lista(encontradas) };
    }
    if (area) {
      const cs = reales().filter((c) => c.area === area && (typeof dia !== 'number' || c.dia === dia));
      return { txt: `Sobre ${areaDe(area).nombre.toLowerCase()} hay:`, ...lista(cs) };
    }

    // Día
    if (typeof dia === 'number') {
      const cs = reales().filter((c) => c.dia === dia);
      return { txt: `El ${fmtLargo.format(fechaDia(dia))} hay ${cs.length} actividades:`, ...lista(cs), links: [[`agenda.html?dia=${dia}`, 'Ver en la agenda']] };
    }

    // Congreso en general
    if (/\b(cuando|fecha|fechas)\b/.test(t))
      return { txt: `El ${ev.nombre} es del ${fechaDia(1).getDate()} al ${fechaDia(ev.dias.length).getDate()} de noviembre de 2026, de 09:00 a 17:30, en el ${ev.lugar}.` };
    if (quiereLugar)
      return { txt: `El congreso es en el ${ev.lugar}. Las conferencias son en el Salón de los Volcanes (9.º piso) y los talleres en el Salón Tres Juanes / Lab Cisco y el Laboratorio 107.`, links: [['como-llegar.html', 'Ver el plano y la ruta']] };
    // Buscar en el índice de expositores (p. ej. solo una institución: «onu», «pucesa»)
    const r = buscarTodo(t);
    if (r.personas.length === 1) return { txt: `Encontré a ${r.personas[0].nombre}, de ${r.personas[0].institucion}:`, personas: r.personas, ...lista(actividadesDe(r.personas[0])) };
    if (r.personas.length > 1) return { txt: `Encontré ${r.personas.length} expositores relacionados:`, personas: r.personas.slice(0, 5) };
    if (encontradas.length) return { txt: 'Esto es lo más parecido que encontré:', ...lista(encontradas.slice(0, 5)) };

    return { txt: 'No encontré eso en la agenda. Prueba con una hora («a las 11»), un día («el jueves»), un expositor o un tema. Para otras consultas acércate al punto de información del congreso.', sug: true };
  }

  return { responder };
})();
