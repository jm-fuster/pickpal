/** El canvas del lazo, en px CSS: lo que ocupa el final de la película alrededor del logo. */
export const LAZO_SIZE = { width: 288, height: 320 };

/**
 * Va al principio del `<body>` (layout.tsx), antes de pintar nada: marca
 * `<html>` con `data-launch` si la app está instalada, o si la dirección lleva
 * `?arranque` para ver la pantalla de arranque en el navegador. En el iPhone
 * vale "ios": su imagen de arranque es solo crema, así que el logo de
 * LaunchSplash entra con un fundido; en Android el sistema ya enseña el icono
 * y el logo está desde el primer fotograma.
 *
 * Con movimiento, y si el móvil sabe pasar un canvas a otro hilo, arranca ya
 * el worker del lazo (public/splash/lazo-worker.js), para que se descargue a la
 * vez que la app, y le pasa el canvas en cuanto el HTML lo trae. El worker
 * avisa en `data-lazo` de `<html>`: "wait" mientras carga, "on" cuando pinta
 * el primer fotograma y "done" al acabar (o si falla: queda el logo quieto).
 * `window.__lazo` es el worker, para que LaunchSplash lo pare si se va antes.
 *
 * Fuera de un archivo "use client" a propósito: un export de esos llega al
 * servidor como referencia, no como texto.
 */
export const LAUNCH_SCRIPT = `(function(){try{var d=document.documentElement,ios=navigator.standalone===true;if(!ios&&!matchMedia("(display-mode: standalone)").matches&&!/[?&]arranque(=|&|$)/.test(location.search))return;d.setAttribute("data-launch",ios?"ios":"");if(matchMedia("(prefers-reduced-motion: reduce)").matches||!window.Worker||!("transferControlToOffscreen" in HTMLCanvasElement.prototype))return;var w=window.__lazo=new Worker("/splash/lazo-worker.js"),set=function(v){d.setAttribute("data-lazo",v)};set("wait");w.onmessage=function(e){set(e.data);if(e.data==="done")w.terminate()};w.onerror=function(){set("done")};var go=function(c){var o=c.transferControlToOffscreen();w.postMessage({canvas:o,width:${LAZO_SIZE.width},height:${LAZO_SIZE.height},dpr:Math.min(devicePixelRatio||1,3)},[o])},c=document.querySelector(".launch-lazo");if(c)return go(c);var m=new MutationObserver(function(){var c=document.querySelector(".launch-lazo");if(c){m.disconnect();go(c)}});m.observe(d,{childList:true,subtree:true})}catch(e){}})()`;
