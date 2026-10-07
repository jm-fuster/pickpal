import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { ConvexClientProvider } from "./ConvexClientProvider";
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
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
  "Recuerda fechas importantes y recibe ideas de regalo personalizadas con IA.";

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
  icons: {
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
    <ClerkProvider localization={clerkLocalization}>
      <html
        lang="es"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
            <Toaster />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
