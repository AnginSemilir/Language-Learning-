import { Badge, Button } from "@/components/ui";
import { IconMail } from "@tabler/icons-react";
import "./CloudSyncSignIn.css";

const BASE = "cloud-sync-sign-in";

interface CloudSyncSignInProps {
  onSignIn: () => void;
}

export default function CloudSyncSignIn({ onSignIn }: CloudSyncSignInProps) {
  return (
    <div className={BASE}>
      <Badge variant="filled" color="neutral">
        Beta
      </Badge>
      <h1>Sync between devices</h1>
      <p>Sign in with your email to use your cards on your phone and laptop.</p>
      <Button
        variant="white"
        size="md"
        onClick={onSignIn}
        leftSection={<IconMail />}
      >
        Sign In
      </Button>
    </div>
  );
}
