import { Checkbox } from "@/components/ui/Checkbox";
import { NumberInput } from "@/components/ui/NumberInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { TextInput } from "@/components/ui/TextInput";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import React, { useEffect, useState, type JSX } from "react";
import { SettingsValues } from "../../logic/settings/Settings";
import "./SettingsInput.css";

const BASE = "settings-input";

interface SettingsInputProps {
  label: string | React.ReactNode;
  description?: JSX.Element | string;
  settingsKey: keyof SettingsValues;
  inputType: "text" | "number" | "switch" | "checkbox" | "select";
  /** The choices for inputType "select". */
  options?: { value: string; label: string }[];
}

export default function SettingsInput({
  label,
  description,
  inputType,
  settingsKey,
  options = [],
}: SettingsInputProps) {
  const [setting] = useSetting(settingsKey);

  const [value, setValue] = useState<SettingsValues[typeof settingsKey]>(
    setting !== undefined ? setting : ""
  );
  const [touched, setTouched] = useState(false);

  const [debounced] = useDebouncedValue<SettingsValues[typeof settingsKey]>(
    value,
    250
  );

  useEffect(() => setValue(setting !== undefined ? setting : ""), [setting]);

  useEffect(() => {
    if (!touched) return;
    // A number field that is empty (or holds no number) while being retyped
    // is not saved: an empty interval or retention would wreck scheduling.
    if (
      inputType === "number" &&
      (debounced === "" || !Number.isFinite(Number(debounced)))
    ) {
      return;
    }
    setSetting(settingsKey, debounced);
  }, [touched, setting, debounced, settingsKey, inputType]);

  switch (inputType) {
    case "text":
      return (
        <div className={BASE}>
          <TextInput
            value={value as string}
            label={label}
            description={description}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setTouched(true);
              setValue(event.currentTarget.value);
            }}
          />
        </div>
      );
    case "switch":
      return (
        <div className={`${BASE} ${BASE}--switch`}>
          <Switch
            checked={value as boolean | undefined}
            label={label}
            description={description}
            labelPosition="left"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setTouched(true);
              setValue(event.currentTarget.checked);
            }}
          />
        </div>
      );
    case "checkbox":
      return (
        <div className={`${BASE} ${BASE}--checkbox`}>
          <Checkbox
            checked={value as boolean | undefined}
            label={label}
            description={description}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setTouched(true);
              setValue(event.currentTarget.checked);
            }}
          />
        </div>
      );
    case "select":
      return (
        <div className={`${BASE} ${BASE}--select`}>
          <div className={`${BASE}__label`}>{label}</div>
          {description && (
            <div className={`${BASE}__description`}>{description}</div>
          )}
          <SegmentedControl
            value={String(value)}
            onChange={(v) => {
              setTouched(true);
              setValue(v as SettingsValues[typeof settingsKey]);
            }}
            data={options}
          />
        </div>
      );
    case "number":
      return (
        <div className={BASE}>
          <NumberInput
            value={value as number}
            label={label}
            description={description}
            onChange={(e) => {
              setTouched(true);
              setValue(e);
            }}
            onBlur={() => {
              // Left empty: show the saved value again.
              if (value === "") setValue(setting !== undefined ? setting : "");
            }}
          />
        </div>
      );
  }
  return <>Input type not found</>;
}
