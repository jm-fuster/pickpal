import { IdeaExampleCard } from "@/components/landing/IdeaExampleCard";
import { MockFrame } from "@/components/landing/MockFrame";
import { beat, reveal } from "@/components/landing/motion";
import { HistoryCard } from "@/components/landing/mocks/GivenMock";
import { NEXT_YEAR_IDEA } from "@/components/landing/sample";
import { cn } from "@/lib/utils";

const LABEL =
  "Ejemplo del año siguiente: con el historial de Marta delante, en el que la maceta le encantó y la vela aromática no, PickPal propone una cafetera de filtro de cerámica para su rincón del café.";

/**
 * Capítulo 4, al año siguiente: el historial que dejó el capítulo 3, ya
 * quieto, y una idea de la tanda nueva que se posa al lado. Es lo que
 * distingue a PickPal de una lista de ideas y era el único capítulo sin
 * imagen. La tarjeta es la misma que la del selector (GiftRecommendationCard).
 */
export function NextYearMock({ className }: { className?: string }) {
  return (
    <MockFrame label={LABEL} className={cn("mt-8", className)} {...reveal()}>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <HistoryCard />
        <div {...beat("settle", 400)}>
          <IdeaExampleCard idea={NEXT_YEAR_IDEA} type={NEXT_YEAR_IDEA.type} />
        </div>
      </div>
    </MockFrame>
  );
}
