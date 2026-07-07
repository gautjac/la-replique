import { useMemo, useRef, useState } from "react";
import { atelier, type DramaturgieRes, type EtSiRes, type RelanceRes, type VoixRes } from "../api";
import { useUI } from "../i18n";
import { characterById, sceneElements, sceneRange } from "../model";
import { elementsToScript } from "../export";
import { insertElementsAfter } from "../ops";
import { applyBundle, applySurtitles, buildBundle } from "../translate";
import type { CueEl, Element, Play } from "../types";
import { GhostDots } from "./common";

type Tool = "relance" | "etsi" | "dramaturgie" | "voix" | "traduire";

const TOOL_LABEL: Record<Tool, "aiRelance" | "aiEtSi" | "aiDramaturgie" | "aiVoix" | "aiTraduire"> = {
  relance: "aiRelance",
  etsi: "aiEtSi",
  dramaturgie: "aiDramaturgie",
  voix: "aiVoix",
  traduire: "aiTraduire",
};

interface AtelierProps {
  play: Play;
  commit: (p: Play) => void;
  onCreatePlay: (p: Play) => void;
  onToast: (msg: string) => void;
}

interface SceneRef {
  key: string;
  label: string;
  headingIndex: number;
}

export function Atelier({ play, commit, onCreatePlay, onToast }: AtelierProps) {
  const { t, locale } = useUI();
  const [tool, setTool] = useState<Tool>("relance");

  const scenes = useMemo<SceneRef[]>(() => {
    const list: SceneRef[] = [];
    play.elements.forEach((el, i) => {
      if (el.type === "scene") list.push({ key: el.id, label: el.label, headingIndex: i });
    });
    if (list.length === 0) {
      list.push({ key: "all", label: locale === "fr" ? "Toute la pièce" : "The whole play", headingIndex: 0 });
    }
    return list;
  }, [play.elements, locale]);

  const [sceneKey, setSceneKey] = useState<string>(scenes[scenes.length - 1]?.key ?? "all");
  const activeScene = scenes.find((s) => s.key === sceneKey) ?? scenes[scenes.length - 1];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-desk p-1 ring-1 ring-desk-rule">
        {(["relance", "etsi", "dramaturgie", "voix", "traduire"] as Tool[]).map((tl) => (
          <button
            key={tl}
            onClick={() => setTool(tl)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition ${
              tool === tl ? "bg-gel text-white shadow-gel" : "text-ink-faint hover:text-white"
            }`}
          >
            {t(TOOL_LABEL[tl])}
          </button>
        ))}
      </div>

      {(tool === "relance" || tool === "dramaturgie" || tool === "etsi") && (
        <label className="block">
          <span className="mb-1 block text-xs text-ink-faint">{t("aiWhichScene")}</span>
          <select
            value={sceneKey}
            onChange={(e) => setSceneKey(e.target.value)}
            className="w-full rounded-lg bg-desk px-3 py-2 text-sm text-white outline-none ring-1 ring-desk-rule focus:ring-gel"
          >
            {scenes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
                {s.headingIndex >= 0 && play.elements[s.headingIndex]?.type === "scene" && (play.elements[s.headingIndex] as { setting?: string }).setting
                  ? " — " + (play.elements[s.headingIndex] as { setting?: string }).setting
                  : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {tool === "relance" && <RelanceTool play={play} commit={commit} scene={activeScene} onToast={onToast} />}
      {tool === "etsi" && <EtSiTool play={play} scene={activeScene} />}
      {tool === "dramaturgie" && <DramaturgieTool play={play} scene={activeScene} />}
      {tool === "voix" && <VoixTool play={play} />}
      {tool === "traduire" && <TraduireTool play={play} commit={commit} onCreatePlay={onCreatePlay} onToast={onToast} />}

      <p className="border-t border-desk-rule pt-4 text-xs leading-relaxed text-ink-faint">{t("aiWhatItDoes")}</p>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
function useRunner() {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const abort = useRef<AbortController | null>(null);
  return { busy, setBusy, stage, setStage, error, setError, abort };
}

function DraftBadge() {
  const { t } = useUI();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gel/15 px-2.5 py-1 text-[11px] font-medium text-gel-bright">
      <span className="h-1.5 w-1.5 rounded-full bg-gel-bright" />
      {t("aiDraftBadge")}
    </span>
  );
}

function Waiting({ stage }: { stage: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-desk p-4 ring-1 ring-desk-rule">
      <GhostDots />
      <span className="text-sm text-ink-faint">{stage}</span>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
function RelanceTool({
  play,
  commit,
  scene,
  onToast,
}: {
  play: Play;
  commit: (p: Play) => void;
  scene: SceneRef;
  onToast: (m: string) => void;
}) {
  const { t, locale } = useUI();
  const r = useRunner();
  const [result, setResult] = useState<RelanceRes | null>(null);

  const sceneEls = sceneElements(play, scene.headingIndex);
  const lastSpeaker = [...sceneEls].reverse().find((e) => e.type === "cue") as CueEl | undefined;
  const [charId, setCharId] = useState<string>(lastSpeaker?.characterId ?? play.characters[0]?.id ?? "");
  const character = characterById(play, charId);

  const canRun = play.characters.length > 0 && sceneEls.some((e) => e.type === "cue");

  const run = async () => {
    if (!character) return;
    setResult(null);
    r.setError("");
    r.setBusy(true);
    const stages = [t("aiStageReading"), t("aiStageThinking"), t("aiStageWriting")];
    let si = 0;
    r.setStage(stages[0]);
    r.abort.current = new AbortController();
    try {
      const res = await atelier<RelanceRes>(
        {
          op: "relance",
          lang: play.lang,
          scene: elementsToScript(play, sceneEls),
          characterName: character.name,
          cast: play.characters.map((c) => c.name),
        },
        {
          signal: r.abort.current.signal,
          onHeartbeat: () => {
            si = Math.min(si + 1, stages.length - 1);
            r.setStage(stages[si]);
          },
        },
      );
      setResult(res);
    } catch {
      r.setError(t("aiError"));
    } finally {
      r.setBusy(false);
    }
  };

  const insert = () => {
    if (!result || !character) return;
    const { end } = sceneRange(play, scene.headingIndex);
    const cue: Element = {
      id: "",
      type: "cue",
      characterId: charId,
      text: result.line,
      parenthetical: result.parenthetical ?? "",
    };
    commit(insertElementsAfter(play, end - 1, [cue]));
    setResult(null);
    onToast(t("inserted"));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">{t("aiRelanceDesc")}</p>

      <label className="block">
        <span className="mb-1 block text-xs text-ink-faint">{t("aiForWho")}</span>
        <select
          value={charId}
          onChange={(e) => setCharId(e.target.value)}
          className="w-full rounded-lg bg-desk px-3 py-2 text-sm text-white outline-none ring-1 ring-desk-rule focus:ring-gel"
        >
          {play.characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {!canRun && <p className="rounded-lg bg-desk p-3 text-xs text-ink-faint ring-1 ring-desk-rule">{play.characters.length === 0 ? t("aiNeedCast") : t("aiNeedScene")}</p>}

      {!result && !r.busy && (
        <button
          onClick={run}
          disabled={!canRun}
          className="w-full rounded-lg bg-gel py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright disabled:opacity-40 disabled:shadow-none"
        >
          {t("aiRun")}
        </button>
      )}

      {r.busy && <Waiting stage={r.stage} />}
      {r.error && <p className="rounded-lg bg-rose/10 p-3 text-sm text-rose ring-1 ring-rose/30">{r.error}</p>}

      {result && (
        <div className="rise space-y-3 rounded-xl bg-desk p-4 ring-1 ring-gel/40">
          <DraftBadge />
          <div className="script rounded-lg bg-paper p-3 text-ink">
            <div className="font-display text-xs font-semibold uppercase tracking-widest" style={{ color: character?.color }}>
              {character?.name}
              {result.parenthetical ? <span className="ml-1 font-normal normal-case tracking-normal text-ink-soft">, {result.parenthetical}</span> : null}
            </div>
            <p className="mt-1 text-[16px] leading-relaxed">{result.line}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={insert} className="rounded-lg bg-gel px-3.5 py-2 text-sm font-semibold text-white hover:bg-gel-bright">
              {t("aiInsert")}
            </button>
            <button onClick={run} className="rounded-lg bg-desk-light px-3.5 py-2 text-sm text-white ring-1 ring-desk-rule hover:bg-desk-rule">
              {t("aiRegenerate")}
            </button>
            <button onClick={() => setResult(null)} className="rounded-lg px-3 py-2 text-sm text-ink-faint hover:text-white">
              {t("aiDismiss")}
            </button>
          </div>
          <p className="text-[11px] text-ink-faint">{locale === "fr" ? "Rien n'est ajouté tant que tu n'insères pas." : "Nothing is added until you insert it."}</p>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
const KIND_STYLE: Record<string, { fr: string; en: string; color: string }> = {
  tension: { fr: "Tension", en: "Tension", color: "#f43f5e" },
  clarte: { fr: "Clarté", en: "Clarity", color: "#d97706" },
  voix: { fr: "Voix", en: "Voice", color: "#8b5cf6" },
  piste: { fr: "Piste", en: "Lead", color: "#10b981" },
};

function DramaturgieTool({ play, scene }: { play: Play; scene: SceneRef }) {
  const { t, locale } = useUI();
  const r = useRunner();
  const [result, setResult] = useState<DramaturgieRes | null>(null);

  const sceneEls = sceneElements(play, scene.headingIndex);
  const canRun = sceneEls.some((e) => e.type === "cue");

  const run = async () => {
    setResult(null);
    r.setError("");
    r.setBusy(true);
    const stages = [t("aiStageReading"), t("aiStageThinking")];
    let si = 0;
    r.setStage(stages[0]);
    r.abort.current = new AbortController();
    try {
      const res = await atelier<DramaturgieRes>(
        { op: "dramaturgie", lang: locale, scene: elementsToScript(play, sceneEls) },
        {
          signal: r.abort.current.signal,
          onHeartbeat: () => {
            si = Math.min(si + 1, stages.length - 1);
            r.setStage(stages[si]);
          },
        },
      );
      setResult(res);
    } catch {
      r.setError(t("aiError"));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">{t("aiDramaturgieDesc")}</p>
      {!canRun && <p className="rounded-lg bg-desk p-3 text-xs text-ink-faint ring-1 ring-desk-rule">{t("aiNeedScene")}</p>}

      {!r.busy && (
        <button
          onClick={run}
          disabled={!canRun}
          className="w-full rounded-lg bg-gel py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright disabled:opacity-40 disabled:shadow-none"
        >
          {result ? t("aiRegenerate") : t("aiRun")}
        </button>
      )}

      {r.busy && <Waiting stage={r.stage} />}
      {r.error && <p className="rounded-lg bg-rose/10 p-3 text-sm text-rose ring-1 ring-rose/30">{r.error}</p>}

      {result && (
        <div className="rise space-y-3">
          <DraftBadge />
          <p className="rounded-xl bg-desk p-4 text-[15px] leading-relaxed text-white ring-1 ring-desk-rule">{result.read}</p>
          <ul className="space-y-2">
            {result.points.map((p, i) => {
              const s = KIND_STYLE[p.kind] ?? KIND_STYLE.piste;
              return (
                <li key={i} className="rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
                  <span
                    className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: s.color + "22", color: s.color }}
                  >
                    {locale === "fr" ? s.fr : s.en}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-faint">{p.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
function EtSiTool({ play, scene }: { play: Play; scene: SceneRef }) {
  const { t, locale } = useUI();
  const r = useRunner();
  const [result, setResult] = useState<EtSiRes | null>(null);
  const sceneEls = sceneElements(play, scene.headingIndex);
  const canRun = sceneEls.some((e) => e.type === "cue");

  const run = async () => {
    setResult(null);
    r.setError("");
    r.setBusy(true);
    const stages = [t("aiStageReading"), t("aiStageThinking")];
    let si = 0;
    r.setStage(stages[0]);
    r.abort.current = new AbortController();
    try {
      const res = await atelier<EtSiRes>(
        { op: "etsi", lang: locale, scene: elementsToScript(play, sceneEls) },
        { signal: r.abort.current.signal, onHeartbeat: () => { si = Math.min(si + 1, stages.length - 1); r.setStage(stages[si]); } },
      );
      setResult(res);
    } catch {
      r.setError(t("aiError"));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">{t("aiEtSiDesc")}</p>
      {!canRun && <p className="rounded-lg bg-desk p-3 text-xs text-ink-faint ring-1 ring-desk-rule">{t("aiNeedScene")}</p>}
      {!r.busy && (
        <button onClick={run} disabled={!canRun} className="w-full rounded-lg bg-gel py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright disabled:opacity-40 disabled:shadow-none">
          {result ? t("aiRegenerate") : t("aiRun")}
        </button>
      )}
      {r.busy && <Waiting stage={r.stage} />}
      {r.error && <p className="rounded-lg bg-rose/10 p-3 text-sm text-rose ring-1 ring-rose/30">{r.error}</p>}
      {result && (
        <div className="rise space-y-2">
          <DraftBadge />
          {result.ideas.map((idea, i) => (
            <div key={i} className="rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
              <p className="text-[15px] font-medium text-white">{idea.premise}</p>
              <p className="mt-1 text-sm text-ink-faint">{idea.why}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
function VoixTool({ play }: { play: Play }) {
  const { t } = useUI();
  const r = useRunner();
  const [charId, setCharId] = useState<string>(play.characters[0]?.id ?? "");
  const [result, setResult] = useState<VoixRes | null>(null);
  const character = characterById(play, charId);

  const lines = play.elements.filter((e): e is CueEl => e.type === "cue" && e.characterId === charId && !!e.text.trim()).map((e) => e.text);
  const canRun = !!character && lines.length >= 2;

  const run = async () => {
    if (!character) return;
    setResult(null);
    r.setError("");
    r.setBusy(true);
    const stages = [t("aiStageReading"), t("aiStageWeighing")];
    let si = 0;
    r.setStage(stages[0]);
    r.abort.current = new AbortController();
    try {
      const res = await atelier<VoixRes>(
        { op: "voix", lang: play.lang, characterName: character.name, lines },
        { signal: r.abort.current.signal, onHeartbeat: () => { si = Math.min(si + 1, stages.length - 1); r.setStage(stages[si]); } },
      );
      setResult(res);
    } catch {
      r.setError(t("aiError"));
    } finally {
      r.setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">{t("aiVoixDesc")}</p>
      <label className="block">
        <span className="mb-1 block text-xs text-ink-faint">{t("aiForCharacter")}</span>
        <select value={charId} onChange={(e) => { setCharId(e.target.value); setResult(null); }} className="w-full rounded-lg bg-desk px-3 py-2 text-sm text-white outline-none ring-1 ring-desk-rule focus:ring-gel">
          {play.characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      {!canRun && <p className="rounded-lg bg-desk p-3 text-xs text-ink-faint ring-1 ring-desk-rule">{play.characters.length === 0 ? t("aiNeedCast") : t("aiNeedScene")}</p>}
      {!r.busy && (
        <button onClick={run} disabled={!canRun} className="w-full rounded-lg bg-gel py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright disabled:opacity-40 disabled:shadow-none">
          {result ? t("aiRegenerate") : t("aiRun")}
        </button>
      )}
      {r.busy && <Waiting stage={r.stage} />}
      {r.error && <p className="rounded-lg bg-rose/10 p-3 text-sm text-rose ring-1 ring-rose/30">{r.error}</p>}
      {result && (
        <div className="rise space-y-3">
          <DraftBadge />
          <p className="rounded-xl bg-desk p-4 text-[15px] leading-relaxed text-white ring-1 ring-desk-rule">{result.read}</p>
          <ul className="space-y-2">
            {result.points.map((p, i) => (
              <li key={i} className="rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
                <p className="text-sm text-white" style={{ color: character?.color }}>« {p.excerpt} »</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-faint">{p.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
function TraduireTool({ play, commit, onCreatePlay, onToast }: { play: Play; commit: (p: Play) => void; onCreatePlay: (p: Play) => void; onToast: (m: string) => void }) {
  const { t } = useUI();
  const r = useRunner();
  const [preview, setPreview] = useState<Play | null>(null);
  const [items, setItems] = useState<{ k: string; t: string }[] | null>(null);
  const to = play.lang === "fr" ? "en" : "fr";

  const canRun = play.elements.some((e) => e.type === "cue" || e.type === "stage");

  const run = async () => {
    setPreview(null);
    setItems(null);
    r.setError("");
    r.setBusy(true);
    r.setStage(t("aiStageTranslating"));
    r.abort.current = new AbortController();
    try {
      const bundle = buildBundle(play);
      const res = await atelier<{ items: { k: string; t: string }[] }>(
        { op: "traduire", from: play.lang, to, items: bundle },
        { signal: r.abort.current.signal, onHeartbeat: () => r.setStage(t("aiStageTranslating")) },
      );
      setItems(res.items);
      setPreview(applyBundle(play, to, res.items));
    } catch {
      r.setError(t("aiError"));
    } finally {
      r.setBusy(false);
    }
  };

  const create = () => {
    if (!preview) return;
    onCreatePlay(preview);
    onToast(t("translatedCreated"));
    setPreview(null);
    setItems(null);
  };

  const attachSurtitles = () => {
    if (!items) return;
    commit(applySurtitles(play, to, items));
    onToast(t("surtitresAttached"));
    setPreview(null);
    setItems(null);
  };

  const previewCues = preview
    ? preview.elements.filter((e) => e.type === "cue").slice(0, 3)
    : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">{t("aiTraduireDesc")}</p>
      <div className="flex items-center justify-center gap-3 rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
        <span className="font-display text-sm font-semibold text-white">{play.lang.toUpperCase()}</span>
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke="#4f7cff" strokeWidth="2">
          <path d="M2 8h20M16 2l6 6-6 6" />
        </svg>
        <span className="font-display text-sm font-semibold text-gel-bright">{to.toUpperCase()}</span>
      </div>

      {!canRun && <p className="rounded-lg bg-desk p-3 text-xs text-ink-faint ring-1 ring-desk-rule">{t("aiNeedScene")}</p>}

      {!r.busy && !preview && (
        <button
          onClick={run}
          disabled={!canRun}
          className="w-full rounded-lg bg-gel py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright disabled:opacity-40 disabled:shadow-none"
        >
          {t("aiRun")}
        </button>
      )}

      {r.busy && <Waiting stage={r.stage} />}
      {r.error && <p className="rounded-lg bg-rose/10 p-3 text-sm text-rose ring-1 ring-rose/30">{r.error}</p>}

      {preview && (
        <div className="rise space-y-3 rounded-xl bg-desk p-4 ring-1 ring-gel/40">
          <DraftBadge />
          <div className="script rounded-lg bg-paper p-3 text-ink">
            <div className="font-display text-sm font-semibold uppercase tracking-wide">{preview.title}</div>
            {previewCues.map((c) => {
              const ch = characterById(preview, (c as CueEl).characterId);
              return (
                <p key={c.id} className="mt-2 text-sm">
                  <span className="font-display text-xs font-semibold uppercase tracking-wide" style={{ color: ch?.color }}>
                    {ch?.name}:{" "}
                  </span>
                  <span className="text-ink-soft">{(c as CueEl).text}</span>
                </p>
              );
            })}
          </div>
          <button onClick={attachSurtitles} className="w-full rounded-lg bg-gel px-3.5 py-2 text-sm font-semibold text-white shadow-gel hover:bg-gel-bright">
            {t("surtitresAttach")}
          </button>
          <p className="text-center text-[11px] text-ink-faint">{t("surtitresOrNew")}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={create} className="rounded-lg bg-desk-light px-3.5 py-2 text-sm text-white ring-1 ring-desk-rule hover:bg-desk-rule">
              {t("aiApplyTranslation")}
            </button>
            <button onClick={run} className="rounded-lg bg-desk-light px-3.5 py-2 text-sm text-white ring-1 ring-desk-rule hover:bg-desk-rule">
              {t("aiRegenerate")}
            </button>
            <button onClick={() => { setPreview(null); setItems(null); }} className="rounded-lg px-3 py-2 text-sm text-ink-faint hover:text-white">
              {t("aiDismiss")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
