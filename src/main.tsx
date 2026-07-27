import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Lire } from "./lire/Lire";
import { Landing } from "./Landing";

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
} else {
  // Everything else → the landing (marketing front door).
  root.render(
    <StrictMode>
      <Landing />
    </StrictMode>,
  );
}
