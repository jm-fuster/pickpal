import { Geist_Mono } from "next/font/google";

// Geist Mono no va en el layout raíz: allí se precargaba en todas las páginas
// (23 KB) para una sola palabra del diálogo de borrar cuenta. Quien use
// `font-mono` aplica `geistMono.variable` en ese mismo elemento (o en un
// ancestro que no cruce un portal), que es lo que define --font-geist-mono.
// Sin precarga: se descarga cuando aparece el texto. Volver a declararla en el
// layout raíz con `preload: false` tampoco sirve: Next reordena el <head> del
// 404 y el título de la pestaña pasa de «404: This page…» a «PickPal».
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});
