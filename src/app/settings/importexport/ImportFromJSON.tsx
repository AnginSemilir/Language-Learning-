import { Paper } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Stack } from "@/components/ui/Stack";
import { Text } from "@/components/ui/Text";
import { Deck } from "@/logic/deck/deck";
import {
  ImportDirection,
  ImportResult,
  importFlashcards,
} from "@/logic/import/importFlashcards";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import FileImport from "./FileImport";
import ImportButton from "./ImportButton";
import { ImportFromSourceProps, ImportStatus } from "./ImportModal";

interface ImportFromJSONProps extends ImportFromSourceProps {
  onResult: (result: ImportResult) => void;
}

export default function ImportFromJSON({
  file,
  setFile,
  fileText,
  setFileText,
  importStatus,
  setImportStatus,
  deck,
  onResult,
}: ImportFromJSONProps) {
  const [step, setStep] = useState<"selectFile" | "options">("selectFile");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(
    null
  );
  return (
    <Stack align="start" gap="md">
      {step === "selectFile" || !file ? (
        <>
          <Paper>
            You can import decks from JSON here such as those exportable using
            CrowdAnki. Please note, that there is only basic options and no
            media support.
          </Paper>

          <FileImport
            file={file}
            setFile={setFile}
            setFileText={setFileText}
            acceptedFormats={".json"}
          />
          <Button
            rightSection={<IconChevronRight />}
            onClick={async () => {
              try {
                setExtractedData(await parseFile(fileText));
                setStep("options");
                setImportStatus("passive");
              } catch {
                setImportStatus("error");
              }
            }}
            style={{ alignSelf: "end" }}
            disabled={!file}
          >
            Parse File and Continue
          </Button>
        </>
      ) : (
        <ImportOptions
          extractedData={extractedData}
          importStatus={importStatus}
          setImportStatus={setImportStatus}
          deck={deck}
          onResult={onResult}
        />
      )}
    </Stack>
  );
}

interface ExtractedData {
  description: string;
  name: string;
  fields: { label: string; value: string }[];
  cards: { fields: string[] }[];
  warnMessages: string[];
}

async function parseFile(fileText: string | null): Promise<ExtractedData> {
  if (!fileText) {
    throw new Error("This file has no contents.");
  }
  const jsonObject = JSON.parse(fileText);
  const warnMessages: string[] = [];
  if (jsonObject.__type__ !== "Deck") {
    throw new Error("At the moment only decks can be imported from JSON");
  }
  const noteModels = jsonObject.note_models;
  if (!noteModels || noteModels.length === 0) {
    throw new Error("No note models found");
  } else if (noteModels.length > 1) {
    warnMessages.push(
      "Multiple note models found, only cards of the first one will be used"
    );
  }
  const firstNoteModel = noteModels[0];
  const cards = (jsonObject.notes ?? []).map((note: any) => {
    return {
      fields: note.fields ?? [],
    };
  });
  return {
    description: jsonObject.desc,
    name: jsonObject.name,
    fields: firstNoteModel.flds.map((field: any) => ({
      label: field.name,
      value: field.ord.toString(),
    })),
    cards,
    warnMessages,
  };
}

/** A CrowdAnki field is HTML; the card gets its text. */
function htmlToText(html: string) {
  const doc = new DOMParser().parseFromString(
    html.replace(/<br\s*\/?>/gi, " "),
    "text/html"
  );
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function ImportOptions({
  extractedData,
  importStatus,
  setImportStatus,
  deck,
  onResult,
}: {
  extractedData: ExtractedData | null;
  importStatus: ImportStatus;
  setImportStatus: (status: ImportStatus) => void;
  deck?: Deck;
  onResult: (result: ImportResult) => void;
}) {
  const [frontField, setFrontField] = useState<string | null>(null);
  const [backField, setBackField] = useState<string | null>(null);
  const [direction, setDirection] = useState<ImportDirection>("both");

  if (!extractedData) {
    return null;
  }

  const rows = () => {
    const front = Number(frontField);
    const back = Number(backField);
    return extractedData.cards
      .map((card) => ({
        front: htmlToText(card.fields[front] ?? ""),
        back: htmlToText(card.fields[back] ?? ""),
        hint: "",
      }))
      .filter((row) => row.front !== "" && row.back !== "");
  };

  return (
    <Stack align="start" gap="md">
      <Text size="sm">Deck Name: {extractedData.name}</Text>
      <Text size="sm">Deck Description: {extractedData.description}</Text>
      <Text size="sm">Card Number: {extractedData.cards.length}</Text>
      {extractedData.warnMessages.map((message) => (
        <Text size="sm" key={message}>
          {message}
        </Text>
      ))}
      <Select
        label="Front"
        options={extractedData.fields}
        value={frontField || ""}
        onChange={(value) => setFrontField(value || null)}
      />
      <Select
        label="Back"
        options={extractedData.fields}
        value={backField || ""}
        onChange={(value) => setBackField(value || null)}
      />
      <SegmentedControl
        value={direction}
        onChange={(v) => setDirection(v as ImportDirection)}
        data={[
          { value: "both", label: "Both directions" },
          { value: "frontToBack", label: "Front → back only" },
        ]}
      />
      <ImportButton
        importFunction={async () => {
          if (!deck) return;
          onResult(await importFlashcards(rows(), deck, direction));
        }}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        disabled={!deck || !frontField || !backField}
      />
    </Stack>
  );
}
