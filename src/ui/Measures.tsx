import { useUI } from "../i18n";
import { castStats, characterById, doublingSuggestion, formatRuntime, presenceGrid, throughLines } from "../model";
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

      <ThroughLineSection play={play} />
      <DoublingSection play={play} />
    </div>
  );
}

function ThroughLineSection({ play }: { play: Play }) {
  const { t } = useUI();
  const { scenes, lines } = throughLines(play);
  if (scenes.length === 0 || play.characters.length === 0) return null;
  const globalMax = Math.max(1, ...lines.map((l) => l.max));

  return (
    <div>
      <h3 className="mb-1 font-display text-sm font-semibold text-white">{t("throughLine")}</h3>
      <p className="mb-3 text-xs text-ink-faint">{t("throughLineNote")}</p>
      <div className="space-y-2.5">
        {lines.map((l) => (
          <div key={l.character.id}>
            <div className="mb-1 flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: l.character.color }} />
              <span className="font-display font-semibold uppercase tracking-wide text-white">{l.character.name}</span>
            </div>
            <div className="flex h-8 items-end gap-0.5">
              {l.perScene.map((n, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max((n / globalMax) * 100, n > 0 ? 12 : 4)}%`,
                    background: n > 0 ? l.character.color : "#2b3140",
                    opacity: n > 0 ? 0.85 : 1,
                  }}
                  title={`${scenes[i]}: ${n}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoublingSection({ play }: { play: Play }) {
  const { t, locale } = useUI();
  const groups = doublingSuggestion(play).filter((g) => g.characterIds.length > 0);
  if (play.characters.length < 2 || groups.length === 0) return null;
  const doublings = groups.filter((g) => g.characterIds.length > 1);

  return (
    <div>
      <h3 className="mb-1 font-display text-sm font-semibold text-white">{t("doubling")}</h3>
      <p className="mb-3 text-xs text-ink-faint">{t("doublingNote")}</p>
      {doublings.length === 0 ? (
        <p className="rounded-lg bg-desk p-3 text-xs text-ink-faint ring-1 ring-desk-rule">{t("doublingNone")}</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
              <span className="whitespace-nowrap text-xs text-ink-faint">
                {t("actor")} {i + 1}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {g.characterIds.map((id, j) => {
                  const c = characterById(play, id);
                  return (
                    <span key={id} className="flex items-center gap-1">
                      {j > 0 && <span className="text-ink-faint">+</span>}
                      <span className="h-2 w-2 rounded-full" style={{ background: c?.color }} />
                      <span className="font-display text-xs font-semibold uppercase tracking-wide text-white">{c?.name}</span>
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-ink-faint">
        {groups.length} {locale === "fr" ? (groups.length === 1 ? "comédien·ne" : "comédien·ne·s") : groups.length === 1 ? "actor" : "actors"} · {play.characters.length}{" "}
        {locale === "fr" ? "rôles" : "roles"}
      </p>
    </div>
  );
}

function shortScene(label: string, i: number): string {
  const m = label.match(/(\d+)/);
  if (m) return m[1];
  return String(i + 1);
}
