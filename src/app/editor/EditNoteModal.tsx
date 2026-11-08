import { Modal } from "@/components/ui/Modal";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useDeckOf } from "@/logic/deck/hooks/useDeckOf";
import { NoteType } from "@/logic/note/note";
import { Note } from "../../logic/note/note";
import CardDirection from "./CardDirection";
import LiveNoteEditor, { useLiveNote } from "./LiveNoteEditor";
import "./EditNoteModal.css";

const BASE = "edit-note-modal";

interface EditNoteModalProps {
  note: Note<NoteType>;
  opened: boolean;
  setClose: () => void;
}

export default function EditNoteModal({
  note,
  opened,
  setClose,
}: EditNoteModalProps) {
  const [deck] = useDeckOf(note);
  const live = useLiveNote(note);

  const isMobile = useMediaQuery("(max-width: 50em)");

  return (
    <Modal
      title="Edit Note"
      fullscreen={isMobile}
      opened={opened}
      onClose={setClose}
    >
      <div className={BASE}>
        <div className={`${BASE}__content`}>
          {opened && (
            <>
              <CardDirection note={live} />
              <LiveNoteEditor note={note} deck={deck} />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
