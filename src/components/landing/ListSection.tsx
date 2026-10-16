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
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6 lg:px-8 lg:pt-8 lg:pb-24">
        <div className="max-w-2xl">
          <div className="w-fit" {...reveal("settle")}>
            <ListIllustration className="h-16 w-auto" />
          </div>
          <h2 id="lista-titulo" className="mt-4 text-3xl leading-tight font-medium text-balance lg:text-4xl">
            Tú marcas lo que le vas a regalar. Ella no lo ve.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">
            Si Marta te comparte su lista, marcas «Lo&nbsp;regalo&nbsp;yo» y quienes la leen ven que ya está cogido.
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

        <p className="mt-10 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground">
          También puedes hacer la tuya y compartirla con quien te regala, si tiene cuenta en PickPal.
        </p>
      </div>
    </section>
  );
}
