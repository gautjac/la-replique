import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { Lire } from "./lire/Lire";
import { ensurePersistentStorage } from "./persist";

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
  // Ask the browser to keep our IndexedDB before we mount (data durability rule).
  void ensurePersistentStorage();
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
