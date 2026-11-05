// Reading library: Lector's 20 graded Indonesian starter lessons plus texts
// the user pastes in (Lector's PasteImportModal flow).
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Button, Paper, Text } from "@/components/ui";
import {
  deleteLesson,
  ensureStarterLessons,
  saveLesson,
} from "@/lector/data-layer";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import PasteLessonModal from "./PasteLessonModal";
import "./reading.css";

export default function LibraryView() {
  useDocumentTitle("Read");
  const navigate = useNavigate();
  const [pasteOpen, setPasteOpen] = useState(false);
  useEffect(() => {
    ensureStarterLessons();
  }, []);

  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const own = (lessons ?? [])
    .filter((l) => l.source === "paste")
    .sort((a, b) => +b.createdAt - +a.createdAt);
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
          onClick={() => setPasteOpen(true)}
        >
          Add text
        </Button>
      </AppHeaderContent>

      <div className="library-view">
        <p className="library-view__intro">
          Tap any word while reading to hear it, see its meaning and add it to
          your flashcards. Words are coloured by how well you know them.
        </p>

        {own.length > 0 && (
          <section>
            <h2 className="library-view__heading">Your texts</h2>
            <div className="library-view__list">
              {own.map((l) => (
                <Paper key={l.id} withBorder className="library-view__item">
                  <button
                    type="button"
                    className="library-view__open"
                    onClick={() => navigate(`/read/${l.id}`)}
                  >
                    <span className="library-view__title">{l.title}</span>
                    <Text size="sm">
                      {l.author ? `${l.author} · ` : ""}
                      {l.content.slice(0, 90)}…
                    </Text>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${l.title}`}
                    onClick={() => deleteLesson(l.id)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Paper>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="library-view__heading">Starter course</h2>
          <Text size="sm">
            20 graded stories using the 1,000 most common words, from Lector.
          </Text>
          <div className="library-view__list">
            {starter.map((l, i) => (
              <Paper key={l.id} withBorder className="library-view__item">
                <button
                  type="button"
                  className="library-view__open"
                  onClick={() => navigate(`/read/${l.id}`)}
                >
                  <span className="library-view__number">{i + 1}</span>
                  <span className="library-view__title">{l.title}</span>
                  {l.lastReadAt && <Text size="xs">read</Text>}
                </button>
              </Paper>
            ))}
          </div>
        </section>
      </div>

      <PasteLessonModal
        opened={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onSave={async (input) => {
          const id = await saveLesson(input);
          setPasteOpen(false);
          navigate(`/read/${id}`);
        }}
      />
    </>
  );
}
