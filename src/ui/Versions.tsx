import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, deleteVersion, saveVersion, type Version } from "../db";
import { useUI } from "../i18n";
import { linesDiff, toPlainText } from "../export";
import type { Play } from "../types";

export function Versions({ play, onRestore, onToast }: { play: Play; onRestore: (p: Play) => void; onToast: (m: string) => void }) {
  const { t, locale } = useUI();
  const [name, setName] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);

  const versions = useLiveQuery(
    () => db.versions.where("playId").equals(play.id).reverse().sortBy("createdAt"),
    [play.id],
    [] as Version[],
  );

  const save = async () => {
    await saveVersion(play, name.trim() || (locale === "fr" ? "Version" : "Version"));
    setName("");
    onToast(t("versionSaved"));
  };

  const restore = (v: Version) => {
    if (!confirm(t("restoreConfirm"))) return;
    // keep the current play id; swap in the snapshot's content
    onRestore({ ...v.snapshot, id: play.id, updatedAt: Date.now() });
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("versionNamePlaceholder")}
          className="min-w-0 flex-1 rounded-lg bg-desk px-3 py-2 text-sm text-white outline-none ring-1 ring-desk-rule placeholder:text-ink-faint focus:ring-gel"
        />
        <button type="submit" className="whitespace-nowrap rounded-lg bg-gel px-3.5 py-2 text-sm font-semibold text-white hover:bg-gel-bright">
          {t("saveVersion")}
        </button>
      </form>

      {(!versions || versions.length === 0) && <p className="py-6 text-center text-sm text-ink-faint">{t("noVersions")}</p>}

      <ul className="space-y-2">
        {versions?.map((v) => {
          const when = new Date(v.createdAt).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const showing = compareId === v.id;
          return (
            <li key={v.id} className="rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{v.name}</div>
                  <div className="text-xs text-ink-faint">{when}</div>
                </div>
                <button onClick={() => setCompareId(showing ? null : v.id)} className="rounded-md px-2 py-1 text-xs text-gel-bright hover:bg-gel/15">
                  {showing ? t("hideCompare") : t("compare")}
                </button>
                <button onClick={() => restore(v)} className="rounded-md px-2 py-1 text-xs text-white ring-1 ring-desk-rule hover:bg-desk-rule">
                  {t("restore")}
                </button>
                <button onClick={() => void deleteVersion(v.id)} className="rounded-md p-1 text-ink-faint hover:text-rose" aria-label={t("delete")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                </button>
              </div>
              {showing && <DiffView from={v.snapshot} to={play} label={t("diffVsCurrent")} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DiffView({ from, to, label }: { from: Play; to: Play; label: string }) {
  const diff = linesDiff(toPlainText(from), toPlainText(to)).filter((d) => d.type !== "same" || d.text.trim());
  const changed = diff.filter((d) => d.type !== "same");
  return (
    <div className="mt-3 border-t border-desk-rule pt-3">
      <div className="mb-1.5 text-xs text-ink-faint">{label}</div>
      {changed.length === 0 ? (
        <p className="text-xs text-ink-faint">—</p>
      ) : (
        <pre className="thin-scroll max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-desk-light p-2 text-xs leading-relaxed">
          {diff
            .filter((d) => d.type !== "same")
            .map((d, i) => (
              <div key={i} className={d.type === "add" ? "text-emerald-400" : "text-rose"}>
                {d.type === "add" ? "+ " : "− "}
                {d.text || " "}
              </div>
            ))}
        </pre>
      )}
    </div>
  );
}
