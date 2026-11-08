// The editor for an open note, made once per note and note type: typing
// saves as you go without rebuilding it, but when the note's type changes
// (Ask → Both turns a basic note double-sided) the right editor takes over,
// so a stale basic editor can't save the note back as basic.
import { getAdapter } from "@/logic/NoteTypeAdapter";
import { db } from "@/logic/db";
import type { Deck } from "@/logic/deck/deck";
import type { Note, NoteType } from "@/logic/note/note";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

/** The note as it is now in the database. */
export function useLiveNote(note: Note<NoteType>): Note<NoteType> {
  return (
    (useLiveQuery(() => db.notes.get(note.id), [note.id]) as
      | Note<NoteType>
      | undefined) ?? note
  );
}

function EditorOnce({ note, deck }: { note: Note<NoteType>; deck: Deck }) {
  const [editor] = useState(() =>
    getAdapter(note).editor({ note, deck, mode: "edit" })
  );
  return editor;
}

export default function LiveNoteEditor({
  note,
  deck,
}: {
  note: Note<NoteType>;
  deck: Deck | undefined;
}) {
  const live = useLiveNote(note);
  if (!deck) return <div />;
  return (
    <EditorOnce
      key={`${live.id}:${live.content.type}`}
      note={live}
      deck={deck}
    />
  );
}
