import { useUI } from "../i18n";
import { castStats, formatRuntime, presenceGrid } from "../model";
import type { Play } from "../types";

export function Measures({ play }: { play: Play }) {
  const { t, locale } = useUI();
  const stats = castStats(play);
  const grid = presenceGrid(play);
  const scenes = grid.segments.filter((s) => s.scene);

  const cards = [
    { label: t("totalLines"), value: String(stats.totalLines) },
    { label: t("spokenWords"), value: stats.totalSpokenWords.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA") },
    { label: t("scenesCount"), value: String(stats.sceneCount) },
    { label: t("actsCount"), value: String(stats.actCount) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-desk p-3.5 ring-1 ring-desk-rule">
            <div className="font-display text-2xl font-semibold text-white">{c.value}</div>
            <div className="text-xs text-ink-faint">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gel/10 p-3.5 ring-1 ring-gel/30">
        <div className="text-xs uppercase tracking-wide text-gel-bright">{t("runtime")}</div>
        <div className="font-display text-2xl font-semibold text-white">{formatRuntime(stats.runtimeMinutes, locale)}</div>
        <div className="mt-0.5 text-xs text-ink-faint">{t("runtimeNote")}</div>
      </div>

      <div>
        <h3 className="mb-1 font-display text-sm font-semibold text-white">{t("grid")}</h3>
        <p className="mb-3 text-xs text-ink-faint">{t("presenceNote")}</p>

        {scenes.length === 0 ? (
          <p className="rounded-lg bg-desk p-4 text-center text-sm text-ink-faint ring-1 ring-desk-rule">{t("noScenes")}</p>
        ) : (
          <div className="thin-scroll overflow-x-auto rounded-xl ring-1 ring-desk-rule">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-desk-light p-2 text-left text-xs font-medium text-ink-faint" />
                  {scenes.map((s, i) => (
                    <th key={i} className="bg-desk-light p-2 text-center text-xs font-semibold text-ink-faint" title={s.scene?.setting}>
                      {shortScene(s.scene?.label ?? "", i)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {play.characters.map((c) => (
                  <tr key={c.id} className="border-t border-desk-rule">
                    <td className="sticky left-0 z-10 bg-desk p-2 font-display text-xs font-semibold uppercase tracking-wide text-white">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c.color }} />
                      {c.name}
                    </td>
                    {scenes.map((s, i) => {
                      const present = s.characterIds.has(c.id);
                      return (
                        <td key={i} className="p-2 text-center">
                          {present ? (
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          ) : (
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-desk-rule/60" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function shortScene(label: string, i: number): string {
  const m = label.match(/(\d+)/);
  if (m) return m[1];
  return String(i + 1);
}
