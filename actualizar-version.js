// =====================================================================
//  Rompe la caché del navegador antes de publicar.
//  Agrega «?v=AAAAMMDD-HHMM» a cada CSS y JS propio en todas las páginas,
//  así los navegadores descargan siempre la versión nueva.
//
//  Uso (antes de subir cambios):
//    node actualizar-version.js
//    git add -A && git commit -m "..." && git push
// =====================================================================
const fs = require('fs');
const path = require('path');

const ahora = new Date();
const dos = (n) => String(n).padStart(2, '0');
const version = `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;

const carpeta = __dirname;
const paginas = fs.readdirSync(carpeta).filter((f) => f.endsWith('.html'));
const patron = /((?:href|src)=")((?:css|js)\/[\w.-]+\.(?:css|js))(?:\?v=[\w-]+)?(")/g;

let total = 0;
for (const p of paginas) {
  const ruta = path.join(carpeta, p);
  const antes = fs.readFileSync(ruta, 'utf8');
  let n = 0;
  const despues = antes.replace(patron, (_, a, archivo, c) => { n++; return `${a}${archivo}?v=${version}${c}`; });
  if (despues !== antes) fs.writeFileSync(ruta, despues);
  total += n;
  console.log(`${p.padEnd(20)} ${n} archivos`);
}
console.log(`\nVersión ${version} aplicada a ${total} referencias en ${paginas.length} páginas.`);
