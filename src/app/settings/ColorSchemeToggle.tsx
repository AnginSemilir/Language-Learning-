import { InputDescription } from "@/components/ui/InputDescription";
import { InputLabel } from "@/components/ui/InputLabel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { setColorScheme } from "@/hooks/useTheme";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { IconMoon, IconSun, IconSunMoon } from "@tabler/icons-react";
import { t } from "i18next";
import { SettingsValues } from "../../logic/settings/Settings";
import "./ColorSchemeToggle.css";

const BASE = "color-scheme-toggle";

export default function ColorSchemeToggle() {
  const [colorSchemePreference] = useSetting("#colorSchemePreference");

  const handleColorSchemeChange = (value: string) => {
    setColorScheme(
      (value as SettingsValues["#colorSchemePreference"]) || "light"
    );
  };

  return (
    <div className={BASE}>
      <InputLabel>{t("settings.appearance.color-scheme")}</InputLabel>
      <InputDescription>
        {t("settings.appearance.color-scheme-description")}
      </InputDescription>
      <SegmentedControl
        value={colorSchemePreference}
        onChange={handleColorSchemeChange}
        data={[
          {
            value: "light",
            label: (
              <div className={`${BASE}__option`}>
                <IconSun size={16} />
                <span className={`${BASE}__option-text`}>
                  {t("settings.appearance.color-scheme-light")}
                </span>
              </div>
            ),
          },
          {
            value: "dark",
            label: (
              <div className={`${BASE}__option`}>
                <IconMoon size={16} />
                <span className={`${BASE}__option-text`}>
                  {t("settings.appearance.color-scheme-dark")}
                </span>
              </div>
            ),
          },
          {
            value: "auto",
            label: (
              <div className={`${BASE}__option`}>
                <IconSunMoon size={16} />
                <span className={`${BASE}__option-text`}>
                  {t("settings.appearance.color-scheme-auto")}
                </span>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
