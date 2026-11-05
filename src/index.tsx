import App from "@/App";
import DeckView from "@/app/deck/DeckView";
import NewNotesView from "@/app/editor/NewNotesView";
import NoteExplorerView from "@/app/explorer/NoteExplorerView";
import HomeView from "@/app/home/HomeView";
import LearnView from "@/app/learn/LearnView/LearnView";
import PracticeView from "@/app/practice/PracticeView";
import LibraryView from "@/app/reading/LibraryView";
import ReaderView from "@/app/reading/ReaderView";
import SettingsView from "@/app/settings/SettingsView";
import StatsView from "@/app/statistics/StatsView";
import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createHashRouter } from "react-router-dom";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
const router = createHashRouter(
  [
    {
      element: <App />,
      children: [
        {
          index: true,
          element: <Navigate to="/home" replace={true} />,
        },
        {
          path: "/home",
          element: <HomeView />,
        },
        {
          path: "/settings/:section?",
          element: <SettingsView />,
        },
        {
          path: "/deck/:deckId",
          element: <DeckView />,
        },
        {
          path: "/deck/:deckId/:params",
          element: <DeckView />,
        },
        {
          path: "/new/:deckId?",
          element: <NewNotesView />,
        },
        {
          path: "/learn/:deckId/:params?",
          element: <LearnView />,
        },
        {
          path: "/notes",
          element: <NoteExplorerView />,
        },
        {
          path: "/read",
          element: <LibraryView />,
        },
        {
          path: "/read/:lessonId",
          element: <ReaderView />,
        },
        {
          path: "/practice",
          element: <PracticeView />,
        },
        {
          path: "/stats/:deckId?",
          element: <StatsView />,
        },
      ],
    },
  ],
  { basename: "/" }
);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

async function persist() {
  return (
    navigator.storage &&
    navigator.storage.persist &&
    navigator.storage.persist()
  );
}

async function isStoragePersisted() {
  return (
    navigator.storage &&
    navigator.storage.persisted &&
    navigator.storage.persisted()
  );
}

isStoragePersisted().then(async (isPersisted) => {
  if (!isPersisted) {
    console.warn("Storage is not persistant. Trying to make it persistant...");
    if (await persist()) {
      console.log("Successfully made storage persisted");
    } else {
      console.warn("Failed to make storage persisted");
      navigator.userAgent.includes("Safari") &&
        console.info(
          "You are using Safari, storage may be cleared after 7 days of inactivity: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/"
        );
    }
  }
});
