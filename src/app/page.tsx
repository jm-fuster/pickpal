// Los estilos de la landing cuelgan de [data-landing]: Next no descarga una
// hoja global al navegar, y así no tocan la app si siguen cargados. Las
// @property y los @keyframes, que son globales, llevan el prefijo `landing`.
import "./landing.css";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Story } from "@/components/landing/Story";
import { ListSection } from "@/components/landing/ListSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { Faq } from "@/components/landing/Faq";
import { Closing } from "@/components/landing/Closing";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { RevealRoot } from "@/components/landing/RevealRoot";

// Quien ya tiene sesión no llega a ver esto: src/proxy.ts lo manda a la
// agenda antes de servir la página, que así puede ser estática.
export default function Home() {
  return (
    <div data-landing className="flex flex-1 flex-col">
      <LandingHeader />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <RevealRoot>
          <Hero />
          <Story />
          <ListSection />
          <TrustSection />
          <Faq />
          <Closing />
        </RevealRoot>
      </main>
      <LandingFooter />
    </div>
  );
}
