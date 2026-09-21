import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Lire } from "./lire/Lire";
import { Landing } from "./Landing";
import { Passerelle } from "./lire/Passerelle";

// The web is READ-ONLY: a landing + the /lire reading viewer. All writing happens
// in the native iOS/macOS app (synced via CloudKit). The former web editor
// (App.tsx + src/ui/*) is kept on disk but no longer routed or bundled.

const root = createRoot(document.getElementById("root")!);
const path = window.location.pathname;

if (path.startsWith("/lire/")) {
  // Read-only public viewer — a play published from the native app.
  const id = decodeURIComponent(path.slice("/lire/".length).replace(/\/$/, ""));
  root.render(
    <StrictMode>
      <Lire id={id} />
    </StrictMode>,
  );
} else if (path.startsWith("/connexion")) {
  // Where an emailed sign-in link lands: copy it back into the app.
  root.render(
    <StrictMode>
      <Passerelle kind="connexion" />
    </StrictMode>,
  );
} else if (path.startsWith("/rejoindre/")) {
  // An invitation to write together: shows the code to enter in the app.
  root.render(
    <StrictMode>
      <Passerelle kind="rejoindre" code={decodeURIComponent(path.slice("/rejoindre/".length).replace(/\/$/, ""))} />
    </StrictMode>,
  );
} else {
  // Everything else → the landing (marketing front door).
  root.render(
    <StrictMode>
      <Landing />
    </StrictMode>,
  );
}
