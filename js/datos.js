// =====================================================================
//  Datos del congreso — tomados de «Matriz sistemas_datos prueba.xlsx»
//  (agenda del 17 al 19 de noviembre de 2026). Solo se usa: hora, lugar,
//  tema, expositor e institución. Para cambiar la agenda, edita aquí.
// =====================================================================
const CONGRESO = {
  evento: {
    nombre: 'XI Congreso Internacional Ciencia, Sociedad e Investigación Universitaria',
    corto: 'XI CSIU',
    lema: 'Sociedades en transformación',
    lugar: 'Campus PUCE Ambato',
    zonaHoraria: '-05:00', // Ecuador continental
    dias: [
      { fecha: '2026-11-17', titulo: 'Conferencias de Sistemas y taller de accesibilidad' },
      { fecha: '2026-11-18', titulo: 'Sistemas Divulga, conferencias y taller de IA generativa' },
      { fecha: '2026-11-19', titulo: 'Ponencias del área de Sistemas y taller de Power BI' },
    ],
  },

  carreras: {
    sistemas: 'Sistemas',
    civil: 'Civil',
  },

  // Temas: ícono y un color sobrio (se usa poco, solo para identificar)
  areas: {
    datos:         { nombre: 'IA y datos',                  icono: 'brain-circuit', color: '#3b7fc4' },
    seguridad:     { nombre: 'Seguridad de la información', icono: 'shield-check',  color: '#c4554d' },
    diseno:        { nombre: 'Diseño y accesibilidad',      icono: 'pen-tool',      color: '#8762c4' },
    negocios:      { nombre: 'Empresa y negocios',          icono: 'briefcase',     color: '#2e8f62' },
    derecho:       { nombre: 'Derecho y tecnología',        icono: 'scale',         color: '#a87b14' },
    investigacion: { nombre: 'Investigación',               icono: 'flask-conical', color: '#1c8c8c' },
    profesion:     { nombre: 'Vida profesional',            icono: 'globe',         color: '#c0661a' },
    general:       { nombre: 'General',                     icono: 'coffee',        color: '#6b7a72' },
  },

  tipos: {
    conferencia: { nombre: 'Conferencia', icono: 'mic' },
    ponencia:    { nombre: 'Ponencias',   icono: 'presentation' },
    taller:      { nombre: 'Taller',      icono: 'wrench' },
    receso:      { nombre: 'Receso',      icono: 'coffee' },
  },

  // edificio: dónde está en el plano del campus · nivel: 0 = planta baja, 1..9 = piso
  // pasos (opcional): indicaciones propias para llegar; si no hay, se generan solas.
  salas: [
    { id: 'volcanes', nombre: 'Salón de los Volcanes', corto: 'Los Volcanes', edificio: 'torre', piso: '9.º piso', nivel: 9, uso: 'Conferencias y ponencias',
      pasos: [
        { t: 'Entra al campus', d: 'Ingresa por la puerta principal, en la Av. Manuelita Sáenz.', i: 'door-open' },
        { t: 'Ve al edificio principal', d: 'Sigue el camino central hasta la entrada del edificio.', i: 'footprints' },
        { t: 'Sube al 9.º piso', d: 'Toma el ascensor o las gradas hasta el 9.º piso.', i: 'arrow-up-down' },
        { t: 'Llegaste', d: 'El Salón de los Volcanes está en el 9.º piso. Sigue la señalización del congreso.', i: 'map-pin-check' },
      ] },
    // Pisos y edificios por confirmar: cámbialos aquí si los conoces
    { id: 'aula-magna',  nombre: 'Aula Magna',                    corto: 'Aula Magna',  edificio: 'aula', piso: '', nivel: 0, uso: 'Conferencias' },
    { id: 'tres-juanes', nombre: 'Salón Tres Juanes / Lab Cisco', corto: 'Tres Juanes', edificio: 'tres', piso: '', nivel: 0, uso: 'Talleres' },
    { id: 'lab107',      nombre: 'Laboratorio 107',               corto: 'Lab 107',     edificio: 'labs', piso: '1.er piso', nivel: 1, uso: 'Talleres' },
  ],

  // Plano REFERENCIAL del campus (no es a escala). Coordenadas en un lienzo de 360 × 440.
  campus: {
    nombre: 'PUCE Ambato',
    calle: 'Av. Manuelita Sáenz',
    mapaBusqueda: 'PUCE Ambato', // para el enlace externo «Abrir en Google Maps»
    entrada: [180, 398],
    edificios: [
      { id: 'torre', nombre: 'Edificio principal', x: 214, y: 36,  w: 112, h: 132, pisos: 10, puerta: [214, 112], cruce: [180, 112] },
      { id: 'tres',  nombre: 'Tres Juanes',        x: 34,  y: 50,  w: 110, h: 100, pisos: 1,  puerta: [144, 112], cruce: [180, 112] },
      { id: 'aula',  nombre: 'Aula Magna',         x: 34,  y: 186, w: 110, h: 92,  pisos: 1,  puerta: [144, 230], cruce: [180, 230] },
      { id: 'labs',  nombre: 'Laboratorios',       x: 214, y: 196, w: 112, h: 76,  pisos: 2,  puerta: [214, 230], cruce: [180, 230] },
    ],
  },

  // grupo: true → no es una persona sino un conjunto de expositores
  expositores: [
    { id: 1,  nombre: 'Mg. Juan Manuel Moscoso', institucion: 'PUCESA', codigo: 'EXP-1001' },
    { id: 2,  nombre: 'Docentes investigadores de la PUCESA', institucion: 'PUCESA', grupo: true },
    { id: 3,  nombre: 'Mg. Verónica Freire', institucion: 'Helping Company', codigo: 'EXP-1003' },
    { id: 4,  nombre: 'Fátima Ariana Manzano Moscoso', institucion: 'Alumni', codigo: 'EXP-1004' },
    { id: 5,  nombre: 'Varios expositores', institucion: 'PUCESA', grupo: true },
    { id: 6,  nombre: 'Mg. Francisco López', institucion: 'Honorable Gobierno Provincial de Tungurahua', codigo: 'EXP-1006' },
    { id: 7,  nombre: 'Mg. Carolina Fonseca', institucion: 'Consultora ONU', codigo: 'EXP-1007' },
    { id: 8,  nombre: 'Mg. Andrea Pinto', institucion: 'Fides Ius Consultores', codigo: 'EXP-1008' },
    { id: 9,  nombre: 'Mg. Isabel Heredia', institucion: 'Instituto Metropolitano de Diseño La Metro', codigo: 'EXP-1009' },
    { id: 10, nombre: 'PhD. Freddy Paz', institucion: 'Universidad Católica del Perú', codigo: 'EXP-1010' },
    { id: 11, nombre: 'Ing. Diego Vásconez, Mg.', institucion: 'PUCESA', codigo: 'EXP-1011' },
  ],

  // dia: 1..3 · sala: id de sala o 'todas' (recesos) · exp: ids de expositores
  charlas: [
    // ---------- Martes 17 · Sistemas ----------
    { id: 101, dia: 1, ini: '09:00', fin: '10:00', sala: 'volcanes', carreras: ['sistemas'], area: 'derecho', tipo: 'conferencia',
      titulo: 'Contratación laboral y obligaciones laborales', exp: [1] },
    { id: 102, dia: 1, ini: '10:10', fin: '11:10', sala: 'volcanes', carreras: ['sistemas'], area: 'negocios', tipo: 'conferencia',
      titulo: 'Del algoritmo a la empresa: contabilidad, tributación y oportunidades de negocio para ingenieros de sistemas', exp: [3] },
    { id: 103, dia: 1, ini: '11:10', fin: '11:20', sala: 'todas', area: 'general', tipo: 'receso', titulo: 'Break', exp: [] },
    { id: 104, dia: 1, ini: '11:20', fin: '12:20', sala: 'volcanes', carreras: ['sistemas'], area: 'seguridad', tipo: 'conferencia',
      titulo: 'Del diskette a la inteligencia artificial: 30 años después, ¿tus datos están en riesgo?', exp: [6] },
    { id: 105, dia: 1, ini: '12:30', fin: '13:30', sala: 'volcanes', carreras: ['sistemas'], area: 'diseno', tipo: 'conferencia',
      titulo: 'El entretenimiento ya no se entrega. Se ejecuta. Y el público dejó de ser usuario final para convertirse en co-desarrollador', exp: [9] },
    { id: 106, dia: 1, ini: '13:30', fin: '14:30', sala: 'todas', area: 'general', tipo: 'receso', titulo: 'Receso / almuerzo', exp: [] },
    { id: 107, dia: 1, ini: '14:30', fin: '15:30', sala: 'tres-juanes', carreras: ['sistemas'], area: 'diseno', tipo: 'taller', turno: '1 de 3',
      titulo: 'Tecnologías y diseño para la accesibilidad: la realidad de la discapacidad en el Ecuador', exp: [9] },
    { id: 108, dia: 1, ini: '15:30', fin: '16:30', sala: 'tres-juanes', carreras: ['sistemas'], area: 'diseno', tipo: 'taller', turno: '2 de 3',
      titulo: 'Tecnologías y diseño para la accesibilidad: la realidad de la discapacidad en el Ecuador', exp: [9] },
    { id: 109, dia: 1, ini: '16:30', fin: '17:30', sala: 'tres-juanes', carreras: ['sistemas'], area: 'diseno', tipo: 'taller', turno: '3 de 3',
      titulo: 'Tecnologías y diseño para la accesibilidad: la realidad de la discapacidad en el Ecuador', exp: [9] },

    // ---------- Miércoles 18 · Sistemas y Civil ----------
    { id: 201, dia: 2, ini: '09:00', fin: '10:00', sala: 'volcanes', carreras: ['sistemas'], area: 'investigacion', tipo: 'conferencia',
      titulo: 'Sistemas Divulga 2026', exp: [2] },
    { id: 202, dia: 2, ini: '10:10', fin: '11:10', sala: 'volcanes', carreras: ['sistemas'], area: 'seguridad', tipo: 'conferencia',
      titulo: 'Del engaño humano al engaño artificial: evolución de la ingeniería social en la era de la inteligencia artificial', exp: [4] },
    { id: 203, dia: 2, ini: '11:10', fin: '11:20', sala: 'todas', area: 'general', tipo: 'receso', titulo: 'Break', exp: [] },
    { id: 204, dia: 2, ini: '11:20', fin: '12:20', sala: 'volcanes', carreras: ['sistemas'], area: 'profesion', tipo: 'conferencia',
      titulo: 'Las vivencias humanas y estratégicas de un profesional de Sistemas en organizaciones internacionales', exp: [7] },
    { id: 205, dia: 2, ini: '12:30', fin: '13:30', sala: 'aula-magna', carreras: ['civil', 'sistemas'], area: 'diseno', tipo: 'conferencia',
      titulo: 'Accesibilidad, interculturalidad e internacionalización en el diseño de interfaces gráficas', exp: [10] },
    { id: 206, dia: 2, ini: '13:30', fin: '14:30', sala: 'todas', area: 'general', tipo: 'receso', titulo: 'Receso / almuerzo', exp: [] },
    { id: 207, dia: 2, ini: '14:30', fin: '17:30', sala: 'lab107', carreras: ['sistemas'], area: 'datos', tipo: 'taller',
      titulo: 'Usos de la IA generativa como apoyo al proceso de diseño de interfaces gráficas de productos software', exp: [10] },

    // ---------- Jueves 19 · Sistemas ----------
    { id: 301, dia: 3, ini: '09:00', fin: '10:00', sala: 'volcanes', carreras: ['sistemas'], area: 'investigacion', tipo: 'conferencia',
      titulo: 'Sistemas Divulga 2026', exp: [2] },
    { id: 302, dia: 3, ini: '10:10', fin: '11:10', sala: 'volcanes', carreras: ['sistemas'], area: 'investigacion', tipo: 'ponencia',
      titulo: 'Ponencias del área de Sistemas', exp: [5] },
    { id: 303, dia: 3, ini: '11:10', fin: '11:20', sala: 'todas', area: 'general', tipo: 'receso', titulo: 'Break', exp: [] },
    { id: 304, dia: 3, ini: '11:20', fin: '12:20', sala: 'volcanes', carreras: ['sistemas'], area: 'derecho', tipo: 'conferencia',
      titulo: 'Propiedad intelectual en la era digital', exp: [8] },
    { id: 305, dia: 3, ini: '12:30', fin: '13:30', sala: 'volcanes', carreras: ['sistemas'], area: 'investigacion', tipo: 'ponencia',
      titulo: 'Ponencias del área de Sistemas', exp: [5] },
    { id: 306, dia: 3, ini: '13:30', fin: '14:30', sala: 'todas', area: 'general', tipo: 'receso', titulo: 'Receso / almuerzo', exp: [] },
    { id: 307, dia: 3, ini: '14:30', fin: '17:30', sala: 'lab107', carreras: ['sistemas'], area: 'datos', tipo: 'taller',
      titulo: 'Del dato al impacto: transforma información en decisiones con Power BI', exp: [11] },
  ],
};
