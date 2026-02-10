export interface ThemePreset {
  id: string;
  name: string;
  // HSL values (without hsl() wrapper) for CSS variables
  light: {
    primary: string;
    accent: string;
    ring: string;
  };
  dark: {
    primary: string;
    accent: string;
    ring: string;
  };
  // RGB values for gradient/glow usage in rgba()
  rgb: string; // e.g. "251, 146, 60"
  // Tailwind-compatible hex for inline styles
  hex: string;
}

export const themePresets: ThemePreset[] = [
  {
    id: "orange",
    name: "Orange",
    light: { primary: "24 95% 53%", accent: "24 95% 53%", ring: "24 95% 53%" },
    dark: { primary: "24 100% 60%", accent: "24 100% 60%", ring: "24 100% 60%" },
    rgb: "249, 115, 22",
    hex: "#f97316",
  },
  {
    id: "blue",
    name: "Blue",
    light: { primary: "221 83% 53%", accent: "221 83% 53%", ring: "221 83% 53%" },
    dark: { primary: "217 91% 60%", accent: "217 91% 60%", ring: "217 91% 60%" },
    rgb: "59, 130, 246",
    hex: "#3b82f6",
  },
  {
    id: "purple",
    name: "Purple",
    light: { primary: "262 83% 58%", accent: "262 83% 58%", ring: "262 83% 58%" },
    dark: { primary: "263 70% 65%", accent: "263 70% 65%", ring: "263 70% 65%" },
    rgb: "139, 92, 246",
    hex: "#8b5cf6",
  },
  {
    id: "teal",
    name: "Teal",
    light: { primary: "172 66% 50%", accent: "172 66% 50%", ring: "172 66% 50%" },
    dark: { primary: "172 66% 55%", accent: "172 66% 55%", ring: "172 66% 55%" },
    rgb: "20, 184, 166",
    hex: "#14b8a6",
  },
  {
    id: "rose",
    name: "Rose",
    light: { primary: "350 89% 60%", accent: "350 89% 60%", ring: "350 89% 60%" },
    dark: { primary: "350 89% 65%", accent: "350 89% 65%", ring: "350 89% 65%" },
    rgb: "244, 63, 94",
    hex: "#f43f5e",
  },
  {
    id: "emerald",
    name: "Emerald",
    light: { primary: "160 84% 39%", accent: "160 84% 39%", ring: "160 84% 39%" },
    dark: { primary: "160 67% 50%", accent: "160 67% 50%", ring: "160 67% 50%" },
    rgb: "16, 185, 129",
    hex: "#10b981",
  },
  {
    id: "indigo",
    name: "Indigo",
    light: { primary: "239 84% 67%", accent: "239 84% 67%", ring: "239 84% 67%" },
    dark: { primary: "239 84% 72%", accent: "239 84% 72%", ring: "239 84% 72%" },
    rgb: "99, 102, 241",
    hex: "#6366f1",
  },
  {
    id: "amber",
    name: "Amber",
    light: { primary: "38 92% 50%", accent: "38 92% 50%", ring: "38 92% 50%" },
    dark: { primary: "38 92% 55%", accent: "38 92% 55%", ring: "38 92% 55%" },
    rgb: "245, 158, 11",
    hex: "#f59e0b",
  },
];

export const DEFAULT_THEME_ID = "orange";

export function getThemeById(id: string): ThemePreset {
  return themePresets.find((t) => t.id === id) || themePresets[0];
}
