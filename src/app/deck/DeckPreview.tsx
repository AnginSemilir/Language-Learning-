import { Alert, Badge, Paper } from "@/components/ui";
import { COLORS } from "@/lib/ColorIdentifier";
import { useCardsOf } from "@/logic/card/hooks/useCardsOf";
import { buildDailyQueue } from "@/logic/dailyQueue";
import { useDailyLimits } from "@/logic/settings/dailyLimits";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Deck } from "../../logic/deck/deck";
import "./DeckPreview.css";

type DeckPreviewProps = {
  deck: Deck;
  i: number;
};

const BASE = "deck-preview";

export default function DeckPreview({ deck }: DeckPreviewProps) {
  const navigate = useNavigate();
  const [t] = useTranslation();
  const [cards] = useCardsOf(deck);
  // Today's counts, within the daily limits.
  const limits = useDailyLimits();
  const limitsKey = JSON.stringify(limits);
  // biome-ignore lint/correctness/useExhaustiveDependencies: limitsKey stands for limits.
  const states = useMemo(() => {
    const queue = buildDailyQueue(cards ?? [], limits);
    return {
      new: queue.newCards.length,
      learning: queue.learning.length,
      review: queue.reviews.length,
    };
  }, [cards, limitsKey]);

  const color = deck.color ?? COLORS[0];
  return deck ? (
    <Paper
      className={`deck-card-base deck-card-base--color-${color} ${BASE} ${BASE}--color-${color}`}
      onClick={() => navigate(`/deck/${deck.id}`)}
      withTexture
      withBorder
      id={`deck-preview-${deck.id}`}
    >
      <div className={`${BASE}__content`}>
        <h3 className={`deck-card-base__title ${BASE}__title`}>{deck.name}</h3>
        <div className={`deck-card-base__details ${BASE}__details`}>
          {states.review > 0 ? (
            <Badge variant="light">
              {t("deck.review-cards-label", { count: states.review })}
            </Badge>
          ) : (
            <></>
          )}
          {states.new > 0 ? (
            <Badge variant="light">
              {t("deck.new-cards-label", { count: states.new })}
            </Badge>
          ) : (
            <></>
          )}
          {states.learning > 0 ? (
            <Badge variant="light">
              {t("deck.learning-cards-label", {
                count: states.learning,
              })}
            </Badge>
          ) : (
            <></>
          )}
        </div>
      </div>
    </Paper>
  ) : (
    <Alert variant="error">{t("deck.error-failed-to-load")}</Alert>
  );
}
