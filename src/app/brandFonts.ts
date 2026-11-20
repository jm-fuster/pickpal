import { Fraunces, Geist } from "next/font/google";

// Las dos fuentes de la marca. Las usan el layout raíz y `global-error`, que
// sustituye al layout cuando este falla y tiene que montar su propio <html>.
// Geist Mono va aparte (fonts.ts) para no precargarla en todas las páginas.
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
