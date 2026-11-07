import type { Found } from "@/logic/game/discoveries";
import {
  type StoryState,
  blueLight,
  parseStory,
  storyState,
  storyValue,
  strangerOut,
} from "@/logic/game/story";
import { useWorld } from "@/logic/game/useWorld";
import type { WorldState } from "@/logic/game/world";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import type { IslandScene } from "./Island";

export interface IslandView {
  world: WorldState;
  story: StoryState;
  scene: IslandScene;
  /** Found but not shown yet, oldest first. */
  unseen: Found[];
  /** Nothing has been shown yet: the first visit since surprises began. */
  firstVisit: boolean;
  markSeen: (found: Found[]) => Promise<void>;
  completeStep: (id: string) => Promise<void>;
}

/** Marks the list of shown discoveries as begun, even when it's empty. */
const STARTED = "*";

/**
 * The island as it stands: the world worked out from your history, plus
 * what only this app keeps (what you've been shown, how far the secret has
 * got), and the scene to draw. Undefined while loading.
 */
export function useIsland(): IslandView | undefined {
  const world = useWorld();
  const [seenValue, seenReady] = useSetting("#world_seen");
  const [storyValueNow, storyReady] = useSetting("#world_story");
  if (!world || !seenReady || !storyReady) return undefined;

  const done = parseStory(storyValueNow);
  const story = storyState(done, world.level.level);
  const seen = new Set((seenValue ?? "").split(",").filter(Boolean));
  const unseen = world.found.filter((f) => !seen.has(f.id));

  const scene: IslandScene = {
    trees: world.trees,
    farTrees: world.farTrees,
    unlocked: world.unlocked,
    next: world.next,
    villagers: world.villagers,
    campfire: world.studiedToday,
    celebrate: world.questsDone,
    animals: world.animals,
    day: world.day,
    stranger: strangerOut(story, world.day.date),
    blueLight: blueLight(story),
    treasure: story.treasure,
  };

  const markSeen = async (found: Found[]) => {
    const ids = new Set([STARTED, ...seen, ...found.map((f) => f.id)]);
    await setSetting("#world_seen", [...ids].join(","));
  };

  const completeStep = async (id: string) => {
    await setSetting("#world_story", storyValue(new Set([...done, id])));
  };

  return {
    world,
    story,
    scene,
    unseen,
    firstVisit: !seen.has(STARTED),
    markSeen,
    completeStep,
  };
}
