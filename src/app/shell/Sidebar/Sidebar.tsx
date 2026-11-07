import { CloudSyncState } from "@/components/CloudSyncState";
import { IconButton } from "@/components/ui/IconButton";
import { NavItem } from "@/components/ui/NavItem";
import { setColorScheme, useIsDark } from "@/hooks/useTheme";
import { breakpoints } from "@/lib/breakpoints";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import {
  IconBolt,
  IconBook,
  IconCards,
  IconChartBar,
  IconDeviceGamepad2,
  IconHome,
  IconMoon,
  IconPencil,
  IconSettings,
  IconSun,
  IconTrees,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import DeckList from "./DeckList";
import "./Sidebar.css";
import { SpotlightCard } from "../Spotlight";

const BASE = "sidebar";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.0.0";
const APP_BUILD = import.meta.env.VITE_APP_BUILD || "";

interface SidebarProps {
  menuOpened: boolean;
  menuHandlers: {
    readonly open: () => void;
    readonly close: () => void;
    readonly toggle: () => void;
  };
}

function Sidebar({ menuOpened, menuHandlers }: SidebarProps) {
  // The hook (not i18next's t) so the labels change with the language.
  const [t] = useTranslation();
  const routeIsLearn = useLocation().pathname.startsWith("/learn");
  const isDark = useIsDark();

  const isXsOrSmaller = useMediaQuery(`(max-width: ${breakpoints.xs}px)`);
  const isLgOrSmaller = useMediaQuery(`(max-width: ${breakpoints.lg}px)`);
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const fullscreenMode = isXsOrSmaller || routeIsLearn;
  const minimalMode = isLgOrSmaller && !isXsOrSmaller && !routeIsLearn;

  const sidebarClasses = [
    BASE,
    minimalMode && `${BASE}--minimal`,
    isLandscape && `${BASE}--landscape`,
    fullscreenMode && `${BASE}--fullscreen`,
    fullscreenMode && menuOpened && `${BASE}--open`,
  ]
    .filter(Boolean)
    .join(" ");

  const close = fullscreenMode ? menuHandlers.close : undefined;

  return (
    <aside className={sidebarClasses}>
      <div className={`${BASE}__content`}>
        <div className={`${BASE}__top`}>
          <header className={`${BASE}__header`}>
            <div className={`${BASE}__brand`}>
              <img
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt="Kartu logo"
                className={`${BASE}__logo`}
              />
              {!minimalMode && (
                <div className={`${BASE}__brand-text`}>
                  <h1 className={`${BASE}__title`}>Kartu</h1>
                  <div className={`${BASE}__version`}>
                    v{APP_VERSION}
                    {APP_BUILD && ` · ${APP_BUILD}`}
                  </div>
                </div>
              )}
            </div>
            {fullscreenMode && (
              <IconButton
                variant="ghost"
                onClick={menuHandlers.close}
                aria-label="Close menu"
              >
                <IconX />
              </IconButton>
            )}
          </header>

          <nav className={`${BASE}__nav`}>
            <SpotlightCard />
            <NavItem
              label={t("home.title")}
              path="/home"
              icon={<IconHome />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label="Flashcards"
              path="/flashcards"
              icon={<IconBolt />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label="Pulau Kata"
              path="/world"
              icon={<IconTrees />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label="Games"
              path="/games"
              icon={<IconDeviceGamepad2 />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label="Read"
              path="/read"
              icon={<IconBook />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label="Practice"
              path="/practice"
              icon={<IconPencil />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label={t("statistics.title")}
              path="/stats"
              icon={<IconChartBar />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label={t("manage-cards.title")}
              path="/notes"
              icon={<IconCards />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label={t("settings.title")}
              path="/settings"
              icon={<IconSettings />}
              collapsed={minimalMode}
              onClick={close}
            />
            <NavItem
              label={isDark ? "Light view" : "Dark view"}
              icon={isDark ? <IconSun /> : <IconMoon />}
              collapsed={minimalMode}
              active={false}
              aria-label={
                isDark ? "Switch to light view" : "Switch to dark view"
              }
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
            />
          </nav>

          <DeckList minimalMode={minimalMode} />
        </div>

        <CloudSyncState minimal={minimalMode} />
      </div>
    </aside>
  );
}

export default Sidebar;
