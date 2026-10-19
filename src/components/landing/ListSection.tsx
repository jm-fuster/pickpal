import { ListOwnerMock, ListReaderMock } from "@/components/landing/mocks/ListMock";
import { reveal } from "@/components/landing/motion";

/**
 * «Mi lista» en la landing: la de Marta por los dos lados, con lo que ve ella
 * a la izquierda, quieto, y lo que marcas tú a la derecha (cada réplica lleva
 * su lado en la etiqueta). Al final, la tuya. Sin pictograma: el titular es lo
 * más fuerte de la sección y las dos réplicas ya la ilustran; por eso es el h2
 * más grande de la página después del cierre.
 */
export function ListSection() {
  return (
    <section aria-labelledby="lista-titulo">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:px-8 lg:pt-12 lg:pb-24">
        <div className="max-w-3xl">
          <h2
            id="lista-titulo"
            className="text-3xl leading-tight font-medium text-balance sm:text-4xl lg:text-5xl"
          >
            Tú marcas lo que le vas a regalar. Ella no lo ve.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Si Marta te comparte su lista, marcas «Lo&nbsp;regalo&nbsp;yo» y quienes la leen ven que ya está cogido.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-start">
          <ListOwnerMock {...reveal("rise", 0)} />
          <ListReaderMock {...reveal("rise", 1)} />
        </div>

        <p className="mt-10 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground">
          También puedes hacer la tuya y compartirla con quien te regala, si tiene cuenta en PickPal.
        </p>
      </div>
    </section>
  );
}
