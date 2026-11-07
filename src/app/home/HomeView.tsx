import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import EmptyNotice from "@/components/EmptyNotice";
import { Button, Kbd, Tooltip } from "@/components/ui";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { useDueToday } from "@/logic/deck/hooks/useDueToday";
import { useTopLevelDecks } from "@/logic/deck/hooks/useTopLevelDecks";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import {
  IconBolt,
  IconBook,
  IconChevronRight,
  IconDeviceGamepad2,
  IconFolder,
  IconPencil,
  IconPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeckModal from "../deck/DeckModal";
import DeckTable from "../deck/DeckTable";
import { AppHeaderContent } from "../shell/Header/Header";
import Island from "../world/Island";
import { LevelBadge, QuestList, StreakChip, XpBar } from "../world/WorldBits";
import { useIsland } from "../world/useIsland";
import { usePhase } from "../world/usePhase";
import "./HomeView.css";

const BASE = "home-view";

/** Selamat pagi, siang, sore or malam, by the time of day. */
function greeting(hour: number): [string, string] {
  if (hour >= 4 && hour < 10) return ["Selamat pagi", "Good morning"];
  if (hour >= 10 && hour < 15) return ["Selamat siang", "Good day"];
  if (hour >= 15 && hour < 18) return ["Selamat sore", "Good afternoon"];
  return ["Selamat malam", "Good evening"];
}

function Action({
  icon,
  title,
  detail,
  onClick,
  tone,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  tone: "green" | "orange" | "blue" | "violet";
}) {
  return (
    <button
      type="button"
      className={`${BASE}__action ${BASE}__action--${tone}`}
      onClick={onClick}
    >
      <span className={`${BASE}__action-icon`}>{icon}</span>
      <span className={`${BASE}__action-text`}>
        <span className={`${BASE}__action-title`}>{title}</span>
        <span className={`${BASE}__action-detail`}>{detail}</span>
      </span>
      <IconChevronRight className={`${BASE}__action-arrow`} size={18} />
    </button>
  );
}

export default function HomeView() {
  useDocumentTitle("Kartu");
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [newDeckModalOpened, setNewDeckModalOpened] = useState(false);
  const [decks, isReady] = useTopLevelDecks();
  const [userName, userNameIsReady] = useSetting("#name");
  const island = useIsland();
  const world = island?.world;
  const phase = usePhase();
  const due = useDueToday(decks);
  const [hello, english] = greeting(new Date().getHours());

  useHotkeys([["n", () => setNewDeckModalOpened(true)]]);

  const review = () => {
    if (due?.deck) navigate(`/learn/${due.deck.id}`);
    else if (decks?.[0]) navigate(`/deck/${decks[0].id}`);
    else setNewDeckModalOpened(true);
  };
  let reviewDetail = "Loading…";
  if (due && due.total > 0) reviewDetail = `${due.total} cards for today`;
  else if (due && decks?.length) reviewDetail = "All done for today";
  else if (due) reviewDetail = "Make your first deck";
  // Hidden until the name has loaded, so the greeting doesn't change.
  const welcomeClass = userNameIsReady
    ? `${BASE}__welcome`
    : `${BASE}__welcome invisible`;
  const subtitle = `${english}. Here's your island today.`;
  const surprises = island?.unseen.length ?? 0;

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs />
        <Tooltip
          label={
            <>
              {t("deck.create-deck-tooltip")}
              <Kbd>n</Kbd>
            </>
          }
          position="left"
        >
          <Button
            onClick={() => setNewDeckModalOpened(true)}
            leftSection={<IconPlus />}
            variant="ghost"
          >
            {t("deck.new-deck-button")}
          </Button>
        </Tooltip>
      </AppHeaderContent>

      <div className={`${BASE}__content`}>
        <section className={welcomeClass}>
          <h1 className={`${BASE}__title`} lang="id">
            {userName ? `${hello}, ${userName}!` : `${hello}!`}
          </h1>
          <p className={`${BASE}__subtitle`}>{subtitle}</p>
        </section>

        <button
          type="button"
          className={`${BASE}__world`}
          onClick={() => navigate("/world")}
          aria-label="Open Pulau Kata, your island"
        >
          {island ? (
            <Island scene={island.scene} phase={phase} />
          ) : (
            <div className={`${BASE}__world-placeholder`} />
          )}
          {surprises > 0 && (
            <span className={`${BASE}__surprise`}>
              <IconSparkles size={16} />
              {surprises === 1 ? "1 kejutan baru" : `${surprises} kejutan baru`}
            </span>
          )}
          {world && (
            <span className={`${BASE}__world-bar`}>
              <LevelBadge level={world.level.level} />
              <XpBar level={world.level} />
              <StreakChip
                days={world.streak.current}
                active={world.studiedToday}
              />
            </span>
          )}
        </button>

        <div className={`${BASE}__actions`}>
          <Action
            icon={<IconBolt />}
            title="Review"
            detail={reviewDetail}
            onClick={review}
            tone="green"
          />
          <Action
            icon={<IconDeviceGamepad2 />}
            title="Play"
            detail="Two word games"
            onClick={() => navigate("/games")}
            tone="orange"
          />
          <Action
            icon={<IconBook />}
            title="Read"
            detail="Stories and your texts"
            onClick={() => navigate("/read")}
            tone="blue"
          />
          <Action
            icon={<IconPencil />}
            title="Practise"
            detail="Fill in the gap"
            onClick={() => navigate("/practice")}
            tone="violet"
          />
        </div>

        {world && (
          <section className={`${BASE}__quests`}>
            <QuestList quests={world.quests} compact />
          </section>
        )}

        <section className={`${BASE}__decks`}>
          <div className={`${BASE}__decks-head`}>
            <h2 className={`${BASE}__heading`}>Your decks</h2>
            <Button
              onClick={() => setNewDeckModalOpened(true)}
              leftSection={<IconPlus />}
              variant="default"
              size="sm"
            >
              {t("deck.new-deck-button")}
            </Button>
          </div>
          {isReady && decks?.length === 0 ? (
            <div className={`${BASE}__empty-state`}>
              <EmptyNotice
                icon={IconFolder}
                description={t("home.no-decks-found")}
              />
              <Button
                onClick={() => setNewDeckModalOpened(true)}
                leftSection={<IconPlus />}
                variant="primary"
                autoFocus
              >
                {t("deck.new-deck-button")}
              </Button>
            </div>
          ) : (
            <DeckTable deckList={decks} isReady={isReady} />
          )}
        </section>
      </div>
      <DeckModal
        mode="create"
        opened={newDeckModalOpened}
        setOpened={setNewDeckModalOpened}
      />
    </>
  );
}
