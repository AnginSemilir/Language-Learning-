import DangerousConfirmModal from "@/components/DangerousConfirmModal";
import { notify } from "@/components/Notification";
import { Button } from "@/components/ui/Button";
import {
  IconDatabaseExport,
  IconDatabaseImport,
  IconTrash,
} from "@tabler/icons-react";
import { exportDB, importInto } from "dexie-export-import";
import { useRef, useState } from "react";
import { db } from "../../../logic/db";
import "./DatabaseSettingsView.css";
import Section from "../Section";
import StorageSection from "./StorageSection";

const BASE = "database-settings-view";

/** kartu-backup-2026-11-07-1520.json: sortable, and safe on every system. */
function backupFileName(now: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())];
  const time = pad(now.getHours()) + pad(now.getMinutes());
  return `kartu-backup-${day.join("-")}-${time}.json`;
}

export default function DatabaseSettingsView() {
  const [deleteAllDataModalOpened, setDeleteAllDataModalOpened] =
    useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div>
        <StorageSection />
        <Button
          leftSection={<IconDatabaseExport />}
          onClick={async () => {
            const blob = await exportDB(db);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = backupFileName(new Date());
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }}
        >
          Export All
        </Button>
        <Section title="Danger Zone" className={`${BASE}__danger-zone`}>
          <p className={`${BASE}__danger-text`}>
            This section contains potentially dangerous settings. Proceed with
            utmost caution!
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className={`${BASE}__file-input`}
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              // Choosing the same file again should import it again.
              input.value = "";
              if (!file) return;
              try {
                await importInto(db, file, { overwriteValues: true });
                notify("Imported", `${file.name} was imported.`, "success");
              } catch (error) {
                console.error(error);
                notify(
                  "Not imported",
                  `${file.name} couldn't be imported: ${(error as Error).message ?? error}`,
                  "error",
                  false
                );
              }
            }}
          />
          <Button
            leftSection={<IconDatabaseImport />}
            variant="destructive"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Database (overwrites conflicting data, e.g. settings)
          </Button>
          <Button
            leftSection={<IconTrash />}
            variant="destructive"
            onClick={() => setDeleteAllDataModalOpened(true)}
          >
            Delete all Data
          </Button>
        </Section>
      </div>
      <DangerousConfirmModal
        dangerousAction={async () => {
          // Wait for the database to be gone before starting afresh.
          await db.delete();
          window.location.hash = "#/home";
          window.location.reload();
        }}
        dangerousDependencies={[]}
        dangerousTitle="Delete all Data"
        dangerousDescription="This will delete all of your data including your cards, decks and settings. There is absolutely no way to recover. Are you sure you want to continue?"
        opened={deleteAllDataModalOpened}
        setOpened={setDeleteAllDataModalOpened}
      />
    </>
  );
}
