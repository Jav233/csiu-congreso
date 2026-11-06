// =====================================================================
//  Certificado imprimible (asistente o ponente). «Imprimir» permite
//  también «Guardar como PDF» desde el diálogo del navegador.
// =====================================================================
const Certificado = {
  mostrar({ titulo, nombre, detalle, codigo }) {
    $('.cert-capa')?.remove();
    const ev = CONGRESO.evento;
    const a = fechaDia(1), b = fechaDia(ev.dias.length);
    const capa = document.createElement('div');
    capa.className = 'cert-capa';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', titulo);
    capa.innerHTML = `
      <div class="cert-capa__acc">
        <button class="btn btn--primary" type="button" data-imprimir><i data-lucide="printer"></i>Imprimir o guardar PDF</button>
        <button class="btn btn--secondary" type="button" data-cerrar-cert><i data-lucide="x"></i>Cerrar</button>
      </div>
      <article class="cert">
        <p class="cert__org">Pontificia Universidad Católica del Ecuador · Sede Ambato</p>
        <h1 class="cert__tit">${escapar(titulo)}</h1>
        <p class="cert__txt">Se otorga el presente certificado a</p>
        <p class="cert__nombre">${escapar(nombre)}</p>
        <p class="cert__detalle">${detalle}</p>
        <p class="cert__detalle">${escapar(ev.nombre)} — «${escapar(ev.lema)}», realizado del ${a.getDate()} al ${b.getDate()} de noviembre de ${b.getFullYear()} en el ${escapar(ev.lugar)}.</p>
        <div class="cert__pie">
          <span class="cert__firma">Comité organizador</span>
          <span>Código de verificación: ${escapar(codigo)}</span>
        </div>
      </article>`;
    document.body.append(capa);
    iconos();
    const cerrar = () => { capa.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', esc);
    capa.addEventListener('click', (e) => {
      if (e.target.closest('[data-imprimir]')) window.print();
      if (e.target.closest('[data-cerrar-cert]') || e.target === capa) cerrar();
    });
    $('[data-imprimir]', capa).focus();
  },
};
