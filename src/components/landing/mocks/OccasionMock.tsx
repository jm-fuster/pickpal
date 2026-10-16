import { MockFrame } from "@/components/landing/MockFrame";
import { beat } from "@/components/landing/motion";
import { CompactTile, OccasionCard, PersonAvatar, StackCell } from "@/components/landing/mocks/parts";
import { OCCASION, PERSON, TILES } from "@/components/landing/sample";

const LABEL =
  "Ejemplo de la ficha de Marta en PickPal: su cumpleaños es dentro de 7 días, con un presupuesto de 30 a 60 euros, y ya tienes pensadas tres cosas: una de su lista, una idea tuya y una sugerida.";

/**
 * La réplica del hero: la cabecera de la ficha de Marta y su próxima ocasión
 * (PersonHeader + NextOccasionCard). La escena cuenta atrás 21 → 14 → 7 días;
 * a los 7 la tarjeta se vuelve urgente como en la app (URGENT_DAYS) y se posan
 * las tres cosas pensadas. Sin la fecha («· 24 sep ·») que lleva la línea real:
 * junto a una cuenta atrás, una fecha absoluta se queda vieja.
 */
export function OccasionMock({ className }: { className?: string }) {
  return (
    <MockFrame label={LABEL} className={className}>
      <div {...beat("rise", 150)}>
        <div className="mb-4 flex items-center gap-3">
          <PersonAvatar src={PERSON.avatar} className="size-10 ring-1 ring-border" />
          <div className="min-w-0">
            <p className="font-heading text-xl leading-tight font-medium">{PERSON.name}</p>
            <p className="text-sm text-muted-foreground">{PERSON.relationship}</p>
          </div>
        </div>
        <OccasionCard
          title={OCCASION.label}
          titleBeat={beat("grow", 2100, 300)}
          urgentBeat={beat("fade", 2100, 300)}
          countBeat={beat("swap-in", 2400)}
          count={TILES.length}
          meta={
            <>
              <StackCell>
                <span className="opacity-0" {...beat("blink", 300, 900)}>
                  En 21 días
                </span>
                <span className="opacity-0" {...beat("pass", 1200, 900)}>
                  En 14 días
                </span>
                <span className="font-medium text-foreground" {...beat("swap-in", 2100)}>
                  En 7 días
                </span>
              </StackCell>
              {` · ${OCCASION.budget}`}
            </>
          }
        >
          {TILES.map((tile, i) => (
            <CompactTile key={tile.title} spec={tile} {...beat("settle", 2500 + i * 120)} />
          ))}
        </OccasionCard>
      </div>
    </MockFrame>
  );
}
