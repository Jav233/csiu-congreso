# XI CSIU · Plataforma del congreso (prototipo)

Prototipo web y móvil de una plataforma SaaS para la gestión de congresos institucionales,
aplicado al **XI Congreso Internacional Ciencia, Sociedad e Investigación Universitaria**
(PUCE Ambato, 17 al 19 de noviembre de 2026).

Hecho con **HTML, CSS y JavaScript**, sin servidor: funciona en GitHub Pages y se adapta al celular.

## Qué incluye

| Módulo | Página |
|---|---|
| Pantalla principal | `index.html` |
| Agenda del evento (filtros, Mi agenda, exportar a calendario, vista por lugar) | `agenda.html` |
| Gestión de expositores | `expositores.html` y panel del organizador |
| Información de salas y ruta animada en el plano del campus | `como-llegar.html` |
| Gestión de eventos, check-in y analítica | `organizador.html` |
| Panel del expositor (semáforo de tiempo, certificado) | `expositor.html` |
| Entrada con QR y certificado de asistencia | `mi-entrada.html` |
| Asistente virtual «Xi» (chatbot) | botón «Pregúntame» en todas las páginas |

## Cuentas de prueba

- Organizador: código `ORG-2026`
- Expositor: código `EXP-1009` (Mg. Isabel Heredia)

## Notas del prototipo

- Los datos del congreso están en `js/datos.js`.
- Los cambios del organizador, las entradas y «Mi agenda» se guardan en el navegador de cada persona (no hay servidor).
- El plano del campus es referencial y algunos pisos están por confirmar.
