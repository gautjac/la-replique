import { characterById } from "../model";
import type { Play } from "../types";

/** Hidden on screen; rendered when the browser prints. Two layouts. */
export function PrintView({ play, style }: { play: Play; style: "clean" | "theatre" }) {
  return (
    <div className={`print-only print-doc ${style === "theatre" ? "theatre" : ""}`}>
      <div className="p-pagebreak">
        <div className="p-title">{play.title}</div>
        {play.subtitle && <div className="p-sub">{play.subtitle}</div>}
        {play.author && <div className="p-author">{(play.lang === "fr" ? "de " : "by ") + play.author}</div>}
      </div>

      {play.elements.map((el) => {
        switch (el.type) {
          case "act":
            return (
              <div key={el.id} className="p-act">
                {el.label}
              </div>
            );
          case "scene":
            return (
              <div key={el.id}>
                <div className="p-scene">{el.label}</div>
                {el.setting && <div className="p-setting">{el.setting}</div>}
              </div>
            );
          case "stage":
            return (
              <div key={el.id} className="p-stage">
                {el.text}
              </div>
            );
          case "action":
            return (
              <div key={el.id} className="p-cue-text">
                {el.text}
              </div>
            );
          case "cue": {
            const c = characterById(play, el.characterId);
            const name = (c?.name ?? "?").toUpperCase();
            return (
              <div key={el.id}>
                <div className="p-cue-name">{el.parenthetical ? `${name}, ${el.parenthetical}` : name}</div>
                <div className="p-cue-text">{el.text}</div>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
