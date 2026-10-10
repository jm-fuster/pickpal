import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { BackLink } from "@/components/layout/BackLink";
import { AnalyticsOptOut } from "@/components/analytics-opt-out";

export const metadata = {
  title: "Privacidad · PickPal",
  description:
    "Cómo trata PickPal los datos personales tuyos y de las personas que añades.",
};

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-medium">Privacidad</h1>
          <p className="text-sm text-foreground">
            Esta página describe en lenguaje llano qué datos guardamos, dónde
            van y qué puedes hacer con ellos.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Quién es el responsable</h2>
          <p className="text-sm text-foreground">
            PickPal es un proyecto personal de Jorge Molina Fuster, que es el
            responsable del tratamiento de los datos. Para cualquier cuestión
            de privacidad puedes escribirle a{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:pickpal@jorgemolinafuster.com"
            >
              pickpal@jorgemolinafuster.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Qué datos guardamos</h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              <span className="text-foreground">Tu cuenta:</span> email y datos
              básicos que gestiona Clerk para autenticarte.
            </li>
            <li>
              <span className="text-foreground">Tus seres queridos:</span> los
              datos que tú decides introducir sobre las personas a las que vas
              a regalar — nombre, relación, intereses, notas, tallas,
              alergias, fechas importantes y presupuestos.
            </li>
            <li>
              <span className="text-foreground">Tu historial de regalos</span>{" "}
              y las recomendaciones que la IA ha generado para ti.
            </li>
            <li>
              <span className="text-foreground">Tu lista:</span> lo que apuntas
              en &laquo;Mi lista&raquo; que te haría ilusión recibir, con quién
              la compartes y, en las listas que otras personas te comparten, lo
              que marcas para regalarles.
            </li>
            <li>
              <span className="text-foreground">Tus ajustes:</span>{" "}
              preferencias de notificaciones por correo y tiendas favoritas. El
              tema claro u oscuro se queda en tu navegador, no llega a nuestros
              servidores.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">
            Para qué los usamos y con qué base legal
          </h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              <span className="text-foreground">Darte el servicio</span> —tu
              cuenta, tu libreta, las ideas de regalo, compartir fichas y tu
              lista—: es la
              ejecución del contrato que aceptas al registrarte (art. 6.1.b del
              RGPD).
            </li>
            <li>
              <span className="text-foreground">
                Los datos de tus seres queridos:
              </span>{" "}
              el interés legítimo, tuyo y nuestro, en ayudarte a recordar sus
              fechas y acertar con sus regalos (art. 6.1.f). Solo guardamos lo
              que tú decides apuntar y no lo usamos para nada más.
            </li>
            <li>
              <span className="text-foreground">Los avisos por correo:</span>{" "}
              tu consentimiento (art. 6.1.a), que das al activarlos en Ajustes.
              Puedes retirarlo cuando quieras desactivándolos allí; cada correo
              trae el enlace.
            </li>
            <li>
              <span className="text-foreground">Seguridad y uso:</span> los
              límites diarios, los registros de errores y la analítica agregada
              de Vercel se basan en nuestro interés legítimo en evitar abusos y
              saber qué partes de la app se usan (art. 6.1.f).
            </li>
          </ul>
          <p className="text-sm text-foreground">
            Para crear la cuenta necesitas un email; todo lo demás es opcional.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Quién procesa esos datos</h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              <span className="text-foreground">Clerk</span> — autenticación y
              gestión de cuentas. Su verificación anti-bot se carga desde
              Cloudflare, que ve tu IP cuando entras en las pantallas de acceso.
            </li>
            <li>
              <span className="text-foreground">Convex</span> — base de datos
              donde se guardan los seres queridos, eventos y ajustes.
            </li>
            <li>
              <span className="text-foreground">Vercel</span> — aloja la web y
              recoge una analítica de uso agregada que no usa cookies ni te
              identifica personalmente.
            </li>
            <li>
              <span className="text-foreground">Google (Gemini)</span> — genera
              las ideas de regalo. Cada vez que pulsas &laquo;generar
              ideas&raquo; recibe la ficha de ese ser querido: su nombre de pila
              (nunca los apellidos), la relación contigo, sus intereses y
              marcas favoritas, tus notas tal como las escribiste, las tallas,
              las alergias o restricciones, lo que no le gusta, el presupuesto,
              la ocasión, el historial de regalos anteriores con su reacción y
              las categorías de ideas que hayas descartado. Google trata estos
              datos como encargado: no los usa para entrenar ni mejorar sus modelos
              y solo los conserva hasta 55 días para detectar abusos de su
              servicio; únicamente si sus sistemas marcan un posible abuso
              puede revisarlos personal autorizado de Google. Aun así, salen de
              PickPal: no escribas en las notas nada que no quieras compartir
              con Google.
            </li>
            <li>
              <span className="text-foreground">Resend</span> — envía los
              correos de aviso si activas las notificaciones. Para escribirlos
              recibe tu email, el nombre del ser querido, el evento y su fecha
              y, si esa persona te ha compartido su lista, cuántas cosas de
              ella no ha marcado nadie todavía (la cifra, nunca cuáles son).
            </li>
            <li>
              <span className="text-foreground">Brandfetch</span> — busca la web
              oficial de las marcas favoritas que anotas, para poder enlazarte a
              su tienda. Solo recibe el nombre de la marca (p. ej.
              &laquo;Nike&raquo;), nunca datos de tu ser querido. Su servidor
              sirve además los logos que ves en las ideas, así que ve tu IP al
              cargarlos.
            </li>
            <li>
              <span className="text-foreground">Pexels</span> — pone las
              fotos que ilustran las ideas de regalo. Solo recibe búsquedas
              genéricas en inglés (p. ej. &laquo;wireless headphones&raquo;),
              nunca el nombre ni los datos de tu ser querido. Al mostrar las
              fotos, tu navegador las descarga directamente de sus
              servidores, que ven tu IP — como al cargar cualquier imagen
              externa.
            </li>
            <li>
              <span className="text-foreground">DiceBear</span> — genera los
              avatares ilustrados. No recibe el nombre ni la ficha de la
              persona, pero los rasgos que eliges para el dibujo (tono de piel,
              pelo, expresión) viajan en la dirección de la imagen. Tu navegador
              la carga directamente de sus servidores, que ven tu IP; en los
              correos de aviso la carga tu gestor de correo.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">
            Transferencias fuera de la Unión Europea
          </h2>
          <p className="text-sm text-foreground">
            Clerk, Convex, Google, Vercel y Resend son empresas de Estados
            Unidos, así que tus datos pueden tratarse allí. Todas tienen al
            menos una de estas dos garantías: están adheridas al Marco de
            Privacidad de Datos UE-EE. UU., que la Comisión Europea declaró
            adecuado el 10 de julio de 2023, o han incorporado a su contrato
            las cláusulas contractuales tipo aprobadas por la Comisión. Si
            quieres una copia de esas cláusulas, pídenosla en el contacto de
            abajo.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-border/60 p-5">
          <h2 className="text-xl font-medium">
            Importante: datos de otras personas
          </h2>
          <p className="text-sm text-foreground">
            Cuando añades a alguien como &laquo;ser querido&raquo;, estás
            guardando datos de un tercero que probablemente no es usuario de
            PickPal y no ha dado su consentimiento aquí.
          </p>
          <p className="text-sm text-foreground">
            Eres tú quien decide qué información introducir y eres
            responsable de que esa persona sepa que estás usando un servicio
            como este para acordarte de sus fechas y pensar en regalos. Si
            alguien te pide quitar sus datos, puedes hacerlo desde su ficha o
            eliminando tu cuenta entera.
          </p>
          <p className="text-sm text-foreground">
            <span className="text-foreground">
              Si alguien te ha añadido a PickPal
            </span>{" "}
            y quieres saber qué datos tuyos hay, oponerte a que se usen o que
            los borremos, escribe a{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:pickpal@jorgemolinafuster.com"
            >
              pickpal@jorgemolinafuster.com
            </a>
            . Para encontrarlos nos ayuda saber tu nombre y, si lo sabes, quién
            te añadió. Te responderemos en un plazo máximo de un mes. Esta
            página es pública para que puedas leerla sin tener cuenta.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">
            Compartir con otra persona usuaria de PickPal
          </h2>
          <p className="text-sm text-foreground">
            Puedes compartir la ficha de un ser querido con otra persona que
            tenga cuenta en PickPal — por ejemplo, un hermano con el que
            coordinas los regalos de vuestros padres. Antes de compartir, la
            propia pantalla te dice qué va a poder ver: la ficha entera,
            incluidas las <strong>alergias o restricciones</strong>, que
            pueden ser un dato de salud.
          </p>
          <p className="text-sm text-foreground">
            Quien recibe el acceso ve y edita la ficha igual que tú: intereses,
            marcas favoritas, notas, tallas, alergias, fechas, historial de
            regalos e ideas guardadas — estas dos últimas quedan con la
            autoría de quien las añadió. Las tandas de ideas que genera la IA
            <strong> no</strong> se comparten: cada persona genera y ve las
            suyas.
          </p>
          <p className="text-sm text-foreground">
            Solo quien creó la ficha puede compartirla o borrarla para todos.
            Quien la recibe compartida puede dejar de verla cuando quiera, sin
            que desaparezca para el resto. Si quien la creó cierra su cuenta,
            la ficha no se borra: pasa a ser de la persona invitada más
            antigua, para no borrarle sus datos por una decisión que no tomó
            ella.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Tu lista</h2>
          <p className="text-sm text-foreground">
            En &laquo;Mi lista&raquo; apuntas lo que te haría ilusión recibir:
            qué es y, si quieres, un enlace y una nota. Solo la ven las
            personas con cuenta en PickPal a las que tú invitas, hasta un
            máximo de 20. Junto a la lista ven tu nombre y tu email, para saber
            quién se la comparte. Ninguna sabe quién más la lee. PickPal nunca
            abre los enlaces que apuntas: solo los guarda.
          </p>
          <p className="text-sm text-foreground">
            Quien la lee puede marcar lo que va a regalarte.{" "}
            <strong>Tú no ves esas marcas</strong>, ni en la app ni en el
            archivo de &laquo;Descargar mis datos&raquo;: son de quien las hace,
            y enseñártelas estropearía la sorpresa. Puedes quitarle el acceso a
            cualquiera cuando quieras, y sus marcas se borran con él.
          </p>
          <p className="text-sm text-foreground">
            Si borras algo que alguien ya había marcado, esa persona sigue
            viendo una copia (qué era, el enlace y la nota) hasta que quita su
            marca. Y si alguien apunta en su historial de regalos que te regaló
            algo de tu lista, esa entrada es de su libreta: no se borra con el
            elemento ni con tu cuenta.
          </p>
          <p className="text-sm text-foreground">
            Tu lista no se envía a Google Gemini. El único dato suyo que sale
            de PickPal es una cifra: el correo de aviso de quien te tiene en su
            libreta puede decir cuántas cosas de tu lista no ha marcado nadie,
            nunca cuáles. Si cierras tu cuenta, tu lista se borra entera, con
            sus accesos y sus marcas, y no pasa a nadie.
          </p>
          <p className="text-sm text-foreground">
            Si alguien te comparte su lista, lo que marcas no lo ve quien la
            escribió. Si dejas una lista o te quitan el acceso, tus marcas se
            borran.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Cookies</h2>
          <p className="text-sm text-foreground">
            Solo usamos cookies técnicas necesarias para mantener tu sesión
            iniciada (las gestiona Clerk). No usamos cookies de publicidad ni de
            seguimiento, así que no hace falta un banner de cookies.
          </p>
          <p className="text-sm text-foreground">
            La analítica de Vercel funciona sin cookies y solo cuenta visitas
            de forma agregada, sin identificarte. Si no quieres que cuente las
            tuyas, desactiva &laquo;Contar mis visitas&raquo; aquí abajo, o
            activa en tu navegador la señal &laquo;Global Privacy
            Control&raquo; o &laquo;No rastrear&raquo;. En los dos casos tu
            visita no se registra.
          </p>
          <AnalyticsOptOut />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Cuánto lo conservamos</h2>
          <p className="text-sm text-foreground">
            Todo lo que guardas se conserva mientras tu cuenta esté activa. Si
            eliminas tu cuenta, se borra de nuestra base de datos en ese mismo
            momento, sin periodo de gracia; las copias de seguridad de nuestros
            proveedores pueden tardar algo más en reciclarse. Google conserva
            hasta 55 días lo que recibe para generar ideas, solo para detectar
            abusos; lo que se envió a Resend para escribir un correo se rige
            por su propia política de conservación.
          </p>
          <p className="text-sm text-foreground">
            Excepción: si habías compartido una ficha con otra persona
            usuaria, esa ficha no se borra al cerrar tu cuenta — pasa a ser de
            esa persona, para no borrarle sus propios datos por una decisión
            que no tomó ella. Por el mismo motivo, lo que añadiste a fichas
            que otras personas compartieron contigo (entradas del historial e
            ideas guardadas) se queda en esas fichas, sin tu nombre ni tu
            email.
          </p>
          <p className="text-sm text-foreground">
            Tu lista no tiene esa excepción: al cerrar la cuenta se borra
            entera. Lo único que sobrevive son las entradas que otras personas
            hayan apuntado en su propio historial de regalos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Menores</h2>
          <p className="text-sm text-foreground">
            PickPal es solo para mayores de 18 años. Si detectamos la cuenta de
            un menor, la eliminaremos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Tus derechos</h2>
          <p className="text-sm text-foreground">
            Como titular de los datos tienes derecho de acceso, rectificación,
            supresión, oposición, limitación del tratamiento y portabilidad.
            Puedes ejercerlos así:
          </p>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            <li>
              <span className="text-foreground">Acceso y modificación:</span>{" "}
              todos tus datos son visibles y editables desde la app.
            </li>
            <li>
              <span className="text-foreground">Borrado:</span> en{" "}
              <Link
                href="/settings"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Ajustes
              </Link>{" "}
              tienes &laquo;Eliminar mi cuenta&raquo;, que borra de forma
              permanente tus datos en PickPal y cierra tu cuenta, con las
              excepciones de las fichas compartidas que explica
              &laquo;Cuánto lo conservamos&raquo;.
            </li>
            <li>
              <span className="text-foreground">Exportación:</span> en{" "}
              <Link className="underline underline-offset-4" href="/settings">
                Ajustes
              </Link>{" "}
              tienes &laquo;Descargar mis datos&raquo;, que te da un archivo JSON
              con todo lo que guardamos de ti.
            </li>
            <li>
              <span className="text-foreground">
                Oposición y limitación:
              </span>{" "}
              para cualquier otro derecho, escríbenos al contacto de abajo.
            </li>
          </ul>
          <p className="text-sm text-foreground">
            Si crees que no hemos atendido bien tus derechos, puedes reclamar
            ante la{" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Agencia Española de Protección de Datos
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Contacto</h2>
          <p className="text-sm text-foreground">
            Para cualquier duda sobre tus datos, o para ejercer cualquiera de
            los derechos de arriba, escribe a{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:pickpal@jorgemolinafuster.com"
            >
              pickpal@jorgemolinafuster.com
            </a>
            . Respondemos en un plazo máximo de un mes.
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
