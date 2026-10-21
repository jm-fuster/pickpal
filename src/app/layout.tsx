import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@/components/analytics";
import "./globals.css";

// Clerk's esES speaks in "usted"; the rest of the product speaks in "tú".
const clerkLocalization = {
  ...esES,
  formFieldInputPlaceholder__emailAddress: "Introduce tu correo electrónico",
  signIn: {
    ...esES.signIn,
    start: { ...esES.signIn?.start, actionLink: "Regístrate" },
    emailCode: { ...esES.signIn?.emailCode, title: "Revisa tu correo" },
  },
  signUp: {
    ...esES.signUp,
    emailCode: {
      ...esES.signUp?.emailCode,
      title: "Revisa tu correo",
      formSubtitle: "Introduce el código que te hemos enviado",
    },
    // The terms are accepted; the privacy policy is only read. It informs,
    // and asking people to "accept" it blurs the legal basis (docs/legal.md §3).
    legalConsent: {
      ...esES.signUp?.legalConsent,
      checkbox: {
        ...esES.signUp?.legalConsent?.checkbox,
        label__termsOfServiceAndPrivacyPolicy:
          'Acepto los {{ termsOfServiceLink || link("Términos de Servicio") }} y he leído la {{ privacyPolicyLink || link("Política de Privacidad") }}',
        label__onlyPrivacyPolicy: "He leído la Política de Privacidad",
      },
      continue: {
        ...esES.signUp?.legalConsent?.continue,
        title: "Acepta los términos para continuar",
        subtitle:
          "Al continuar, aceptas los términos y confirmas que has leído la política de privacidad.",
      },
    },
    // Sign-up runs in waitlist mode (Clerk dashboard). esES gets this screen
    // wrong: it tells people they already joined before they have, and labels
    // the sign-in link "Contáctanos para más información".
    restrictedAccess: {
      ...esES.signUp?.restrictedAccess,
      subtitleWaitlist:
        "Ahora mismo las cuentas nuevas pasan por una lista de espera. Apúntate y te avisaremos por correo cuando tengas acceso.",
      actionText: "¿Ya tienes cuenta?",
      actionLink: "Inicia sesión",
    },
  },
  // Same slip on the waitlist page: the sign-in link reads "¡Únete a la lista
  // de espera!".
  waitlist: {
    ...esES.waitlist,
    start: {
      ...esES.waitlist?.start,
      subtitle: "Deja tu correo y te avisaremos cuando tengas acceso.",
      formButton: "Apuntarme",
      actionText: "¿Ya tienes acceso?",
      actionLink: "Inicia sesión",
    },
    success: {
      ...esES.waitlist?.success,
      title: "Ya estás en la lista",
      subtitle: "Cuando tengas acceso, te llegará un correo para crear la cuenta.",
    },
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://pickpal.jorgemolinafuster.com";
const DESCRIPTION =
  "Apunta lo que sabes de cada persona y sus fechas. PickPal te avisa cuando se acercan y te propone ideas de regalo a partir de lo que apuntaste.";

export const metadata: Metadata = {
  // Sin metadataBase, Next resuelve la URL de opengraph-image.png contra
  // localhost en desarrollo y contra VERCEL_URL en producción — que es el alias
  // del despliegue, no el dominio. El resultado es una previsualización rota al
  // compartir el enlace.
  metadataBase: new URL(SITE_URL),
  title: "PickPal",
  description: DESCRIPTION,
  // La app no debe aparecer en Google: el caso de estudio que sí debe
  // posicionar vive en jorgemolinafuster.com/work/pickpal. No bloquear en
  // robots.txt — si Google no puede rastrear la página, no ve el noindex.
  // Ninguna página hija debe definir su propio `robots` (Next sobrescribe el
  // objeto entero por segmento). La cabecera X-Robots-Tag de next.config.ts
  // cubre además los ficheros que no son HTML.
  robots: { index: false, follow: false },
  // Todos los iconos viven en public/ y se declaran aquí. En cuanto el metadata
  // trae `icons`, Next ignora los iconos por archivo (app/icon.*, app/apple-icon.*):
  // así se perdió icon.svg de mayo a octubre de 2026. El .ico va con
  // sizes 32x32 para que Chrome prefiera el SVG, que cambia a crema en modo
  // oscuro; los navegadores sin favicon SVG se quedan con el .ico.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "PickPal",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "PickPal",
    locale: "es_ES",
    type: "website",
    // La imagen la aporta src/app/opengraph-image.png por convención de
    // fichero, con su texto alternativo en el .alt.txt de al lado.
  },
  twitter: {
    card: "summary_large_image",
    title: "PickPal",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // waitlistUrl: «Unirte a la lista de espera» stays in the app instead of
    // going to Clerk's Account Portal, which is in English and off-brand.
    <ClerkProvider localization={clerkLocalization} waitlistUrl="/lista-de-espera">
      <html
        lang="es"
        suppressHydrationWarning
        className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
