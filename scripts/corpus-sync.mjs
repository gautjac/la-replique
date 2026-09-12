#!/usr/bin/env node
// Vendor the Atelier's craft corpus from the local Claude Code skills dir.
//
//   npm run corpus:sync                      # from ~/.claude/skills
//   SKILLS_DIR=/path/to/skills npm run corpus:sync
//   npm run corpus:sync -- --commit <sha>    # record the upstream commit
//
// Reads netlify/functions/lib/corpus/manifest.json, copies every file it names
// (core ∪ ops) into netlify/functions/lib/corpus/<skill>/<file>, removes vendored
// files the manifest no longer lists, mirrors the whole folder into the native
// app (../la-replique-native/Corpus) when that checkout exists, then rebuilds
// corpus.generated.ts. Netlify never sees ~/.claude, which is why we vendor.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const corpusDir = path.join(root, "netlify/functions/lib/corpus");
const manifestPath = path.join(corpusDir, "manifest.json");
const skillsDir = process.env.SKILLS_DIR ?? path.join(os.homedir(), ".claude/skills");

const args = process.argv.slice(2);
const commitIdx = args.indexOf("--commit");
const commit = commitIdx >= 0 ? args[commitIdx + 1] : null;
const nativeIdx = args.indexOf("--native");
const nativeDir =
  nativeIdx >= 0 ? path.resolve(args[nativeIdx + 1]) : path.resolve(root, "../la-replique-native/Corpus");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const wanted = [...new Set([...manifest.core, ...Object.values(manifest.ops).flat()])].sort();

if (!fs.existsSync(skillsDir)) {
  console.error(`corpus-sync: skills dir not found: ${skillsDir}`);
  process.exit(1);
}

// 1. Copy every wanted file.
let copied = 0;
for (const rel of wanted) {
  const src = path.join(skillsDir, rel);
  if (!fs.existsSync(src)) {
    console.error(`corpus-sync: missing in ${skillsDir}: ${rel}`);
    process.exit(1);
  }
  const dst = path.join(corpusDir, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  copied++;
}

// 2. Remove vendored skill files the manifest no longer lists (never touch
//    manifest.json / PREAMBLE.md, which live at the corpus root).
for (const entry of fs.readdirSync(corpusDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skill = entry.name;
  for (const file of fs.readdirSync(path.join(corpusDir, skill))) {
    const rel = `${skill}/${file}`;
    if (!wanted.includes(rel)) {
      fs.rmSync(path.join(corpusDir, rel));
      console.log(`corpus-sync: removed stale ${rel}`);
    }
  }
  if (fs.readdirSync(path.join(corpusDir, skill)).length === 0) fs.rmdirSync(path.join(corpusDir, skill));
}

// 3. Stamp the manifest.
manifest.source.syncedAt = new Date().toISOString().slice(0, 10);
if (commit) manifest.source.commit = commit;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// 4. Mirror into the native app when it is checked out next door.
if (fs.existsSync(path.dirname(nativeDir))) {
  fs.rmSync(nativeDir, { recursive: true, force: true });
  fs.mkdirSync(nativeDir, { recursive: true });
  for (const name of ["manifest.json", "PREAMBLE.md"]) {
    fs.copyFileSync(path.join(corpusDir, name), path.join(nativeDir, name));
  }
  for (const rel of wanted) {
    const dst = path.join(nativeDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(corpusDir, rel), dst);
  }
  console.log(`corpus-sync: mirrored ${wanted.length} files → ${nativeDir}`);
} else {
  console.log(`corpus-sync: native checkout not found at ${path.dirname(nativeDir)} — skipped mirror`);
}

console.log(`corpus-sync: ${copied} files from ${skillsDir} (commit ${manifest.source.commit.slice(0, 7)})`);

// 5. Regenerate corpus.generated.ts.
execFileSync(process.execPath, [path.join(here, "corpus-build.mjs")], { stdio: "inherit" });
