// Flashcards, from the menu: today's review, the ways to add and manage
// cards, and the decks.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import EmptyNotice from "@/components/EmptyNotice";
import { Button } from "@/components/ui";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { useDueToday } from "@/logic/deck/hooks/useDueToday";
import { useTopLevelDecks } from "@/logic/deck/hooks/useTopLevelDecks";
import {
  IconBolt,
  IconChartBar,
  IconFileImport,
  IconFolder,
  IconListDetails,
  IconPlus,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeckModal from "../deck/DeckModal";
import DeckTable from "../deck/DeckTable";
import ImportModal from "../settings/importexport/ImportModal";
import { AppHeaderContent } from "../shell/Header/Header";
import "./FlashcardsView.css";

const BASE = "flashcards-view";

function Shortcut({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`${BASE}__shortcut`} onClick={onClick}>
      <span className={`${BASE}__shortcut-icon`}>{icon}</span>
      {label}
    </button>
  );
}

export default function FlashcardsView() {
  useDocumentTitle("Flashcards");
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [decks, isReady] = useTopLevelDecks();
  const due = useDueToday(decks);
  const [newDeckOpened, setNewDeckOpened] = useState(false);
  const [importOpened, setImportOpened] = useState(false);
  // The deck to review, add to or import into: the one with the most cards
  // due today, else the first.
  const deck = due?.deck ?? decks?.[0];
  const hasDecks = isReady && !!decks?.length;

  let detail = "Loading…";
  if (due && due.total > 0) {
    detail = `${due.total} card${due.total === 1 ? "" : "s"} for today`;
  } else if (due && hasDecks) detail = "All done for today";
  else if (due) detail = "Make a deck to start";

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Flashcards" }]} />
      </AppHeaderContent>
      <div className={`${BASE}__content`}>
        <h1 className={`${BASE}__title`}>Flashcards</h1>

        <button
          type="button"
          className={`${BASE}__review`}
          onClick={() =>
            due?.deck
              ? navigate(`/learn/${due.deck.id}`)
              : hasDecks
                ? navigate(`/deck/${deck?.id}`)
                : setNewDeckOpened(true)
          }
        >
          <span className={`${BASE}__review-icon`}>
            <IconBolt size={22} />
          </span>
          <span className={`${BASE}__review-text`}>
            <span className={`${BASE}__review-title`}>Review</span>
            <span className={`${BASE}__review-detail`}>{detail}</span>
          </span>
        </button>

        <div className={`${BASE}__shortcuts`}>
          <Shortcut
            icon={<IconPlus size={18} />}
            label="New card"
            onClick={() =>
              deck ? navigate(`/new/${deck.id}`) : setNewDeckOpened(true)
            }
          />
          <Shortcut
            icon={<IconFileImport size={18} />}
            label="Import CSV"
            onClick={() => setImportOpened(true)}
          />
          <Shortcut
            icon={<IconListDetails size={18} />}
            label={t("manage-cards.title")}
            onClick={() => navigate("/notes")}
          />
          <Shortcut
            icon={<IconChartBar size={18} />}
            label={t("statistics.title")}
            onClick={() => navigate("/stats")}
          />
        </div>

        <section className={`${BASE}__decks`}>
          <div className={`${BASE}__decks-head`}>
            <h2 className={`${BASE}__heading`}>Your decks</h2>
            <Button
              onClick={() => setNewDeckOpened(true)}
              leftSection={<IconPlus />}
              variant="default"
              size="sm"
            >
              {t("deck.new-deck-button")}
            </Button>
          </div>
          {isReady && decks?.length === 0 ? (
            <EmptyNotice
              icon={IconFolder}
              description={t("home.no-decks-found")}
            />
          ) : (
            <DeckTable deckList={decks} isReady={isReady} />
          )}
        </section>
      </div>
      <DeckModal
        mode="create"
        opened={newDeckOpened}
        setOpened={setNewDeckOpened}
      />
      <ImportModal
        opened={importOpened}
        setOpened={setImportOpened}
        deck={deck}
      />
    </>
  );
}
