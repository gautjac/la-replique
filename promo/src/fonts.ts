import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSans";

export const grotesk = loadGrotesk("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

export const plex = loadPlex("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
}).fontFamily;
