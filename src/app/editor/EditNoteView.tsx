import { Text } from "@/components/ui/Text";
import { NoteTypeLabels } from "@/logic/card/card";
import { useDeckOf } from "@/logic/deck/hooks/useDeckOf";
import { Note, NoteType } from "@/logic/note/note";
import { useTranslation } from "react-i18next";
import CardDirection from "./CardDirection";
import LiveNoteEditor, { useLiveNote } from "./LiveNoteEditor";
import "./EditNoteView.css";
import NoteMenu from "./NoteMenu";

const BASE = "edit-note";

type SetOpenedNote = (note: Note<NoteType> | undefined) => void;

export function EditNoteView({
  note,
  setOpenedNote,
}: {
  note: Note<NoteType> | undefined;
  setOpenedNote?: SetOpenedNote;
}) {
  if (!note) {
    return <NoNoteView />;
  }
  return <NoteView note={note} setOpenedNote={setOpenedNote} />;
}

export function NoNoteView() {
  return (
    <div className={`${BASE}__no-note`}>
      <Text size="sm" variant="dimmed">
        No note selected
      </Text>
    </div>
  );
}

function NoteView({
  note,
}: {
  note: Note<NoteType>;
  setOpenedNote?: SetOpenedNote;
}) {
  const [t] = useTranslation();
  const [deck] = useDeckOf(note);
  const live = useLiveNote(note);

  return (
    <div className={BASE}>
      <div className={`${BASE}__header`}>
        <div className={`${BASE}__title-group`}>
          <Text size="xs" weight="semibold">
            {t("note.edit.title")}{" "}
            <Text variant="dimmed" size="xs" weight="semibold">
              ({NoteTypeLabels[live.content.type]})
            </Text>
          </Text>
        </div>
        <NoteMenu note={note} withEdit={false} />
      </div>
      <div className={`${BASE}__content`}>
        <CardDirection note={live} />
        <LiveNoteEditor note={note} deck={deck} />
      </div>
      {/*<LinkedNotesSection
        linkedNotes={note.linkedNotes}
        onSelectNote={
          setOpenedNote
            ? (noteId) => getNote(noteId).then((n) => n && setOpenedNote(n))
            : undefined
        }
      />*/}
    </div>
  );
}
export default EditNoteView;
