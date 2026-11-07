import { Deck } from "@/logic/deck/deck";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeckPreview from "./DeckPreview";

import EmptyNotice from "@/components/EmptyNotice";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { IconCards } from "@tabler/icons-react";
import "./DeckTable.css";

interface DeckTableProps {
  deckList?: Deck[];
  isReady: boolean;
}

const BASE = "deck-table";

function DeckTable({ deckList, isReady }: DeckTableProps) {
  const [t] = useTranslation();

  const navigate = useNavigate();
  // Sorted copy (the list from the database is not changed), so the number
  // keys open the decks in the order they're shown.
  const sorted = useMemo(() => {
    if (!deckList) return undefined;
    return [...deckList].sort((a, b) => a.name.localeCompare(b.name));
  }, [deckList]);
  useHotkeys(
    sorted
      ?.slice(0, 9)
      .map((d, i) => [(i + 1).toString(), () => navigate(`/deck/${d.id}`)]) ??
      []
  );

  return isReady && sorted ? (
    sorted.length !== 0 ? (
      <div className={BASE}>
        {sorted.map((deck, index) => (
          <DeckPreview key={deck.id} deck={deck} i={index} />
        ))}
      </div>
    ) : (
      <EmptyNotice icon={IconCards} title={t("home.no-decks-found")} />
    )
  ) : (
    <span>Loading...</span>
  );
}

export default DeckTable;
