import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Default-deny: cualquier ruta no listada aquí requiere sesión.
// Esto bloquea automáticamente nuevas rutas que se creen sin auth explícita.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Aviso de privacidad: legítimamente público — debe ser legible antes de
  // crear cuenta y para que cualquiera al que un usuario haya añadido como
  // "ser querido" pueda consultar el tratamiento de sus datos.
  "/privacidad",
  // Términos: mismo motivo. La página dice "al registrarte aceptas estos
  // términos", así que tienen que poder leerse *antes* de registrarse; con el
  // default-deny, el enlace del footer y del sign-up llevaba a sign-in.
  "/terminos",
  // «Compartir» de Android (share_target del manifiesto). Llega por POST con lo
  // compartido en el cuerpo, que el servidor nunca ve en una dirección: si el
  // proxy lo mandara a iniciar sesión, los datos se perderían. La ruta no lee
  // nada del usuario ni escribe nada: redirige a /mi-lista/apuntar con lo
  // compartido en el fragmento, y esa sí exige sesión (el fragmento sobrevive
  // hasta la página de entrada, que lo guarda: src/lib/pendingShare.ts).
  "/compartir",
]);

export default clerkMiddleware(async (auth, req) => {
  // Defensa CSRF en profundidad (además del SameSite=Lax de Clerk): los
  // navegadores modernos envían Sec-Fetch-Site y un sitio cruzado no puede
  // falsificarla. Solo se rechaza cuando la cabecera existe y no es
  // same-origin, así que clientes antiguos sin la cabecera siguen funcionando.
  if (req.method !== "GET" && req.nextUrl.pathname.startsWith("/api")) {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") {
      return new Response("Forbidden", { status: 403 });
    }
  }
  // La landing es solo para visitantes sin sesión: quien ya la tiene entra
  // directo a la agenda. Se decide aquí y no en la página para que `/` sea
  // estática y la sirva la CDN sin renderizar nada en el servidor.
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL("/agenda", req.url));
    }
  }
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
}, {
  // Sin sesión, a la página de entrada de la propia app y no a la alojada por
  // Clerk (otro dominio): solo en la propia llega el fragmento de una dirección
  // del marcador o de «Compartir» y se puede guardar (src/lib/pendingShare.ts).
  // Es lo mismo que fija NEXT_PUBLIC_CLERK_SIGN_IN_URL en .env.example; aquí
  // no depende de que el entorno la tenga puesta.
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
