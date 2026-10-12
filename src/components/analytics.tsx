"use client";

import {
  Analytics as VercelAnalytics,
  type BeforeSend,
} from "@vercel/analytics/next";
import {
  asksNotToTrack,
  browserStorage,
  readAnalyticsOptOut,
} from "@/lib/privacySignals";

// Vercel Web Analytics no usa cookies, pero su script envía cada visita, y eso
// también cae bajo el art. 22.2 LSSI. La guía de cookies de la AEPD (2023) lo
// tolera para medición propia y agregada si se informa y se deja negarse. Se
// puede negar de dos formas: con la señal GPC/DNT del navegador o con el
// interruptor de /privacidad. Se comprueba en cada evento, así que el cambio
// vale al momento. Ver docs/privacy.md §2.4.
//
// El fragmento (`#…`) se quita siempre: en /mi-lista/apuntar lleva el nombre
// y el enlace de lo que la dueña está mirando en una tienda, y eso no tiene
// por qué llegar a la analítica.
const respectPrivacyChoices: BeforeSend = (event) =>
  asksNotToTrack(navigator) || readAnalyticsOptOut(browserStorage())
    ? null
    : { ...event, url: event.url.split("#")[0] };

export function Analytics() {
  return <VercelAnalytics beforeSend={respectPrivacyChoices} />;
}
