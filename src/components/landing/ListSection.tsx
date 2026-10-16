import { ListOwnerMock, ListReaderMock } from "@/components/landing/mocks/ListMock";
import { reveal } from "@/components/landing/motion";
import { ListIllustration } from "@/components/landing/StepIllustrations";

/**
 * «Mi lista» en la landing: la de Marta por los dos lados, con lo que ve ella
 * a la izquierda, quieto, y lo que marcas tú a la derecha. Al final, la tuya.
 */
export function ListSection() {
  return (
    <section aria-labelledby="lista-titulo">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="w-fit" {...reveal("settle")}>
            <ListIllustration className="h-16 w-auto" />
          </div>
          <h2 id="lista-titulo" className="mt-4 text-3xl leading-tight font-medium text-balance lg:text-4xl">
            Tú marcas lo que le vas a regalar. Ella no lo ve.
          </h2>
          {/* «La guardas» y no «la tienes»: la lista recibida entra en una ficha
              cuando eliges cuál (IncomingListCard), no sola. */}
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Si Marta te comparte su lista, la guardas en su ficha, junto a sus fechas y a lo que pensabas gastar.
            Cuando marcas «Lo regalo yo», quienes la leen ven que ya está cogido, y Marta no se entera.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-start">
          <div>
            <p className="mb-3 text-sm font-medium">Así la ve Marta</p>
            <ListOwnerMock {...reveal("rise", 0)} />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Así la ves tú</p>
            <ListReaderMock {...reveal("rise", 1)} />
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-base leading-relaxed text-muted-foreground">
          También puedes hacer la tuya. Apunta lo que te haría ilusión, o pega una lista que ya tengas en otra app o en
          una nota, y compártela por email con quien te regala. Quien la lea necesita cuenta en PickPal, y puedes quitarle
          el acceso cuando quieras.
        </p>
      </div>
    </section>
  );
}
