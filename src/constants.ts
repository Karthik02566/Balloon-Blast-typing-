export const WORDS = [
  "shiva","chanu","apple", "banana", "cherry", "dragon", "eagle", "forest", "galaxy", "honey", "island", "jungle",
  "kitten", "lemon", "mountain", "nebula", "ocean", "planet", "quartz", "river", "sun", "tiger",
  "unity", "valley", "wave", "xenon", "yacht", "zebra", "active", "bright", "cloud", "dance",
  "earth", "flame", "garden", "happy", "image", "joy", "kind", "laugh", "magic", "night",
  "open", "peace", "quiet", "rain", "smile", "time", "under", "voice", "water", "young",
  "zero", "breeze", "crystal", "dream", "energy", "flower", "glow", "heart", "ideal", "jump",
  "kite", "light", "moon", "nature", "orbit", "power", "quick", "rise", "star", "trust",
  "ultra", "vibrant", "wild", "yellow", "zoom", "anchor", "beach", "coral", "dawn", "echo",
  "frost", "gold", "haze", "ice", "jade", "koala", "leaf", "mist", "noon", "opal",
  "pearl", "reef", "sand", "tide", "urban", "vivid", "wind", "yoga", "zephyr"
];

export interface BalloonStyle {
  id: string;
  gradient: string;
  glow: string;
  accent: string;
}

export const BALLOON_COLORS: BalloonStyle[] = [
  {
    id: "coral",
    gradient: "from-rose-500 to-red-600",
    glow: "shadow-rose-500/40",
    accent: "bg-rose-400"
  },
  {
    id: "indigo",
    gradient: "from-indigo-500 to-violet-600",
    glow: "shadow-indigo-500/40",
    accent: "bg-indigo-400"
  },
  {
    id: "emerald",
    gradient: "from-emerald-400 to-teal-600",
    glow: "shadow-emerald-500/40",
    accent: "bg-emerald-300"
  },
  {
    id: "amber",
    gradient: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/40",
    accent: "bg-amber-300"
  },
  {
    id: "sky",
    gradient: "from-sky-400 to-blue-600",
    glow: "shadow-sky-500/40",
    accent: "bg-sky-300"
  },
  {
    id: "fuchsia",
    gradient: "from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-500/40",
    accent: "bg-fuchsia-300"
  }
];

