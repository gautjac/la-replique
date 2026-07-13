import { z } from "zod";
import { C, CAST } from "./theme";

// ─────────────────────────────────────────────────────────────────────────────
// ALL the video's text lives here. Edit this file to change any wording.
// Run `npm run dev` (Remotion Studio) to preview live, or `npm run render`.
// You can also edit these fields visually in the Studio's right-hand props panel.
// ─────────────────────────────────────────────────────────────────────────────

const cue = z.object({
  name: z.string(),
  color: z.string(),
  paren: z.string().optional(),
  line: z.string(),
});

const kbd = z.object({ keys: z.array(z.string()), label: z.string() });
const role = z.object({ name: z.string(), color: z.string(), present: z.array(z.number()) });
const card = z.object({
  scene: z.string(),
  setting: z.string(),
  synopsis: z.string(),
  beat: z.string(),
  beatColor: z.string(),
  dots: z.array(z.string()),
});
const readRow = z.object({ name: z.string(), color: z.string(), voice: z.string() });
const word = z.object({ text: z.string(), color: z.string() });

export const copySchema = z.object({
  logo: z.object({ title: z.string(), tagline: z.string() }),
  hook: z.object({ kicker: z.string(), line: z.string(), subtitle: z.string() }),
  writing: z.object({
    kicker: z.string(),
    title: z.string(),
    subtitle: z.string(),
    sceneLabel: z.string(),
    setting: z.string(),
    didascalie: z.string(),
    cues: z.array(cue),
    keys: z.array(kbd),
  }),
  cast: z.object({
    kicker: z.string(),
    title: z.string(),
    body: z.string(),
    gridTitle: z.string(),
    roles: z.array(role),
  }),
  board: z.object({ kicker: z.string(), title: z.string(), body: z.string(), cards: z.array(card) }),
  atelier: z.object({
    kicker: z.string(),
    title: z.string(),
    body: z.string(),
    tools: z.array(z.string()),
    badge: z.string(),
    proposalName: z.string(),
    proposalColor: z.string(),
    proposalLine: z.string(),
    insert: z.string(),
    another: z.string(),
  }),
  bilingual: z.object({
    kicker: z.string(),
    title: z.string(),
    from: z.string(),
    to: z.string(),
    name: z.string(),
    color: z.string(),
    line: z.string(),
    surtitle: z.string(),
    footer: z.string(),
  }),
  read: z.object({
    kicker: z.string(),
    title: z.string(),
    body: z.string(),
    badge: z.string(),
    rows: z.array(readRow),
  }),
  closing: z.object({ name: z.string(), words: z.array(word), url: z.string(), footer: z.string() }),
});

export type Copy = z.infer<typeof copySchema>;

// ── Timing (how long each scene holds, in frames — 30 fps) ───────────────────
export const timingSchema = z.object({
  logo: z.number().min(15),
  hook: z.number().min(15),
  writing: z.number().min(15),
  cast: z.number().min(15),
  board: z.number().min(15),
  atelier: z.number().min(15),
  bilingual: z.number().min(15),
  read: z.number().min(15),
  closing: z.number().min(15),
  transition: z.number().min(2),
});
export type Timing = z.infer<typeof timingSchema>;

// ── Palette (the accent colour of each scene) ────────────────────────────────
export const paletteSchema = z.object({
  gel: z.string(), // primary accent — writing / atelier / CTA
  cyan: z.string(), // secondary — bilingual / closing
  plum: z.string(), // distribution
  rose: z.string(), // beat board
  jade: z.string(), // table read
});
export type Palette = z.infer<typeof paletteSchema>;

// The whole editable prop set, in three tidy sections.
export const showcaseSchema = z.object({
  copy: copySchema,
  timing: timingSchema,
  palette: paletteSchema,
});
export type ShowcaseProps = z.infer<typeof showcaseSchema>;

export const defaultCopy: Copy = {
  logo: {
    title: "La Réplique",
    tagline: "atelier d'écriture théâtrale",
  },
  hook: {
    kicker: "Le premier atelier pensé pour le théâtre",
    line: "Écris ta pièce. Réplique par réplique.",
    subtitle: "Une page, une distribution, un dramaturge de poche — bilingue.",
  },
  writing: {
    kicker: "Écrire",
    title: "Comme on monte\nune scène.",
    subtitle: "Chaque bloc est un élément. Tout se fait au clavier.",
    sceneLabel: "SCÈNE 1",
    setting: "Une cuisine. Fin de soirée.",
    didascalie: "Alice essuie la même assiette depuis trop longtemps. On frappe.",
    cues: [
      { name: "Bruno", color: CAST.bruno, paren: "derrière la porte", line: "Je sais que t'es là." },
      { name: "Alice", color: CAST.alice, line: "La lumière est toujours allumée. Ça veut rien dire." },
      { name: "Bruno", color: CAST.bruno, line: "Dix ans, Alice. Ouvre la porte." },
    ],
    keys: [
      { keys: ["Entrée"], label: "nouvelle réplique" },
      { keys: ["Tab"], label: "changer le type de bloc" },
      { keys: ["Nom", "␣"], label: "changer de personnage" },
    ],
  },
  cast: {
    kicker: "Distribution",
    title: "Ta distribution\nvit à côté.",
    body: "Nomme un personnage une fois. La grille de présence te montre qui parle dans quelle scène — et propose des doublures.",
    gridTitle: "GRILLE DE PRÉSENCE",
    roles: [
      { name: "ALICE", color: C.gel, present: [1, 1, 0, 1] },
      { name: "BRUNO", color: C.plum, present: [1, 0, 1, 1] },
      { name: "CAROL", color: C.jade, present: [0, 1, 1, 0] },
      { name: "MARC", color: C.cyan, present: [0, 1, 0, 1] },
    ],
  },
  board: {
    kicker: "Tableau",
    title: "Vois la forme\nde ta pièce.",
    body: "Chaque scène est une carte : une intention, une fonction dramatique. Glisse pour réordonner — le texte suit.",
    cards: [
      { scene: "SCÈNE 1", setting: "Une gare, la nuit", synopsis: "Nina attend un départ qu'elle redoute.", beat: "Exposition", beatColor: C.inkFaint, dots: [C.gel] },
      { scene: "SCÈNE 2", setting: "Le quai", synopsis: "Marc revient — et ment sur la raison.", beat: "Pivot", beatColor: C.plum, dots: [C.gel, C.cyan] },
      { scene: "SCÈNE 3", setting: "Sous l'horloge", synopsis: "La vérité éclate à la dernière minute.", beat: "Point culminant", beatColor: C.rose, dots: [C.gel, C.cyan, C.jade] },
    ],
  },
  atelier: {
    kicker: "L'Atelier",
    title: "Un dramaturge\nde poche.",
    body: "Relancer une scène, la lire d'un œil critique, la traduire. Toujours une proposition — jamais un verdict.",
    tools: ["Relancer", "Et si…", "Dramaturgie", "Voix", "Traduire"],
    badge: "ébauche · à toi de décider",
    proposalName: "Alice",
    proposalColor: CAST.alice,
    proposalLine: "Rentre chez toi, Bruno. J'ai débranché la sonnette.",
    insert: "Insérer",
    another: "Une autre",
  },
  bilingual: {
    kicker: "Bilingue",
    title: "Deux langues, deux fois.",
    from: "FR",
    to: "EN",
    name: "Bruno",
    color: CAST.bruno,
    line: "Dix ans, Alice. Ouvre la porte.",
    surtitle: "Ten years, Alice. Open the door.",
    footer: "Interface FR/EN · surtitres attachés · export pour la régie.",
  },
  read: {
    kicker: "Lecture à voix",
    title: "Entends-la\nvivre.",
    body: "Une table-read jouée à voix haute — une voix distincte par personnage.",
    badge: "✦ Voix ElevenLabs",
    rows: [
      { name: "ALICE", color: C.gel, voice: "Sarah" },
      { name: "BRUNO", color: C.plum, voice: "George" },
      { name: "CAROL", color: C.jade, voice: "Laura" },
    ],
  },
  closing: {
    name: "La Réplique",
    words: [
      { text: "Écris.", color: C.white },
      { text: "Structure.", color: C.gelBright },
      { text: "Entends-la vivre.", color: C.cyan },
    ],
    url: "la-replique.netlify.app",
    footer: "Écriture · Distribution · Tableau des beats · Atelier IA · Bilingue · Lecture à voix",
  },
};

// Scene lengths in frames (30 fps → 90 = 3 s). Change these to retune pacing;
// the total video length recalculates automatically.
export const defaultTiming: Timing = {
  logo: 90,
  hook: 126,
  writing: 174,
  cast: 138,
  board: 162,
  atelier: 174,
  bilingual: 132,
  read: 144,
  closing: 150,
  transition: 16,
};

export const defaultPalette: Palette = {
  gel: C.gel,
  cyan: C.cyan,
  plum: C.plum,
  rose: C.rose,
  jade: C.jade,
};

export const defaultProps: ShowcaseProps = {
  copy: defaultCopy,
  timing: defaultTiming,
  palette: defaultPalette,
};

/** Compute the composition's total length from the timing (used by calculateMetadata). */
export function totalFrames(t: Timing): number {
  const scenes = [t.logo, t.hook, t.writing, t.cast, t.board, t.atelier, t.bilingual, t.read, t.closing];
  const total = scenes.reduce((a, b) => a + b, 0) - (scenes.length - 1) * t.transition;
  return Math.max(1, Math.round(total));
}
