import { Button } from "@/components/ui";
import { db } from "@/logic/db";
import { IconCloudOff } from "@tabler/icons-react";
import { useObservable } from "dexie-react-hooks";
import { useCallback } from "react";
import "./CloudSettingsView.css";
import CloudSyncSignIn from "./CloudSyncSignIn";

const BASE = "cloud-settings-view";

export default function CloudSettingsView() {
  const user = useObservable(db.cloud.currentUser);

  const handleLogin = useCallback(async () => {
    try {
      await db.cloud.login();
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      console.error("Login failed:", e);
    }
  }, []);

  const handleLogout = useCallback(() => {
    db.cloud.logout();
  }, []);

  return (
    <div className={BASE}>
      {user?.isLoggedIn ? (
        <div className={BASE + "__logged-in"}>
          <div>
            <p>Signed in as</p>
            <p>{user.email}</p>
          </div>
          <Button
            variant="neutral"
            onClick={handleLogout}
            leftSection={<IconCloudOff />}
          >
            Sign out of sync
          </Button>
          <p>
            <b>Note:</b> signing out removes your data from this device. It
            stays in the cloud and comes back when you sign in again. Export a
            backup first if you want a copy.
          </p>
        </div>
      ) : (
        <CloudSyncSignIn onSignIn={handleLogin} />
      )}
      <article>
        <h2>What is sync?</h2>
        <p>
          Kartu keeps your cards, word progress, lessons and statistics in this
          browser so it works offline. Signing in copies them to your own Dexie
          Cloud database and keeps every device you sign in on up to date.
        </p>
        <p>
          You sign in with your email address and a one-time code. The first
          time you sign in on a device, what's already on it is uploaded and
          merged with your other devices.
        </p>
        <h3>Before you sign in or out</h3>
        <p>
          Export a backup first (Database tab). Signing out removes the data
          from this device; it stays in the cloud and comes back when you sign
          in again.
        </p>
        <h3>Where the data goes</h3>
        <p>
          Your data is stored by Dexie Cloud, a service from the makers of the
          Dexie database library, under the email address you sign in with. The
          database is yours, on Dexie Cloud's free plan.
        </p>
      </article>
    </div>
  );
}
