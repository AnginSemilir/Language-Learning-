// Add a text to read: paste it (Lector's PasteImportModal form, rebuilt with
// Skola's components) or import a file — .txt, .md, subtitles (.srt, .vtt) or
// an EPUB book, whose chapters become separate lessons.
import {
  Button,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from "@/components/ui";
import { type ImportedText, readTextFile } from "@/lector/import/textFiles";
import { id as pack } from "@/lector/languages/id/manifest";
import { countTypedWords } from "@/lector/languages/tokenizer";
import { IconClipboardText, IconFileText } from "@tabler/icons-react";
import { useState } from "react";

interface PasteLessonModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (lessons: ImportedText[]) => void;
}

const ACCEPT =
  ".txt,.md,.markdown,.srt,.vtt,.epub,text/plain,application/epub+zip";

export default function PasteLessonModal({
  opened,
  onClose,
  onSave,
}: PasteLessonModalProps) {
  const [tab, setTab] = useState("paste");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [fileLessons, setFileLessons] = useState<ImportedText[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const words = content.trim() ? countTypedWords(content, pack) : 0;

  const reset = () => {
    setTitle("");
    setAuthor("");
    setContent("");
    setFileLessons(null);
    setFileName("");
    setFileError(null);
  };

  const pickFile = async (file: File | undefined) => {
    setFileLessons(null);
    setFileError(null);
    if (!file) return;
    setFileName(file.name);
    setReading(true);
    try {
      setFileLessons(await readTextFile(file));
    } catch (e) {
      setFileError(
        e instanceof Error ? e.message : "This file could not be read."
      );
    } finally {
      setReading(false);
    }
  };

  const totalWords = (fileLessons ?? []).reduce(
    (n, l) => n + countTypedWords(l.content, pack),
    0
  );

  return (
    <Modal
      opened={opened}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a text to read"
    >
      <Tabs value={tab} onChange={setTab} variant="pills">
        <Tabs.List>
          <Tabs.Tab value="paste">
            <IconClipboardText size={16} />
            <span>Paste</span>
          </Tabs.Tab>
          <Tabs.Tab value="file">
            <IconFileText size={16} />
            <span>File</span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="paste">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !content.trim()) return;
              onSave([
                {
                  title: title.trim(),
                  author: author.trim() || undefined,
                  content,
                },
              ]);
              reset();
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
        </Tabs.Panel>

        <Tabs.Panel value="file">
          <Stack gap="md">
            <Text size="sm">
              A text file (.txt, .md), subtitles (.srt, .vtt) or an EPUB book.
              Each chapter of a book becomes its own lesson.
            </Text>
            <label className="add-text__file">
              <input
                id="add-text-file"
                type="file"
                accept={ACCEPT}
                onChange={(e) => pickFile(e.currentTarget.files?.[0])}
              />
            </label>
            {reading && <Text size="sm">Reading {fileName}…</Text>}
            {fileError && (
              <Text size="sm" className="add-text__error">
                {fileError}
              </Text>
            )}
            {fileLessons && (
              <Text size="sm" weight="medium">
                {fileLessons.length === 1
                  ? `“${fileLessons[0].title}”, ${totalWords} words`
                  : `${fileLessons[0].collection ?? fileName}: ${fileLessons.length} chapters, ${totalWords} words`}
              </Text>
            )}
            <Button
              variant="primary"
              disabled={!fileLessons}
              onClick={() => {
                if (!fileLessons) return;
                onSave(fileLessons);
                reset();
              }}
            >
              {fileLessons && fileLessons.length > 1
                ? `Add ${fileLessons.length} chapters`
                : "Add and read"}
            </Button>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
