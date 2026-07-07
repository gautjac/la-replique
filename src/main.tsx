import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ensurePersistentStorage } from "./persist";

// Ask the browser to keep our IndexedDB before we mount (data durability rule).
void ensurePersistentStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
