// Reading library: Lector's 20 graded Indonesian starter lessons, plus texts,
// subtitles and books the user adds (Lector's paste/EPUB import flow).
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Button, Paper, Text } from "@/components/ui";
import {
  deleteLesson,
  ensureStarterLessons,
  saveLessons,
} from "@/lector/data-layer";
import { getKnownWords } from "@/lector/knownWords";
import type { Lesson } from "@/lector/types";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { IconChevronRight, IconPlus, IconTrash } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import PasteLessonModal from "./PasteLessonModal";
import "./reading.css";

function progress(l: Lesson) {
  if (l.finishedAt) return "finished";
  if (l.pageCount && l.lastPage !== undefined && l.lastPage > 0) {
    return `page ${l.lastPage + 1} of ${l.pageCount}`;
  }
  return l.lastReadAt ? "started" : "";
}

function LessonRow({
  lesson,
  number,
  onDelete,
}: {
  lesson: Lesson;
  number?: number;
  onDelete?: () => void;
}) {
  const navigate = useNavigate();
  const status = progress(lesson);
  return (
    <Paper withBorder className="library-view__item">
      <button
        type="button"
        className="library-view__open"
        onClick={() => navigate(`/read/${lesson.id}`)}
      >
        {number !== undefined && (
          <span className="library-view__number">{number}</span>
        )}
        <span className="library-view__title">{lesson.title}</span>
        {status && <span className="library-view__progress">{status}</span>}
      </button>
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete ${lesson.title}`}
          onClick={onDelete}
        >
          <IconTrash size={16} />
        </Button>
      )}
    </Paper>
  );
}

export default function LibraryView() {
  useDocumentTitle("Read");
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  useEffect(() => {
    ensureStarterLessons();
  }, []);

  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const knownCount = useLiveQuery(
    async () => (await getKnownWords()).length,
    []
  );

  const own = (lessons ?? []).filter((l) => l.source === "paste");
  const singles = own
    .filter((l) => !l.collection)
    .sort((a, b) => +b.createdAt - +a.createdAt);
  const books = new Map<string, Lesson[]>();
  for (const l of own.filter((l) => l.collection)) {
    const list = books.get(l.collection as string) ?? [];
    list.push(l);
    books.set(l.collection as string, list);
  }
  for (const list of books.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  const starter = (lessons ?? [])
    .filter((l) => l.source === "starter")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Read" }]} />
        <Button
          variant="ghost"
          leftSection={<IconPlus />}
          onClick={() => setAddOpen(true)}
        >
          Add text
        </Button>
      </AppHeaderContent>

      <div className="library-view">
        <p className="library-view__intro">
          Tap any word to hear it, see its meaning and add it to your
          flashcards. Swipe to turn the page; words you didn't look up can be
          marked as known as you go.
        </p>

        <Paper withBorder className="library-view__known">
          <button
            type="button"
            className="library-view__open"
            onClick={() => navigate("/read/known")}
          >
            <span className="library-view__title">Known words</span>
            <span className="library-view__progress">
              {knownCount ?? 0} words
            </span>
          </button>
          <IconChevronRight size={18} />
        </Paper>

        {singles.length > 0 && (
          <section>
            <h2 className="library-view__heading">Your texts</h2>
            <div className="library-view__list">
              {singles.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  onDelete={() => deleteLesson(l.id)}
                />
              ))}
            </div>
          </section>
        )}

        {[...books].map(([title, chapters]) => (
          <section key={title}>
            <h2 className="library-view__heading">{title}</h2>
            {chapters[0]?.author && <Text size="sm">{chapters[0].author}</Text>}
            <div className="library-view__list">
              {chapters.map((l, i) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  number={i + 1}
                  onDelete={() => deleteLesson(l.id)}
                />
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="library-view__heading">Starter course</h2>
          <Text size="sm">
            20 graded stories using the 1,000 most common words, from Lector.
          </Text>
          <div className="library-view__list">
            {starter.map((l, i) => (
              <LessonRow key={l.id} lesson={l} number={i + 1} />
            ))}
          </div>
        </section>
      </div>

      <PasteLessonModal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (items) => {
          const ids = await saveLessons(items);
          setAddOpen(false);
          if (ids[0]) navigate(`/read/${ids[0]}`);
        }}
      />
    </>
  );
}
