// Add a text to read: from a link to an article (only its headline and story
// are kept), pasted (Lector's PasteImportModal form, rebuilt with Skola's
// components; a whole web page copied in a browser is cut down to its story
// too), or from a file — .txt, .md, subtitles (.srt, .vtt) or an EPUB book,
// whose chapters become separate lessons.
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
import {
  ArticleError,
  type ArticleProblem,
  articleFromHtml,
  fetchArticle,
} from "@/lector/import/webArticle";
import { id as pack } from "@/lector/languages/id/manifest";
import { countTypedWords } from "@/lector/languages/tokenizer";
import { IconClipboardText, IconFileText, IconLink } from "@tabler/icons-react";
import { type ClipboardEvent, useState } from "react";

interface PasteLessonModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (lessons: ImportedText[]) => void;
}

/** A Jina Reader API key, kept on this device only. */
const KEY_STORAGE = "kartu.jinaReaderKey";
function loadKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}
function saveKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {}
}

const ACCEPT =
  ".txt,.md,.markdown,.srt,.vtt,.epub,text/plain,application/epub+zip";

export default function PasteLessonModal({
  opened,
  onClose,
  onSave,
}: PasteLessonModalProps) {
  const [tab, setTab] = useState("link");
  const [url, setUrl] = useState("");
  const [article, setArticle] = useState<ImportedText | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [problem, setProblem] = useState<ArticleProblem | null>(null);
  const [key, setKey] = useState(loadKey);
  const [showKey, setShowKey] = useState(false);
  const [fetching, setFetching] = useState(false);
  /** All of a pasted web page, when only its story was kept. */
  const [pastedAll, setPastedAll] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [fileLessons, setFileLessons] = useState<ImportedText[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const words = content.trim() ? countTypedWords(content, pack) : 0;

  const reset = () => {
    setUrl("");
    setArticle(null);
    setLinkError(null);
    setProblem(null);
    setPastedAll(null);
    setTitle("");
    setAuthor("");
    setContent("");
    setFileLessons(null);
    setFileName("");
    setFileError(null);
  };

  const getArticle = async () => {
    setArticle(null);
    setLinkError(null);
    setProblem(null);
    setFetching(true);
    try {
      setArticle(await fetchArticle(url, { key }));
    } catch (e) {
      const known = e instanceof ArticleError;
      setLinkError(known ? e.message : "The page couldn't be read.");
      setProblem(known ? e.problem : "reader");
      if (known && ["busy", "paused", "key"].includes(e.problem)) {
        setShowKey(true);
      }
    } finally {
      setFetching(false);
    }
  };

  // A whole web page copied in a browser (some sites, like Kompas, can't be
  // fetched by link): keep only its headline and story.
  const pasteWebPage = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (!html || content.trim()) return;
    const found = articleFromHtml(html);
    if (!found) return;
    e.preventDefault();
    setPastedAll(e.clipboardData.getData("text/plain"));
    setContent(found.content);
    if (!title.trim()) setTitle(found.title);
    if (!author.trim() && found.author) setAuthor(found.author);
  };

  const articleWords = article ? countTypedWords(article.content, pack) : 0;

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
          <Tabs.Tab value="link">
            <IconLink size={16} />
            <span>Link</span>
          </Tabs.Tab>
          <Tabs.Tab value="paste">
            <IconClipboardText size={16} />
            <span>Paste</span>
          </Tabs.Tab>
          <Tabs.Tab value="file">
            <IconFileText size={16} />
            <span>File</span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="link">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim() && !fetching) getArticle();
            }}
          >
            <Stack gap="md">
              <TextInput
                id="link-url"
                label="Link to an article"
                type="text"
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => {
                  setUrl(e.currentTarget.value);
                  setArticle(null);
                  setLinkError(null);
                  setProblem(null);
                }}
                placeholder="https://"
                error={linkError}
              />
              {article ? (
                <>
                  <div className="add-text__article">
                    <Text size="sm" weight="medium">
                      “{article.title}”
                    </Text>
                    <Text size="sm" variant="dimmed">
                      {article.author ? `${article.author} · ` : ""}
                      {articleWords} words
                    </Text>
                    <Text size="sm" className="add-text__excerpt">
                      {article.content.split("\n\n")[0]}
                    </Text>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      onSave([article]);
                      reset();
                    }}
                  >
                    Add and read
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!url.trim() || fetching}
                >
                  {fetching ? "Getting the article…" : "Get article"}
                </Button>
              )}
              {(problem === "robot" || problem === "no-story") && (
                <Button onClick={() => setTab("paste")}>
                  Paste a copied page instead
                </Button>
              )}
              {showKey && (
                <TextInput
                  id="link-key"
                  label="Jina Reader key (optional)"
                  description="Free from jina.ai: sign up and copy your API key. With a key, free access isn't paused and 500 pages a minute can be fetched. Kept on this device only."
                  value={key}
                  onChange={(e) => {
                    setKey(e.currentTarget.value);
                    saveKey(e.currentTarget.value);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="jina_…"
                />
              )}
              {!linkError && (
                <Text size="xs" variant="dimmed">
                  Only the headline and the story are kept. Pages are fetched
                  through Jina Reader (r.jina.ai)
                  {key ? " with your key" : ""}.{" "}
                  {!showKey && (
                    <button
                      type="button"
                      className="add-text__undo"
                      onClick={() => setShowKey(true)}
                    >
                      {key ? "Change the key" : "Add a key"}
                    </button>
                  )}
                </Text>
              )}
            </Stack>
          </form>
        </Tabs.Panel>

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
                    : "Paste an article, story or song lyrics, or a whole web page you copied."
                }
                value={content}
                onChange={(e) => setContent(e.currentTarget.value)}
                onPaste={pasteWebPage}
                minRows={8}
                maxRows={16}
                required
              />
              {pastedAll !== null && (
                <Text size="sm" variant="dimmed">
                  Kept only the headline and story of the copied page.{" "}
                  <button
                    type="button"
                    className="add-text__undo"
                    onClick={() => {
                      setContent(pastedAll);
                      setPastedAll(null);
                    }}
                  >
                    Use everything I pasted
                  </button>
                </Text>
              )}
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
