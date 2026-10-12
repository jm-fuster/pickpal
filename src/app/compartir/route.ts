import { NextResponse } from "next/server";
import { shareTargetFragment } from "@/lib/shareTarget";

/**
 * Destino de «Compartir» en Android (`share_target` de src/app/manifest.ts).
 * Llega por POST, no por GET: con GET el enlace compartido iría en la query y
 * acabaría en los registros de peticiones. Aquí solo se lee lo que manda el
 * móvil y se redirige a `/mi-lista/apuntar` con los datos en el fragmento,
 * que el navegador no vuelve a mandar al servidor. No se guarda ni se registra
 * nada, y el enlace no se abre.
 *
 * Va fuera de `/api` a propósito: el proxy rechaza los POST a `/api` que no
 * son del mismo origen, y el de «Compartir» llega con `Sec-Fetch-Site: none`.
 * No cambia nada en el servidor, así que no hay nada que proteger con eso.
 *
 * Es pública a propósito (src/proxy.ts): con la sesión caducada, un POST
 * mandado a iniciar sesión perdería lo compartido, que va en el cuerpo. La
 * sesión la exige la página a la que redirige, `/mi-lista/apuntar`, y el
 * fragmento sobrevive hasta la página de entrada, que lo guarda
 * (src/lib/pendingShare.ts) para recogerlo al volver.
 */
export async function POST(request: Request) {
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    // Cuerpo vacío o mal formado: se abre la página sin datos.
  }
  const text = (name: string) => {
    const value = form?.get(name);
    return typeof value === "string" ? value : null;
  };
  const fragment = shareTargetFragment({ title: text("title"), text: text("text"), url: text("url") });
  const target = new URL("/mi-lista/apuntar", request.url);
  target.hash = fragment;
  return NextResponse.redirect(target, 303);
}
