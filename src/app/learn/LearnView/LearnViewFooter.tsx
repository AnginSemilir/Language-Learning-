import { Button } from "@/components/ui/Button";
import { Group } from "@/components/ui/Group";
import i18n from "@/i18n";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { LearnController } from "@/logic/learn";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { IconArrowBackUp } from "@tabler/icons-react";
import { Rating } from "fsrs.js";
import { t } from "i18next";
import AnswerCardButton from "./AnswerCardButton";
import "./LearnViewFooter.css";

const BASE = "learn-view-footer";

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
const MINUTE_IN_MILLISECONDS = 1000 * 60;

interface LearnViewFooterProps {
  controller: LearnController;
  answer: Function;
}

function timeStringForRating(rating: Rating, controller: LearnController) {
  if (!controller.currentCardRepeatInfo) {
    return "";
  }
  const rtf = new Intl.RelativeTimeFormat(i18n.language, {
    style: "short",
    numeric: "auto",
  });

  const timeDifference =
    controller.currentCardRepeatInfo[rating]?.card.due.getTime() - Date.now();
  if (timeDifference >= DAY_IN_MILLISECONDS * 30) {
    return rtf.format(
      Math.round(timeDifference / (DAY_IN_MILLISECONDS * 30)),
      "month"
    );
  } else if (timeDifference >= DAY_IN_MILLISECONDS * 0.9) {
    return rtf.format(Math.round(timeDifference / DAY_IN_MILLISECONDS), "day");
  } else {
    return (
      "~ " +
      rtf.format(Math.round(timeDifference / MINUTE_IN_MILLISECONDS), "minute")
    );
  }
}

const RATING_BUTTONS = [
  { rating: Rating.Again, label: "learning.rate-again", color: "red" },
  { rating: Rating.Hard, label: "learning.rate-hard", color: "yellow" },
  { rating: Rating.Good, label: "learning.rate-good", color: "green" },
  { rating: Rating.Easy, label: "learning.rate-easy", color: "blue" },
] as const;

function LearnViewFooter({ controller, answer }: LearnViewFooterProps) {
  const [enableHardAndEasy] = useSetting("#learn_enableHardAndEasy");

  // Number keys follow the buttons on screen: 1–4 with Hard and Easy, 1–2
  // without (3 still means Good, as in Anki).
  const buttons = RATING_BUTTONS.filter(
    (b) =>
      enableHardAndEasy ||
      (b.rating !== Rating.Hard && b.rating !== Rating.Easy)
  ).map((b, i) => ({ ...b, key: String(i + 1) }));

  const rate = (rating: Rating) => () => {
    if (controller.showingAnswer) answer(rating);
  };
  const showOrGood = () =>
    !controller.showingAnswer ? controller.showAnswer() : answer(Rating.Good);

  const hotkeys: [string, () => void][] = [
    ...buttons.map((b): [string, () => void] => [b.key, rate(b.rating)]),
    ...(enableHardAndEasy
      ? []
      : [["3", rate(Rating.Good)] as [string, () => void]]),
    ["Space", showOrGood],
    ["Enter", showOrGood],
  ];

  useHotkeys(!controller.isFinished ? hotkeys : []);

  // On phones Back sits here, next to the thumb, instead of in the header.
  const back = (
    <button
      type="button"
      className={`${BASE}__back`}
      onClick={() => controller.undo()}
      disabled={!controller.canUndo}
      aria-label="Back: undo your last answer"
    >
      <IconArrowBackUp size={22} />
    </button>
  );

  return (
    <Group className={BASE} justify="center">
      {back}
      {controller.showingAnswer ? (
        <div className={BASE + "__buttons"}>
          {buttons.map((b) => (
            <AnswerCardButton
              key={b.rating}
              label={t(b.label)}
              timeInfo={timeStringForRating(b.rating, controller)}
              color={b.color}
              shortcut={b.key}
              action={() => answer(b.rating)}
            />
          ))}
        </div>
      ) : (
        <Button
          onClick={controller.showAnswer}
          className={`${BASE}__show-answer`}
          variant="primary"
          rightSection={<kbd className={`${BASE}__key`}>Space</kbd>}
        >
          {t("learning.show-answer")}
        </Button>
      )}
    </Group>
  );
}

export default LearnViewFooter;
