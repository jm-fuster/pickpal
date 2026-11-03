# PickPal — Visión general

App web para recordar las fechas importantes de la gente que te importa y recibir
ideas de regalo personalizadas con IA cuando se acerca cada ocasión.

> Revisado contra el código el 20-sep-2026. La versión anterior describía rutas
> `/dashboard` y `/people/*` que no existen, un filtro de 30/60/90 días que nunca
> se implementó y 7 tiendas de las 11 que hay.

## Problema que resuelve

Es fácil olvidar cumpleaños y aniversarios, y cuando se recuerdan a última hora no
hay tiempo para pensar un regalo decente. La app centraliza las fechas de las
personas que te importan y, cuando una se acerca, convierte lo que has ido
apuntando sobre esa persona en ideas concretas para esa ocasión y ese presupuesto.

## Cómo funciona

1. Creas fichas de personas (amigos, familia, pareja, compañeros) con intereses,
   marcas favoritas, notas, tallas, alergias y cosas que no les gustan.
2. A cada persona le añades fechas: cumpleaños, aniversario o lo que quieras, cada
   una con su propio presupuesto opcional — **el presupuesto va en la fecha, no en
   la persona**, porque no se gasta igual en un cumpleaños que en un detalle.
3. La agenda muestra lo que llega en los **próximos 4 meses**, agrupado por
   cercanía, y la campana de la cabecera avisa de lo que entra en tu ventana de
   aviso (30 días por defecto).
4. Opcionalmente activas **avisos por email** desde Ajustes y eliges con cuánta
   antelación quieres recibirlos (0, 2, 7 o 14 días; puedes marcar varias). Un
   cron diario en Convex manda un único correo agrupado vía Resend. Detalle en
   [`email-notifications.md`](email-notifications.md).
5. En la página de ideas de cada persona eliges la ocasión y la IA propone una
   tanda mezclada (cosas que comprar, experiencias y planes) con rango de
   precio, que puedes filtrar por tipo. **Pide nueve y acepta entre seis y
   nueve**, descartando títulos repetidos. Las que se compran traen enlaces de
   búsqueda a las tiendas que hayas elegido, ordenados por valoración donde la
   tienda lo hace bien.
6. Cada idea se guarda o se descarta. Lo descartado enseña a la siguiente tanda
   qué evitar; lo guardado pasa al historial de regalos cuando lo regalas de
   verdad, y ese historial vuelve a entrar en la siguiente generación.

## Páginas principales

| Ruta | Descripción |
|---|---|
| `/` | Landing pública; si ya tienes sesión, redirige a `/agenda` |
| `/agenda` | Lo que llega en los próximos 4 meses, agrupado por cercanía |
| `/seres-queridos` | Lista de todas las personas |
| `/seres-queridos/new` | Alta de persona, con sus fechas |
| `/seres-queridos/[personId]` | Ficha completa; se edita ahí mismo, con autoguardado |
| `/seres-queridos/[personId]/gifts` | Panel de ideas de regalo |
| `/settings` | Tema, avisos por email, tiendas favoritas y borrado de cuenta |
| `/privacidad`, `/terminos` | Páginas legales, públicas a propósito |
| `/sign-in`, `/sign-up` | Clerk |

`/seres-queridos/[personId]/edit` existe, pero solo redirige a la ficha: la
edición es en línea, no en un formulario aparte.

## Tiendas soportadas

Once, y el usuario elige cuáles quiere en Ajustes: Amazon, El Corte Inglés,
AliExpress, Temu, Miravia, Decathlon, IKEA, PcComponentes, MediaMarkt, Zalando y
Druni. La lista canónica es `STORE_IDS` en
[`src/lib/stores.ts`](../src/lib/stores.ts).

Solo las ideas de **producto físico** enseñan tiendas; experiencia, tiempo juntos
y sorpresa llevan un único enlace de búsqueda.

## Por dónde seguir

- [`estructura.md`](estructura.md) — el árbol del proyecto y las 9 tablas.
- [`security.md`](security.md) — modelo de confianza y patrones obligatorios.
- [`ia-regalos.md`](ia-regalos.md) — la tubería de generación en detalle.
- [`tech-stack.md`](tech-stack.md) — por qué cada pieza del stack.
