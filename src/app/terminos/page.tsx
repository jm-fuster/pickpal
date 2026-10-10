import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { BackLink } from "@/components/layout/BackLink";

export const metadata = {
  title: "Términos y condiciones · PickPal",
  description:
    "Condiciones de uso de PickPal: cuenta, uso aceptable, recomendaciones de IA y responsabilidades.",
};

export default function TermsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-lg font-medium tracking-tight flex items-center gap-2"
        >
          <LogoMark className="size-7" />
          PickPal
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-medium">Términos y condiciones de uso</h1>
          <p className="text-sm text-foreground">
            Estas condiciones explican en lenguaje llano qué es el servicio,
            qué se espera de ti al usarlo y de qué nos hacemos —y no—
            responsables.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Qué es PickPal</h2>
          <p className="text-sm text-foreground">
            PickPal es una aplicación web para guardar información sobre las
            personas a las que quieres regalar (intereses, fechas señaladas,
            notas) y obtener ideas de regalo personalizadas generadas por
            inteligencia artificial. La ofrece y la mantiene Jorge Molina
            Fuster como proyecto personal. El uso del servicio se rige por
            estos términos y por la{" "}
            <Link
              href="/privacidad"
              className="underline underline-offset-2 hover:text-foreground"
            >
              política de privacidad
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Aceptación</h2>
          <p className="text-sm text-foreground">
            Al registrarte y usar PickPal aceptas estos términos. Si no estás
            de acuerdo con ellos, no debes registrarte ni utilizar el servicio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Tu cuenta</h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              El acceso se gestiona con Clerk. Eres responsable de mantener la
              confidencialidad de tus credenciales.
            </li>
            <li>
              Debes ser <span className="text-foreground">mayor de 18 años</span>.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Uso aceptable</h2>
          <p className="text-sm text-foreground">Al usar PickPal te comprometes a:</p>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              No introducir datos de terceros sin tener una relación personal
              legítima con ellos.
            </li>
            <li>
              No introducir datos sensibles (ideología, religión, orientación
              sexual, salud y similares) en las notas. El campo
              &laquo;alergias o restricciones&raquo; existe para lo
              imprescindible —una alergia alimentaria, un material que no puede
              llevar—: anota ahí lo mínimo que evite un regalo inservible, no un
              historial médico.
            </li>
            <li>
              No usar la app para fines ilícitos, ofensivos o que vulneren
              derechos de terceros.
            </li>
            <li>
              No intentar saltarte las medidas de seguridad ni los límites de
              uso, ni acceder a datos de otros usuarios.
            </li>
            <li>No automatizar el uso del servicio mediante bots o scraping.</li>
          </ul>
          <p className="text-sm text-foreground">
            El incumplimiento puede conllevar la suspensión o eliminación de tu
            cuenta.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Recomendaciones generadas por IA</h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              Las ideas de regalo se generan con un modelo de lenguaje a partir
              de los datos que introduces. Son{" "}
              <span className="text-foreground">orientativas</span>: precios,
              disponibilidad y descripciones pueden no ser exactos.
            </li>
            <li>
              Los enlaces a tiendas son búsquedas: no garantizan la existencia
              ni el precio de un producto concreto.
            </li>
            <li>
              PickPal no se hace responsable de las compras que realices a
              partir de las recomendaciones.
            </li>
            <li>
              Para generar las ideas se envía a Google (Gemini) la ficha de la
              persona: nombre de pila, intereses, marcas, notas, tallas,
              restricciones, presupuesto, ocasión e historial de regalos. El
              detalle está en la{" "}
              <Link
                href="/privacidad"
                className="underline underline-offset-2 hover:text-foreground"
              >
                política de privacidad
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-border/60 p-5">
          <h2 className="text-xl font-medium">Datos de otras personas</h2>
          <p className="text-sm text-foreground">
            Cuando añades a alguien como &laquo;ser querido&raquo; guardas datos
            de un tercero que probablemente no es usuario de PickPal. Eres tú
            quien decide qué información introducir y eres responsable de tener
            una relación legítima con esa persona y de respetar sus derechos.
            Tienes más detalle en la{" "}
            <Link
              href="/privacidad"
              className="underline underline-offset-2 hover:text-foreground"
            >
              política de privacidad
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Tus datos y la propiedad intelectual</h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              Los datos que introduces son{" "}
              <span className="text-foreground">tuyos</span>. PickPal solo los
              procesa en los términos descritos en la política de privacidad.
            </li>
            <li>
              El código, la marca, el diseño y los textos de PickPal son de
              Jorge Molina Fuster, con todos los derechos reservados. Lo que es
              de terceros está en &laquo;Créditos&raquo;.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Créditos</h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              Los avatares usan el estilo &laquo;Dylan&raquo; de{" "}
              <a
                href="https://www.dicebear.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                DiceBear
              </a>
              , una adaptación de &laquo;
              <a
                href="https://www.figma.com/community/file/1356575240759683500"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Dylan! The Avatar Generator
              </a>
              &raquo;, de{" "}
              <a
                href="https://nataspvk.tilda.ws/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Natalia Spivak
              </a>
              , con licencia{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                CC BY 4.0
              </a>
              .
            </li>
            <li>
              Las fotos de las ideas de regalo vienen de{" "}
              <a
                href="https://www.pexels.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Pexels
              </a>{" "}
              y son de sus autores.
            </li>
            <li>
              Los logos de tiendas y marcas pertenecen a sus propietarios y
              solo se usan para identificarlas.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Disponibilidad del servicio</h2>
          <p className="text-sm text-foreground">
            PickPal se ofrece &laquo;tal cual&raquo; y &laquo;según
            disponibilidad&raquo;. Es un proyecto personal y gratuito: podemos
            modificar, suspender o discontinuar funcionalidades, y no
            garantizamos una disponibilidad ininterrumpida.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Limitación de responsabilidad</h2>
          <p className="text-sm text-foreground">
            En la medida permitida por la ley, PickPal no se responsabiliza de
            daños indirectos, lucro cesante o pérdida de datos derivados del uso
            o de la imposibilidad de uso del servicio, del uso que hagas de las
            recomendaciones, ni de los datos que introduzcas sobre terceros sin
            la legitimación adecuada. Estas limitaciones no afectan a los
            derechos del consumidor que sean irrenunciables por ley.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Baja del servicio</h2>
          <p className="text-sm text-foreground">
            Puedes dar de baja tu cuenta en cualquier momento desde{" "}
            <Link
              href="/settings"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Ajustes
            </Link>
            , con &laquo;Eliminar mi cuenta&raquo;. Esto borra de forma
            permanente tus datos en PickPal y cierra tu cuenta. La política de
            privacidad explica qué pasa con las fichas compartidas y con tu
            lista.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Cambios en estos términos</h2>
          <p className="text-sm text-foreground">
            Podemos actualizar estos términos para reflejar cambios en el
            servicio o en la normativa. Publicaremos la versión vigente en esta
            página y, si el cambio es sustancial, te avisaremos con antelación
            razonable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Ley aplicable</h2>
          <p className="text-sm text-foreground">
            Estos términos se rigen por la legislación española y de la Unión
            Europea. Como consumidor, conservas el derecho a acudir a los
            tribunales de tu domicilio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Contacto</h2>
          <p className="text-sm text-foreground">
            Para cualquier duda sobre estos términos, escribe a{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:pickpal@jorgemolinafuster.com"
            >
              pickpal@jorgemolinafuster.com
            </a>
            .
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Última actualización: 10 de octubre de 2026.
        </p>
      </main>

      <footer className="px-6 py-8 text-center text-xs text-muted-foreground">
        <BackLink fallbackHref="/" icon={false} />
      </footer>
    </div>
  );
}
