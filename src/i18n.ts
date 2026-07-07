// Bilingual interface strings. The UI locale is independent of a play's own language:
// you can write an English play with a French interface, or vice-versa.
import { createContext, useContext } from "react";

export type Locale = "fr" | "en";

type Entry = { fr: string; en: string };

export const STRINGS = {
  // — chrome —
  appName: { fr: "La Réplique", en: "La Réplique" },
  tagline: { fr: "atelier d'écriture théâtrale", en: "a playwriting studio" },
  library: { fr: "Mes pièces", en: "My plays" },
  newPlay: { fr: "Nouvelle pièce", en: "New play" },
  fromSample: { fr: "Partir d'un exemple", en: "Start from a sample" },
  back: { fr: "Retour", en: "Back" },
  cast: { fr: "Distribution", en: "Cast" },
  grid: { fr: "Grille de présence", en: "Presence grid" },
  stats: { fr: "Mesures", en: "Measures" },
  atelier: { fr: "Atelier", en: "Studio" },
  export: { fr: "Exporter", en: "Export" },
  print: { fr: "Imprimer / PDF", en: "Print / PDF" },
  plainText: { fr: "Texte brut (.txt)", en: "Plain text (.txt)" },
  jsonBackup: { fr: "Sauvegarde (.json)", en: "Backup (.json)" },
  importJson: { fr: "Importer une sauvegarde", en: "Import a backup" },
  close: { fr: "Fermer", en: "Close" },
  cancel: { fr: "Annuler", en: "Cancel" },
  delete: { fr: "Supprimer", en: "Delete" },
  confirmDelete: { fr: "Supprimer cette pièce ? C'est définitif.", en: "Delete this play? This can't be undone." },
  untitled: { fr: "Pièce sans titre", en: "Untitled play" },
  by: { fr: "de", en: "by" },
  savedAt: { fr: "Enregistré", en: "Saved" },
  saving: { fr: "Enregistrement…", en: "Saving…" },

  // — editor / element types —
  elCue: { fr: "Réplique", en: "Line" },
  elStage: { fr: "Didascalie", en: "Stage direction" },
  elScene: { fr: "Scène", en: "Scene" },
  elAct: { fr: "Acte", en: "Act" },
  elAction: { fr: "Action", en: "Action" },
  addElement: { fr: "Ajouter", en: "Add" },
  settingPlaceholder: { fr: "Lieu, moment… (facultatif)", en: "Place, time… (optional)" },
  parenthetical: { fr: "jeu", en: "action" },
  cuePlaceholder: { fr: "Sa réplique…", en: "Their line…" },
  stagePlaceholder: { fr: "Ce qui se passe sur scène…", en: "What happens on stage…" },
  actionPlaceholder: { fr: "Action…", en: "Action…" },
  chooseCharacter: { fr: "Personnage", en: "Character" },
  emptyScript: { fr: "La page est vide. Commence par une réplique.", en: "The page is empty. Start with a line." },
  startWriting: { fr: "Écrire la première réplique", en: "Write the first line" },
  keyboardHint: { fr: "Entrée : nouvelle réplique · Tab : changer le type · Nom + espace ou « : » : changer de personnage · ⌫ (ligne vide) : supprimer", en: "Enter: new line · Tab: change type · Name + space or “:” switches character · ⌫ (empty line): delete" },

  // — cast —
  addCharacter: { fr: "Ajouter un personnage", en: "Add character" },
  characterName: { fr: "Nom", en: "Name" },
  characterNote: { fr: "Qui est-ce ? (facultatif)", en: "Who are they? (optional)" },
  noCast: { fr: "Aucun personnage pour l'instant.", en: "No characters yet." },
  lines: { fr: "répliques", en: "lines" },
  scenesIn: { fr: "scènes", en: "scenes" },
  renameCharacterEverywhere: { fr: "Renommer partout", en: "Rename everywhere" },

  // — stats —
  totalLines: { fr: "Répliques", en: "Lines" },
  spokenWords: { fr: "Mots dits", en: "Spoken words" },
  scenesCount: { fr: "Scènes", en: "Scenes" },
  actsCount: { fr: "Actes", en: "Acts" },
  runtime: { fr: "Durée estimée", en: "Est. runtime" },
  runtimeNote: { fr: "estimation ~140 mots/min sur scène", en: "estimate at ~140 words/min on stage" },
  presenceNote: { fr: "Qui parle dans quelle scène.", en: "Who speaks in which scene." },
  noScenes: { fr: "Ajoute des scènes pour voir la grille.", en: "Add scenes to see the grid." },

  // — AI / atelier —
  aiRelance: { fr: "Relancer la scène", en: "Continue the scene" },
  aiRelanceDesc: { fr: "Une proposition de réplique suivante, dans la voix du personnage.", en: "A proposed next line, in the character's voice." },
  aiDramaturgie: { fr: "Lecture dramaturgique", en: "Dramaturgical read" },
  aiDramaturgieDesc: { fr: "Notes sur la scène : tension, clarté, voix. Jamais une note de complaisance.", en: "Notes on the scene: tension, clarity, voice. Never a flattering note." },
  aiTraduire: { fr: "Traduire la scène", en: "Translate the scene" },
  aiTraduireDesc: { fr: "Une traduction FR ↔ EN, jouable, qui garde la structure.", en: "A playable FR ↔ EN translation that keeps the structure." },
  aiForWho: { fr: "Pour qui ?", en: "For whom?" },
  aiWhichScene: { fr: "Quelle scène ?", en: "Which scene?" },
  aiWholeScene: { fr: "Toute la scène courante", en: "The whole current scene" },
  aiRun: { fr: "Demander", en: "Ask" },
  aiRunning: { fr: "…", en: "…" },
  aiProposal: { fr: "Proposition", en: "Proposal" },
  aiDraftBadge: { fr: "ébauche · à toi de décider", en: "draft · your call" },
  aiInsert: { fr: "Insérer dans la scène", en: "Insert into the scene" },
  aiRegenerate: { fr: "Une autre", en: "Another" },
  aiDismiss: { fr: "Rejeter", en: "Dismiss" },
  aiTranslationOf: { fr: "Traduction", en: "Translation" },
  aiApplyTranslation: { fr: "Créer une pièce traduite", en: "Create a translated play" },
  aiNeedCast: { fr: "Ajoute au moins un personnage d'abord.", en: "Add at least one character first." },
  aiNeedScene: { fr: "Écris quelques répliques d'abord.", en: "Write a few lines first." },
  aiError: { fr: "Le service n'a pas répondu. Réessaie dans un instant.", en: "The service didn't answer. Try again in a moment." },
  aiStageReading: { fr: "je lis la scène…", en: "reading the scene…" },
  aiStageThinking: { fr: "je cherche la voix…", en: "finding the voice…" },
  aiStageWriting: { fr: "j'écris…", en: "writing…" },
  aiStageTranslating: { fr: "je traduis…", en: "translating…" },
  aiWhatItDoes: { fr: "L'Atelier propose — il n'écrit jamais à ta place sans que tu l'insères. Rien n'est ajouté sans ton geste.", en: "The Studio proposes — it never writes for you until you insert it. Nothing is added without your gesture." },

  // — onboarding —
  obTitle1: { fr: "Écris comme on monte une scène", en: "Write the way a scene is built" },
  obBody1: { fr: "Chaque bloc est un élément : réplique, didascalie, scène, acte. Entrée pour enchaîner, Tab pour changer de type.", en: "Every block is an element: line, stage direction, scene, act. Enter to continue, Tab to change type." },
  obTitle2: { fr: "Ta distribution vit à côté", en: "Your cast lives alongside" },
  obBody2: { fr: "Nomme tes personnages une fois ; renomme-les partout d'un coup. La grille de présence te dit qui parle où.", en: "Name your characters once; rename them everywhere at once. The presence grid shows who speaks where." },
  obTitle3: { fr: "Un dramaturge de poche, bilingue", en: "A pocket dramaturg, bilingual" },
  obBody3: { fr: "L'Atelier peut relancer une scène, la lire d'un œil critique, ou la traduire FR ↔ EN. Toujours une proposition — jamais un verdict.", en: "The Studio can continue a scene, read it critically, or translate it FR ↔ EN. Always a proposal — never a verdict." },
  obStart: { fr: "Lever le rideau", en: "Raise the curtain" },
  obSkip: { fr: "Passer", en: "Skip" },
  next: { fr: "Suivant", en: "Next" },

  // — beat board —
  viewScript: { fr: "Texte", en: "Script" },
  viewBoard: { fr: "Tableau", en: "Board" },
  boardHint: { fr: "Glisse les cartes pour réordonner — chaque carte est une scène.", en: "Drag cards to reorder — each card is a scene." },
  boardEmpty: { fr: "Aucune scène. Ajoute-en une pour bâtir ta structure.", en: "No scenes yet. Add one to build your structure." },
  addSceneAction: { fr: "Ajouter une scène", en: "Add scene" },
  addActAction: { fr: "Ajouter un acte", en: "Add act" },
  sceneHere: { fr: "Scène ici", en: "Scene here" },
  synopsisLabel: { fr: "Intention", en: "Intention" },
  synopsisPlaceholder: { fr: "Ce qui se passe, ce que ça change…", en: "What happens, what it changes…" },
  beatFunction: { fr: "Fonction", en: "Function" },
  beatNone: { fr: "— fonction —", en: "— function —" },
  jumpToText: { fr: "Ouvrir dans le texte", en: "Open in script" },
  moveUp: { fr: "Monter", en: "Move up" },
  moveDown: { fr: "Descendre", en: "Move down" },
  removeSceneHeading: { fr: "Retirer l'en-tête (garde les répliques)", en: "Remove heading (keep the lines)" },
  emptyScene: { fr: "Scène vide", en: "Empty scene" },

  // — misc —
  langOfPlay: { fr: "Langue de la pièce", en: "Play language" },
  interfaceLang: { fr: "Interface", en: "Interface" },
  title: { fr: "Titre", en: "Title" },
  subtitle: { fr: "Sous-titre", en: "Subtitle" },
  author: { fr: "Autrice / auteur", en: "Author" },
  undo: { fr: "Annuler", en: "Undo" },
  inserted: { fr: "Inséré", en: "Inserted" },
  translatedCreated: { fr: "Pièce traduite créée", en: "Translated play created" },
} satisfies Record<string, Entry>;

export type UIKey = keyof typeof STRINGS;

export function t(key: UIKey, locale: Locale): string {
  return STRINGS[key][locale];
}

export interface UICtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: UIKey) => string;
}

export const UIContext = createContext<UICtx>({
  locale: "fr",
  setLocale: () => {},
  t: (k) => STRINGS[k].fr,
});

export function useUI(): UICtx {
  return useContext(UIContext);
}
