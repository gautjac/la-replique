import { defineConfig } from "vitest/config";
// Rules tests need the Firestore emulator — run them with `npm run test:rules`.
export default defineConfig({ test: { environment: "node", include: ["firebase/**/*.test.ts"], testTimeout: 20000, fileParallelism: false } });
