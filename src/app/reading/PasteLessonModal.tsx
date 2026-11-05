// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only):
// src/components/PasteImportModal/index.tsx — same title/author/content form,
// rebuilt with Skola's UI components.
import { Button, Modal, Stack, TextInput, Textarea } from "@/components/ui";
import { id as pack } from "@/lector/languages/id/manifest";
import { countTypedWords } from "@/lector/languages/tokenizer";
import { useState } from "react";

interface PasteLessonModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (lesson: { title: string; author: string; content: string }) => void;
}

export default function PasteLessonModal({
  opened,
  onClose,
  onSave,
}: PasteLessonModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const words = content.trim() ? countTypedWords(content, pack) : 0;

  return (
    <Modal opened={opened} onClose={onClose} title="Add a text to read">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !content.trim()) return;
          onSave({ title: title.trim(), author: author.trim(), content });
          setTitle("");
          setAuthor("");
          setContent("");
        }}
      >
        <Stack gap="md">
          <TextInput
            id="paste-title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder="e.g. Berita hari ini"
            required
          />
          <TextInput
            id="paste-author"
            label="Source (optional)"
            value={author}
            onChange={(e) => setAuthor(e.currentTarget.value)}
          />
          <Textarea
            id="paste-content"
            label="Indonesian text"
            description={
              words
                ? `${words} words`
                : "Paste an article, story or song lyrics."
            }
            value={content}
            onChange={(e) => setContent(e.currentTarget.value)}
            minRows={8}
            maxRows={16}
            required
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || !content.trim()}
          >
            Save and read
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
