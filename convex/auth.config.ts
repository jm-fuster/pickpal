// Llegan dos tipos de token del mismo emisor de Clerk: el de sesión, que usa el
// navegador (lleva aud "convex" por la integración de Convex en Clerk), y el de
// la plantilla JWT "convex", que acuñan las rutas de la API. Los dos deben
// llevar email, name y given_name: settings.ts, lists.ts y exportData.ts los
// leen de getUserIdentity(). Se configuran en Clerk → Sessions → Claims y en
// la plantilla; sin ellos no hay error, solo datos vacíos.
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
