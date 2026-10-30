import type { Role } from "./campus-types";

export type RoleTheme = {
  gradient: string; // page header gradient
  sidebar: string; // sidebar active item
  button: string; // primary button classes
  chip: string; // soft chip
  text: string; // strong accent text
  pageBg: string; // soft page tint
  ring: string; // focus ring
  statGradients: string[]; // stat card gradients
  chart: string[]; // chart colors
  emoji: string;
  tagline: string;
  portalName: string;
};

export const ROLE_THEMES: Record<Role, RoleTheme> = {
  ADMIN: {
    gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    sidebar: "bg-violet-100 text-violet-800",
    button: "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white",
    chip: "bg-violet-100 text-violet-700",
    text: "text-violet-700",
    pageBg: "bg-violet-50/60",
    ring: "ring-violet-400",
    statGradients: [
      "from-violet-500 to-purple-600",
      "from-fuchsia-500 to-pink-600",
      "from-purple-500 to-indigo-500",
      "from-pink-500 to-rose-500",
    ],
    chart: ["#8b5cf6", "#d946ef", "#a855f7", "#ec4899"],
    emoji: "🛡️",
    tagline: "Campus Command Center",
    portalName: "Admin Console",
  },
  TEACHER: {
    gradient: "from-emerald-600 via-teal-600 to-green-600",
    sidebar: "bg-emerald-100 text-emerald-800",
    button: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white",
    chip: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
    pageBg: "bg-emerald-50/60",
    ring: "ring-emerald-400",
    statGradients: [
      "from-emerald-500 to-teal-600",
      "from-teal-500 to-cyan-600",
      "from-green-500 to-emerald-600",
      "from-lime-500 to-green-600",
    ],
    chart: ["#10b981", "#14b8a6", "#22c55e", "#84cc16"],
    emoji: "📚",
    tagline: "Classroom Hub",
    portalName: "Teacher Hub",
  },
  STUDENT: {
    gradient: "from-amber-500 via-orange-500 to-orange-600",
    sidebar: "bg-amber-100 text-amber-800",
    button: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white",
    chip: "bg-amber-100 text-amber-800",
    text: "text-orange-700",
    pageBg: "bg-amber-50/60",
    ring: "ring-amber-400",
    statGradients: [
      "from-amber-500 to-orange-600",
      "from-orange-500 to-red-500",
      "from-yellow-500 to-amber-600",
      "from-orange-400 to-pink-500",
    ],
    chart: ["#f59e0b", "#f97316", "#eab308", "#fb7185"],
    emoji: "🎒",
    tagline: "My Learning World",
    portalName: "Student Portal",
  },
  PARENT: {
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    sidebar: "bg-rose-100 text-rose-800",
    button: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white",
    chip: "bg-rose-100 text-rose-700",
    text: "text-rose-700",
    pageBg: "bg-rose-50/60",
    ring: "ring-rose-400",
    statGradients: [
      "from-rose-500 to-pink-600",
      "from-pink-500 to-fuchsia-600",
      "from-red-400 to-rose-600",
      "from-fuchsia-500 to-purple-500",
    ],
    chart: ["#f43f5e", "#ec4899", "#d946ef", "#fb7185"],
    emoji: "👨‍👩‍👧",
    tagline: "Family Corner",
    portalName: "Parent Portal",
  },
};
