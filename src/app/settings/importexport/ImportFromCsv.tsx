import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stack } from "@/components/ui/Stack";
import { Text } from "@/components/ui/Text";
import {
  ImportDirection,
  ImportResult,
  importFlashcards,
} from "@/logic/import/importFlashcards";
import { parseFlashcardCsv } from "@/logic/import/parseCsv";
import { useMemo, useState } from "react";
import FileImport from "./FileImport";
import ImportButton from "./ImportButton";
import {
  type ImportLevel,
  ImportLevelChoice,
  useMarkImported,
} from "./ImportLevel";
import { ImportFromSourceProps } from "./ImportModal";

export default function ImportFromCsv({
  file,
  setFile,
  fileText,
  setFileText,
  importStatus,
  setImportStatus,
  deck,
  onResult,
}: ImportFromSourceProps & { onResult: (result: ImportResult) => void }) {
  const [direction, setDirection] = useState<ImportDirection>("both");
  const [level, setLevel] = useState<ImportLevel>("new");
  const markImported = useMarkImported();
  const rows = useMemo(
    () => (fileText ? parseFlashcardCsv(fileText) : []),
    [fileText]
  );

  return (
    <Stack align="start" gap="md">
      <Text size="sm">
        A CSV with a <code>front,back,hint</code> header (other columns are
        ignored). The hint, such as an example sentence, is shown under the
        front. Cards whose front is already in this deck are skipped.
      </Text>
      <FileImport
        file={file}
        setFile={setFile}
        setFileText={setFileText}
        acceptedFormats={".csv,text/csv"}
      />
      {fileText && (
        <Text size="sm" weight="medium">
          {rows.length} cards found
          {rows[0] ? ` — first: ${rows[0].front} → ${rows[0].back}` : ""}
        </Text>
      )}
      <SegmentedControl
        value={direction}
        onChange={(v) => setDirection(v as ImportDirection)}
        data={[
          { value: "both", label: "Both directions" },
          { value: "frontToBack", label: "Front → back only" },
        ]}
      />
      <ImportLevelChoice value={level} onChange={setLevel} />
      <ImportButton
        importFunction={async () => {
          if (!deck) return;
          const result = await importFlashcards(rows, deck, direction);
          await markImported(result.noteIds, level);
          onResult(result);
        }}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        disabled={!deck || rows.length === 0}
      />
    </Stack>
  );
}
