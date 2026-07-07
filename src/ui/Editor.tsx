import { useEffect, useRef, useState } from "react";
import { useUI } from "../i18n";
import { alternateSpeaker, characterById, cycleType, findCharacterByName, makeCharacter } from "../model";
import {
  addCharacterTo,
  convertElement,
  insertAfter,
  removeElement,
  updateCharacter,
  updateElement,
} from "../ops";
import type { CueEl, Element, ElementType, Play } from "../types";
import { AutoTextarea } from "./AutoTextarea";

interface EditorProps {
  play: Play;
  commit: (next: Play) => void;
}

interface FocusReq {
  id: string;
  at: number; // nonce so repeated focus of same id still fires
}

export function Editor({ play, commit }: EditorProps) {
  const { t } = useUI();
  const fieldRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [focusReq, setFocusReq] = useState<FocusReq | null>(null);

  useEffect(() => {
    if (!focusReq) return;
    const el = fieldRefs.current.get(focusReq.id);
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [focusReq]);

  const register = (id: string, node: HTMLTextAreaElement | null) => {
    if (node) fieldRefs.current.set(id, node);
    else fieldRefs.current.delete(id);
  };
  const focus = (id: string) => setFocusReq({ id, at: Date.now() });

  const indexOf = (id: string) => play.elements.findIndex((e) => e.id === id);

  const onEnter = (id: string) => {
    const i = indexOf(id);
    const r = insertAfter(play, i, "cue");
    // In a two-hander, the next réplique flips to the other speaker.
    const other = alternateSpeaker(play, i);
    const next = other ? updateElement(r.play, r.id, { characterId: other } as Partial<Element>) : r.play;
    commit(next);
    focus(r.id);
  };

  /**
   * Type-ahead speaker: on a single-token réplique, a space/colon assigns that name as
   * the speaker (space = existing cast only; colon = switch or create). Returns whether
   * it handled the key. One commit, so no add/assign race.
   */
  const speakerTypeAhead = (elId: string, token: string, allowCreate: boolean): boolean => {
    const name = token.trim();
    if (!name) return false;
    const existing = findCharacterByName(play, name);
    if (existing) {
      commit(updateElement(play, elId, { characterId: existing.id, text: "" } as Partial<Element>));
      return true;
    }
    if (allowCreate) {
      const c = makeCharacter(name.toUpperCase(), play.characters);
      let next = addCharacterTo(play, c);
      next = updateElement(next, elId, { characterId: c.id, text: "" } as Partial<Element>);
      commit(next);
      return true;
    }
    return false;
  };

  const onTab = (id: string, current: ElementType) => {
    commit(convertElement(play, id, cycleType(current)));
    focus(id);
  };

  const onBackspaceEmpty = (id: string) => {
    const i = indexOf(id);
    if (play.elements.length <= 0) return;
    const prev = play.elements[i - 1];
    commit(removeElement(play, id));
    if (prev) focus(prev.id);
  };

  const setText = (id: string, patch: Partial<Element>) => commit(updateElement(play, id, patch));

  const addCharacter = (name: string): string => {
    const c = makeCharacter(name || (play.lang === "fr" ? "Personnage" : "Character"), play.characters);
    commit(addCharacterTo(play, c));
    return c.id;
  };

  const startWriting = () => {
    const r = insertAfter(play, play.elements.length - 1, "cue");
    commit(r.play);
    focus(r.id);
  };

  return (
    <div className="mx-auto w-full max-w-[52rem] px-4 pb-40 pt-8 sm:px-8">
      <TitleBlock play={play} commit={commit} />

      <div className="print-sheet script mt-6 rounded-xl bg-paper px-6 py-8 text-ink shadow-page sm:px-12 sm:py-12">
        {/* Print-only title block */}
        <div className="print-only mb-8 text-center">
          <div className="text-2xl font-semibold uppercase tracking-wide">{play.title}</div>
          {play.subtitle && <div className="mt-1 text-ink-soft">{play.subtitle}</div>}
          {play.author && <div className="mt-2 text-sm text-ink-soft">{(play.lang === "fr" ? "de " : "by ") + play.author}</div>}
        </div>

        {play.elements.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ink-soft">{t("emptyScript")}</p>
            <button
              onClick={startWriting}
              className="mt-5 rounded-full bg-gel px-5 py-2.5 text-sm font-semibold text-white shadow-gel transition-colors hover:bg-gel-bright"
            >
              {t("startWriting")}
            </button>
          </div>
        ) : (
          <div>
            {play.elements.map((el) => (
              <ElementRow
                key={el.id}
                el={el}
                play={play}
                register={register}
                onEnter={onEnter}
                onTab={onTab}
                onBackspaceEmpty={onBackspaceEmpty}
                setText={setText}
                setCharacter={(cid) => setText(el.id, { characterId: cid } as Partial<CueEl>)}
                addCharacter={addCharacter}
                renameCharacter={(cid, name) => commit(updateCharacter(play, cid, { name }))}
                speakerTypeAhead={speakerTypeAhead}
              />
            ))}
          </div>
        )}
      </div>

      <p className="no-print mt-4 text-center text-xs text-ink-faint">{t("keyboardHint")}</p>
    </div>
  );
}

function TitleBlock({ play, commit }: { play: Play; commit: (p: Play) => void }) {
  const { t } = useUI();
  return (
    <div className="no-print">
      <input
        value={play.title}
        onChange={(e) => commit({ ...play, title: e.target.value, updatedAt: Date.now() })}
        placeholder={t("untitled")}
        aria-label={t("title")}
        className="w-full bg-transparent font-display text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-ink-faint sm:text-4xl"
      />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <input
          value={play.subtitle ?? ""}
          onChange={(e) => commit({ ...play, subtitle: e.target.value, updatedAt: Date.now() })}
          placeholder={t("subtitle")}
          className="min-w-0 flex-1 bg-transparent text-ink-faint outline-none placeholder:text-ink-faint/60"
        />
        <input
          value={play.author}
          onChange={(e) => commit({ ...play, author: e.target.value, updatedAt: Date.now() })}
          placeholder={t("author")}
          className="min-w-0 flex-1 bg-transparent text-right text-ink-faint outline-none placeholder:text-ink-faint/60"
        />
      </div>
    </div>
  );
}

interface RowProps {
  el: Element;
  play: Play;
  register: (id: string, node: HTMLTextAreaElement | null) => void;
  onEnter: (id: string) => void;
  onTab: (id: string, current: ElementType) => void;
  onBackspaceEmpty: (id: string) => void;
  setText: (id: string, patch: Partial<Element>) => void;
  setCharacter: (characterId: string) => void;
  addCharacter: (name: string) => string;
  renameCharacter: (id: string, name: string) => void;
  speakerTypeAhead: (elId: string, token: string, allowCreate: boolean) => boolean;
}

/** Enter / Tab / Backspace-on-empty. Shared by every element field. */
function structural(e: React.KeyboardEvent<HTMLTextAreaElement>, props: RowProps, current: ElementType, value: string) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    props.onEnter(props.el.id);
  } else if (e.key === "Tab") {
    e.preventDefault();
    props.onTab(props.el.id, current);
  } else if (e.key === "Backspace" && value.length === 0) {
    e.preventDefault();
    props.onBackspaceEmpty(props.el.id);
  }
}

/** Cue field: try speaker type-ahead on space/colon first, then the structural keys. */
function cueKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, props: RowProps) {
  if (e.key === " " || e.key === ":") {
    const value = e.currentTarget.value; // DOM value, before this key is inserted
    if (value.trim() && !/\s/.test(value)) {
      const handled = props.speakerTypeAhead(props.el.id, value, e.key === ":");
      if (handled) {
        e.preventDefault();
        return;
      }
    }
  }
  structural(e, props, "cue", (props.el as CueEl).text);
}

function ElementRow(props: RowProps) {
  const { el } = props;
  const { t } = useUI();

  if (el.type === "act") {
    return (
      <div className="my-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-edge" />
        <input
          value={el.label}
          onChange={(e) => props.setText(el.id, { label: e.target.value.toUpperCase() } as Partial<Element>)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              props.onEnter(el.id);
            } else if (e.key === "Tab") {
              e.preventDefault();
              props.onTab(el.id, "act");
            }
          }}
          className="bg-transparent text-center font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink outline-none"
          size={Math.max(el.label.length, 6)}
        />
        <span className="h-px flex-1 bg-paper-edge" />
      </div>
    );
  }

  if (el.type === "scene") {
    return (
      <div className="mb-4 mt-7">
        <input
          value={el.label}
          onChange={(e) => props.setText(el.id, { label: e.target.value.toUpperCase() } as Partial<Element>)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              props.onEnter(el.id);
            } else if (e.key === "Tab") {
              e.preventDefault();
              props.onTab(el.id, "scene");
            }
          }}
          className="block bg-transparent font-display text-base font-semibold uppercase tracking-[0.14em] text-ink outline-none"
          size={Math.max(el.label.length, 6)}
        />
        <input
          value={el.setting ?? ""}
          onChange={(e) => props.setText(el.id, { setting: e.target.value } as Partial<Element>)}
          placeholder={t("settingPlaceholder")}
          className="mt-1 block w-full bg-transparent text-sm text-ink-soft outline-none placeholder:text-ink-faint"
        />
      </div>
    );
  }

  if (el.type === "stage") {
    return (
      <div className="script my-3 border-l-2 border-gel/50 pl-4">
        <AutoTextarea
          ref={(n) => props.register(el.id, n)}
          value={el.text}
          onChange={(e) => props.setText(el.id, { text: e.target.value } as Partial<Element>)}
          onKeyDown={(e) => structural(e, props, "stage", el.text)}
          placeholder={t("stagePlaceholder")}
          className="text-[15px] text-ink-soft"
          aria-label={t("elStage")}
        />
      </div>
    );
  }

  if (el.type === "action") {
    return (
      <div className="script my-3">
        <AutoTextarea
          ref={(n) => props.register(el.id, n)}
          value={el.text}
          onChange={(e) => props.setText(el.id, { text: e.target.value } as Partial<Element>)}
          onKeyDown={(e) => structural(e, props, "action", el.text)}
          placeholder={t("actionPlaceholder")}
          className="text-[15px] text-ink"
          aria-label={t("elAction")}
        />
      </div>
    );
  }

  // cue
  const character = characterById(props.play, el.characterId);
  const hasParen = (el.parenthetical ?? "").length > 0;
  return (
    <div className="script group mb-3.5" style={{ ["--cue-color" as string]: character?.color ?? "#8b93a4" }}>
      <div className="flex items-center gap-2">
        <CuePicker {...props} el={el} />
        <input
          value={el.parenthetical ?? ""}
          onChange={(e) => props.setText(el.id, { parenthetical: e.target.value } as Partial<CueEl>)}
          placeholder={t("parenthetical")}
          className={`min-w-0 flex-1 bg-transparent text-sm text-ink-soft outline-none transition-opacity placeholder:text-ink-faint/60 ${
            hasParen ? "opacity-100" : "opacity-0 focus:opacity-100 group-hover:opacity-100"
          }`}
          aria-label={t("parenthetical")}
        />
      </div>
      <AutoTextarea
        ref={(n) => props.register(el.id, n)}
        value={el.text}
        onChange={(e) => props.setText(el.id, { text: e.target.value } as Partial<Element>)}
        onKeyDown={(e) => cueKeyDown(e, props)}
        placeholder={t("cuePlaceholder")}
        className="mt-0.5 text-[17px] leading-relaxed text-ink"
        aria-label={t("elCue")}
      />
    </div>
  );
}

function CuePicker(props: RowProps & { el: CueEl }) {
  const { play, el } = props;
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const character = characterById(play, el.characterId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md px-1.5 py-0.5 font-display text-sm font-semibold uppercase tracking-[0.12em] outline-none ring-1 ring-transparent transition hover:ring-paper-edge"
        style={{ color: character?.color ?? "#8b93a4" }}
      >
        {character ? character.name : "+ " + t("chooseCharacter")}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl bg-white p-1.5 shadow-lift ring-1 ring-paper-edge">
          <div className="max-h-56 overflow-y-auto">
            {play.characters.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  props.setCharacter(c.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-paper-shade"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="font-medium uppercase tracking-wide">{c.name}</span>
              </button>
            ))}
            {play.characters.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-ink-faint">{t("noCast")}</p>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = draft.trim();
              if (!name) return;
              const id = props.addCharacter(name.toUpperCase());
              props.setCharacter(id);
              setDraft("");
              setOpen(false);
            }}
            className="mt-1 flex items-center gap-1 border-t border-paper-edge pt-1.5"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("addCharacter")}
              className="min-w-0 flex-1 rounded-md bg-paper-shade px-2 py-1.5 text-sm uppercase tracking-wide text-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-faint"
              autoFocus
            />
            <button type="submit" className="rounded-md bg-gel px-2 py-1.5 text-xs font-semibold text-white">
              +
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
