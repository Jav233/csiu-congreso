// =====================================================================
//  Portadas ilustradas (3D digital) para cada actividad y tema.
//  Usa ilustraciones dedicadas por charla y por área temática en
//  img/portadas/ con encuadre adaptativo y carga diferida.
// =====================================================================
const Portadas = (() => {
  const IMAGENES = {
    datos:         'img/portadas/datos.jpg',
    seguridad:     'img/portadas/seguridad.jpg',
    diseno:        'img/portadas/diseno.jpg',
    negocios:      'img/portadas/negocios.jpg',
    derecho:       'img/portadas/derecho.jpg',
    investigacion: 'img/portadas/investigacion.jpg',
    profesion:     'img/portadas/profesion.jpg',
    general:       'img/portadas/general.jpg',
  };

  // Ilustraciones específicas para cada charla/taller de la agenda
  const POR_CHARLA = {
    101: 'img/portadas/derecho.jpg',
    102: 'img/portadas/negocios.jpg',
    104: 'img/portadas/charla_104.jpg',
    105: 'img/portadas/charla_105.jpg',
    107: 'img/portadas/diseno.jpg',
    108: 'img/portadas/diseno.jpg',
    109: 'img/portadas/diseno.jpg',
    201: 'img/portadas/investigacion.jpg',
    202: 'img/portadas/charla_202.jpg',
    204: 'img/portadas/profesion.jpg',
    205: 'img/portadas/charla_205.jpg',
    207: 'img/portadas/charla_207.jpg',
    301: 'img/portadas/investigacion.jpg',
    302: 'img/portadas/charla_302.jpg',
    304: 'img/portadas/charla_304.jpg',
    305: 'img/portadas/charla_302.jpg',
    307: 'img/portadas/datos.jpg',
  };

  function url(c) {
    if (c && POR_CHARLA[c.id]) return POR_CHARLA[c.id];
    const clave = IMAGENES[c?.area] ? c.area : 'general';
    return IMAGENES[clave];
  }

  function svg(c, { clase = 'portada' } = {}) {
    const src = url(c);
    const area = areaDe(c?.area);
    const posY = 44 + ((Number(c?.id) || 0) * 7) % 14;
    return `<img class="${clase}" src="${src}" alt="" loading="lazy" decoding="async" style="--pos-y:${posY}%;--c-portada:${area.color}">`;
  }

  return { svg, url, IMAGENES, POR_CHARLA };
})();

