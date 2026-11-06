// =====================================================================
//  Portada (usa CONGRESO de datos.js y ayudas de comun.js)
// =====================================================================
const { inicio: INICIO, fin: FIN } = rangoEvento();
const DIAS = CONGRESO.evento.dias;

// ===== Cuenta regresiva =====
const countdown = $('#countdown');
const pad = (n) => String(n).padStart(2, '0');
let timer;
function tick() {
  const now = new Date();
  if (now >= INICIO) {
    countdown.classList.add('countdown--live');
    countdown.innerHTML = now <= FIN
      ? '<span class="pulse"></span> ¡El congreso está en curso!'
      : 'El congreso finalizó. ¡Gracias por participar!';
    clearInterval(timer);
    return;
  }
  const s = Math.floor((INICIO - now) / 1000);
  const v = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  for (const u in v) countdown.querySelector(`[data-u="${u}"]`).textContent = pad(v[u]);
}
timer = setInterval(tick, 1000);
tick();

// ===== Texto de fechas =====
{
  const a = fechaDia(1), b = fechaDia(DIAS.length);
  const mes = new Intl.DateTimeFormat('es-EC', { month: 'short' }).format(b).replace('.', '');
  $('#fechaTexto').textContent = `${a.getDate()} – ${b.getDate()} ${mes} ${b.getFullYear()}`;
}

// ===== Días del congreso + calendario mensual =====
const fmtDia = new Intl.DateTimeFormat('es-EC', { weekday: 'long' });
const fmtMes = new Intl.DateTimeFormat('es-EC', { month: 'short' });

$('#daysList').innerHTML = DIAS.map((d, i) => {
  const f = fechaDia(i + 1);
  return `<li><a class="day" href="agenda.html?dia=${i + 1}">
    <span class="day__num"><strong>${f.getDate()}</strong><small>${fmtMes.format(f).replace('.', '')}</small></span>
    <span class="day__txt"><strong>Día ${i + 1} · <span style="text-transform:capitalize">${fmtDia.format(f)}</span></strong><span>${escapar(d.titulo)}</span></span>
    <i data-lucide="chevron-right"></i></a></li>`;
}).join('');

(function renderCalendar() {
  const first = fechaDia(1);
  const y = first.getFullYear(), m = first.getMonth();
  const eventDays = new Map(DIAS.map((_, i) => [fechaDia(i + 1).toDateString(), i + 1]));
  const today = new Date().toDateString();
  const mes = new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(first);
  $('#calTitle').textContent = `${mes[0].toUpperCase()}${mes.slice(1)} ${y}`;

  let html = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((d) => `<span class="cal__dow">${d}</span>`).join('');
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // lunes primero
  const total = Math.ceil((offset + new Date(y, m + 1, 0).getDate()) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const d = new Date(y, m, 1 - offset + i);
    const cls = ['cal__d'];
    if (d.getMonth() !== m) cls.push('cal__d--out');
    if (d.toDateString() === today) cls.push('cal__d--today');
    const dia = eventDays.get(d.toDateString());
    if (dia) {
      cls.push('cal__d--event');
      html += `<a class="${cls.join(' ')}" href="agenda.html?dia=${dia}" aria-label="Día ${dia} del congreso, ${d.getDate()}">${d.getDate()}<small>Día ${dia}</small></a>`;
    } else {
      html += `<span class="${cls.join(' ')}">${d.getDate()}</span>`;
    }
  }
  $('#calGrid').innerHTML = html;
})();

// ===== Temas del congreso (desde los datos) =====
{
  const usados = {};
  for (const c of CONGRESO.charlas) if (!esReceso(c)) usados[c.area] = (usados[c.area] || 0) + 1;
  $('#areasInicio').innerHTML = Object.entries(usados).map(([id, n]) => {
    const a = areaDe(id);
    return `<a class="area reveal" href="agenda.html?area=${id}" style="--c:${a.color}">
      <span class="area__img"><img src="img/portadas/${id}.jpg" alt="" loading="lazy" decoding="async"></span>
      <span class="area__ico"><i data-lucide="${a.icono}"></i></span>
      <h3>${a.nombre}</h3>
      <small>${n} ${n === 1 ? 'actividad' : 'actividades'}</small>
    </a>`;
  }).join('');
}

iconos();

// ===== Barra superior al hacer scroll =====
{
  const topbar = $('.topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ===== Aparición al hacer scroll =====
{
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.12 }) : null;
  $$('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
}

// ===== Inclinación 3D del emblema con el mouse =====
const emblem = $('#emblem');
if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
  const hero = $('.hero');
  hero.addEventListener('pointermove', (e) => {
    const r = emblem.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
    const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    emblem.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 22}deg)`;
  });
  hero.addEventListener('pointerleave', () => { emblem.style.transform = ''; });
}

// ===== Partículas =====
(function particles() {
  const canvas = $('#particles');
  const ctx = canvas.getContext('2d');
  let w, h, dots = [];
  const dpr = Math.min(devicePixelRatio || 1, 2);
  function resize() {
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const n = Math.round(Math.min(70, innerWidth / 18));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: (Math.random() * 1.8 + .4) * dpr,
      vy: (Math.random() * .3 + .08) * dpr,
      vx: (Math.random() - .5) * .15 * dpr,
      a: Math.random() * .5 + .15,
    }));
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of dots) {
      p.y -= p.vy; p.x += p.vx;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(185,255,227,${p.a})`;
      ctx.fill();
    }
    if (!reduceMotion && !document.hidden) requestAnimationFrame(draw);
  }
  resize();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduceMotion) draw(); });
  draw();
})();
