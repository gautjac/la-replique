import { useRef, useState } from "react";
import { useUI } from "../i18n";
import { BEATS, beatDef } from "../beats";
import { characterById, decompose, elementStats, formatRuntime, type Block } from "../model";
import {
  addActAtEnd,
  addSceneAfter,
  moveBlock,
  moveBlockToIndex,
  removeSceneHeading,
  updateElement,
} from "../ops";
import type { ActEl, BeatKind, Element, Play, SceneEl } from "../types";
import { AutoTextarea } from "./AutoTextarea";

interface BeatBoardProps {
  play: Play;
  commit: (p: Play) => void;
  onJump: (elementId: string) => void;
}

export function BeatBoard({ play, commit, onJump }: BeatBoardProps) {
  const { t } = useUI();
  const { blocks } = decompose(play);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sceneCount = blocks.filter((b) => b.kind === "scene").length;

  const dropBefore = (targetId: string | null) => {
    if (!dragId) return;
    const order = blocks.map((b) => b.id).filter((id) => id !== dragId);
    const at = targetId ? order.indexOf(targetId) : order.length;
    commit(moveBlockToIndex(play, dragId, at < 0 ? order.length : at));
    setDragId(null);
    setOverId(null);
  };

  const addScene = (afterId: string | null) => {
    const r = addSceneAfter(play, afterId);
    commit(r.play);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-ink-faint">{t("boardHint")}</p>
        <span className="text-xs text-ink-faint">
          {sceneCount} {sceneCount === 1 ? t("elScene").toLowerCase() : t("scenesCount").toLowerCase()}
        </span>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-desk-rule py-16 text-center">
          <p className="text-ink-faint">{t("boardEmpty")}</p>
          <button
            onClick={() => addScene(null)}
            className="mt-4 rounded-full bg-gel px-5 py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright"
          >
            + {t("elScene")}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {blocks.map((block) => (
            <div key={block.id}>
              {/* drop indicator before this block */}
              <div
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault();
                    setOverId(block.id);
                  }
                }}
                onDrop={() => dropBefore(block.id)}
                className={`h-2 rounded-full transition-colors ${overId === block.id && dragId ? "bg-gel" : "bg-transparent"}`}
              />
              {block.kind === "act" ? (
                <ActRow
                  play={play}
                  block={block}
                  commit={commit}
                  onAddScene={() => addScene(block.id)}
                  onMove={(dir) => commit(moveBlock(play, block.id, dir))}
                  onDragStart={() => setDragId(block.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  dragging={dragId === block.id}
                />
              ) : (
                <SceneCard
                  play={play}
                  block={block}
                  commit={commit}
                  onJump={() => onJump(block.id)}
                  onMove={(dir) => commit(moveBlock(play, block.id, dir))}
                  onDragStart={() => setDragId(block.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  dragging={dragId === block.id}
                />
              )}
            </div>
          ))}

          {/* trailing drop zone */}
          <div
            onDragOver={(e) => {
              if (dragId) {
                e.preventDefault();
                setOverId("__end__");
              }
            }}
            onDrop={() => dropBefore(null)}
            className={`h-3 rounded-full transition-colors ${overId === "__end__" && dragId ? "bg-gel" : "bg-transparent"}`}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => addScene(blocks.length ? blocks[blocks.length - 1].id : null)}
          className="rounded-full bg-gel px-4 py-2 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright"
        >
          + {t("addSceneAction")}
        </button>
        <button
          onClick={() => commit(addActAtEnd(play).play)}
          className="rounded-full bg-desk-light px-4 py-2 text-sm font-medium text-white ring-1 ring-desk-rule transition hover:bg-desk-rule"
        >
          + {t("addActAction")}
        </button>
      </div>
    </div>
  );
}

function Handle({ onDragStart, onDragEnd }: { onDragStart: () => void; onDragEnd: () => void }) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "block");
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="cursor-grab select-none px-1 text-ink-faint transition hover:text-white active:cursor-grabbing"
      title="⠿"
      aria-label="drag"
    >
      <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden>
        <circle cx="4" cy="3" r="1.4" />
        <circle cx="10" cy="3" r="1.4" />
        <circle cx="4" cy="8" r="1.4" />
        <circle cx="10" cy="8" r="1.4" />
        <circle cx="4" cy="13" r="1.4" />
        <circle cx="10" cy="13" r="1.4" />
      </svg>
    </span>
  );
}

function MoveButtons({ onMove }: { onMove: (dir: -1 | 1) => void }) {
  const { t } = useUI();
  return (
    <div className="flex items-center">
      <button onClick={() => onMove(-1)} title={t("moveUp")} aria-label={t("moveUp")} className="rounded p-1 text-ink-faint transition hover:bg-desk-rule hover:text-white">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </button>
      <button onClick={() => onMove(1)} title={t("moveDown")} aria-label={t("moveDown")} className="rounded p-1 text-ink-faint transition hover:bg-desk-rule hover:text-white">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

function ActRow(props: {
  play: Play;
  block: Block;
  commit: (p: Play) => void;
  onAddScene: () => void;
  onMove: (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const { t } = useUI();
  const act = props.block.els[0] as ActEl;
  return (
    <div className={`flex items-center gap-2 rounded-xl bg-desk-light px-3 py-2.5 ring-1 ring-desk-rule ${props.dragging ? "opacity-50" : ""}`}>
      <Handle onDragStart={props.onDragStart} onDragEnd={props.onDragEnd} />
      <input
        value={act.label}
        onChange={(e) => props.commit(updateElement(props.play, act.id, { label: e.target.value.toUpperCase() } as Partial<Element>))}
        className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold uppercase tracking-[0.18em] text-white outline-none"
        aria-label={t("elAct")}
      />
      <button onClick={props.onAddScene} className="rounded-md px-2 py-1 text-xs font-medium text-gel-bright transition hover:bg-gel/15" title={t("sceneHere")}>
        + {t("elScene")}
      </button>
      <MoveButtons onMove={props.onMove} />
    </div>
  );
}

function SceneCard(props: {
  play: Play;
  block: Block;
  commit: (p: Play) => void;
  onJump: () => void;
  onMove: (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const { t, locale } = useUI();
  const cardRef = useRef<HTMLDivElement>(null);
  const scene = props.block.els[0] as SceneEl;
  const body = props.block.els.slice(1);
  const stats = elementStats(props.block.els);
  const def = beatDef(scene.beat);

  const patch = (p: Partial<SceneEl>) => props.commit(updateElement(props.play, scene.id, p as Partial<Element>));

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl bg-desk-light p-4 ring-1 transition ${
        props.dragging ? "opacity-50 ring-gel" : "ring-desk-rule hover:ring-desk-rule/80"
      }`}
      style={def ? { boxShadow: `inset 3px 0 0 0 ${def.color}` } : undefined}
    >
      <div className="flex items-start gap-1.5">
        <Handle onDragStart={props.onDragStart} onDragEnd={props.onDragEnd} />
        <div className="min-w-0 flex-1">
          <input
            value={scene.label}
            onChange={(e) => patch({ label: e.target.value.toUpperCase() })}
            className="w-full bg-transparent font-display text-sm font-semibold uppercase tracking-[0.12em] text-white outline-none"
            aria-label={t("elScene")}
          />
          <input
            value={scene.setting ?? ""}
            onChange={(e) => patch({ setting: e.target.value })}
            placeholder={t("settingPlaceholder")}
            className="w-full bg-transparent text-sm text-ink-faint outline-none placeholder:text-ink-faint/60"
          />
        </div>
        <button onClick={props.onJump} title={t("jumpToText")} aria-label={t("jumpToText")} className="rounded p-1 text-ink-faint transition hover:bg-desk-rule hover:text-gel-bright">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
          </svg>
        </button>
        <MoveButtons onMove={props.onMove} />
      </div>

      <AutoTextarea
        value={scene.synopsis ?? ""}
        onChange={(e) => patch({ synopsis: e.target.value })}
        placeholder={t("synopsisPlaceholder")}
        className="mt-2 rounded-lg bg-desk px-3 py-2 text-[14px] leading-relaxed text-white ring-1 ring-desk-rule"
        aria-label={t("synopsisLabel")}
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <select
          value={scene.beat ?? ""}
          onChange={(e) => patch({ beat: (e.target.value || undefined) as BeatKind | undefined })}
          className="rounded-lg bg-desk px-2.5 py-1.5 text-xs text-white outline-none ring-1 ring-desk-rule focus:ring-gel"
          style={def ? { color: def.color } : undefined}
          aria-label={t("beatFunction")}
        >
          <option value="">{t("beatNone")}</option>
          {BEATS.map((b) => (
            <option key={b.key} value={b.key}>
              {b[locale]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1" title={t("cast")}>
          {stats.speakerIds.length === 0 ? (
            <span className="text-xs text-ink-faint">{t("emptyScene")}</span>
          ) : (
            stats.speakerIds.map((id) => {
              const c = characterById(props.play, id);
              return <span key={id} className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color ?? "#64748b" }} title={c?.name} />;
            })
          )}
        </div>

        <span className="ml-auto flex items-center gap-3 text-xs text-ink-faint">
          <span>
            <span className="font-semibold text-white">{stats.lines}</span> {t("lines")}
          </span>
          {stats.lines > 0 && <span>{formatRuntime(stats.runtimeMinutes, locale)}</span>}
        </span>
      </div>

      {body.length === 0 && (
        <button
          onClick={() => props.commit(removeSceneHeading(props.play, scene.id))}
          className="mt-3 text-xs text-ink-faint transition hover:text-rose"
        >
          {t("removeSceneHeading")}
        </button>
      )}
    </div>
  );
}
