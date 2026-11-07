import ModalProps from "@/components/ModalProps";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Deck } from "@/logic/deck/deck";
import { ImportResult } from "@/logic/import/importFlashcards";
import {
  IconClipboardText,
  IconCsv,
  IconJson,
  IconTxt,
} from "@tabler/icons-react";
import React, { useState } from "react";
import ImportFromCsv from "./ImportFromCsv";
import ImportFromJSON from "./ImportFromJSON";
import ImportFromPaste from "./ImportFromPaste";
import ImportFromPlainText from "./ImportFromPlainText";
import "./ImportModal.css";

const BASE_URL = "import-modal";

interface ImportModalProps extends ModalProps {
  deck?: Deck;
}

export interface ImportFromSourceProps {
  file: File | null;
  setFile: (file: File | null) => void;
  fileText: string | null;
  setFileText: (fileText: string | null) => void;
  importStatus: ImportStatus;
  setImportStatus: (status: ImportStatus) => void;
  deck?: Deck;
}

export type ImportStatus = "passive" | "importing" | "success" | "error";

const STATUS_TEXT: Record<ImportStatus, string> = {
  passive: "",
  importing: "Importing…",
  success: "Imported.",
  error: "The import didn't work. Check the file and try again.",
};

export default function ImportModal({
  opened,
  setOpened,
  deck,
}: ImportModalProps) {
  const [tab, setTab] = useState("cardsfromcsv");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("passive");

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setOpened(false);
        setFile(null);
        setFileText(null);
        setResult(null);
        setImportStatus("passive");
      }}
      title="Import"
    >
      {(importStatus === "passive" || importStatus === "importing") && (
        <Tabs value={tab} onChange={setTab} variant="pills">
          <Tabs.List>
            <Tabs.Tab value="cardsfromcsv">
              <IconCsv size={16} />
              <span>From CSV</span>
            </Tabs.Tab>
            <Tabs.Tab value="cardsfrompaste">
              <IconClipboardText size={16} />
              <span>From Paste</span>
            </Tabs.Tab>
            <Tabs.Tab value="cardsfromplaintext">
              <IconTxt size={16} />
              <span>From Plain Text</span>
            </Tabs.Tab>
            <Tabs.Tab value="deckfromjson">
              <IconJson size={16} />
              <span>From JSON</span>
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="cardsfromcsv">
            <ImportFromCsv
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
              onResult={setResult}
            />
          </Tabs.Panel>
          <Tabs.Panel value="cardsfrompaste">
            <ImportFromPaste
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
            />
          </Tabs.Panel>
          <Tabs.Panel value="cardsfromplaintext">
            <ImportFromPlainText
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
            />
          </Tabs.Panel>
          <Tabs.Panel value="deckfromjson">
            <ImportFromJSON
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
              onResult={setResult}
            />
          </Tabs.Panel>
        </Tabs>
      )}
      {importStatus !== "passive" && (
        <div className={`${BASE_URL}__status`}>
          {importStatus === "success" && result
            ? `Added ${result.added} notes${result.skipped ? `, skipped ${result.skipped} already in this deck` : ""}.`
            : STATUS_TEXT[importStatus]}
          {importStatus === "error" && (
            <Button
              variant="default"
              onClick={() => setImportStatus("passive")}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
