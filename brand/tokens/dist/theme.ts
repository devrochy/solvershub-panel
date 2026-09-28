// SolversHub — tema React Native (GENERADO por build.mjs — NO EDITAR).
import type { TextStyle } from "react-native";

export const shBrand = {
  "product": "SolversHub",
  "company": "Roshi",
  "tagline": "Centro de soluciones impulsado con IA",
  "version": "1.3"
} as const;

export const shColor = {
  "navy": {
    "600": "#21408A",
    "700": "#172F6C",
    "750": "#16294F",
    "800": "#11224D",
    "900": "#0B1733",
    "950": "#080F22"
  },
  "blue": {
    "500": "#2F6BFF",
    "600": "#2560E6"
  },
  "cyan": {
    "400": "#22C7E0"
  },
  "gold": {
    "500": "#C9A227"
  },
  "slate": {
    "300": "#C9D2E3",
    "400": "#7C8AA3",
    "500": "#616F88",
    "600": "#5A6B85"
  },
  "ice": "#E8EDF7",
  "fog": "#A9B6CC",
  "haze": "#8695B0",
  "steel": "#6B7A94",
  "cloud": "#EEF2F8",
  "frost": "#F1F5FA",
  "veil": "#EDF1F7",
  "white": "#FFFFFF",
  "paper": "#F7F9FC",
  "mist": "#E2E8F2",
  "success": "#22A06B",
  "warning": "#E0A106",
  "danger": "#D64545"
} as const;

export const shFont = {
  display: "Montserrat, 'Century Gothic', 'Didact Gothic', system-ui, sans-serif",
  body: "Inter, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
} as const satisfies Record<string, TextStyle["fontFamily"]>;

export const shRadius = {
  "sm": 6,
  "md": 12,
  "lg": 20,
  "pill": 9999
} as const;
export const shSpace = {
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "6": 24,
  "8": 32,
  "12": 48,
  "16": 64
} as const;

export const shTheme = {
  "dark": {
    "bg": "#0B1733",
    "bgDeep": "#080F22",
    "surface": "#11224D",
    "surface2": "#16294F",
    "surfaceRaised": "#172F6C",
    "border": "rgba(201, 210, 227, 0.10)",
    "borderSoft": "rgba(201, 210, 227, 0.06)",
    "borderStrong": "#21408A",
    "controlBorder": "#6B7A94",
    "text": "#E8EDF7",
    "textStrong": "#FFFFFF",
    "textMuted": "#A9B6CC",
    "textSoft": "#8695B0",
    "link": "#22C7E0",
    "focus": "#22C7E0",
    "hover": "rgba(201, 210, 227, 0.06)",
    "overlay": "rgba(8, 15, 34, 0.72)"
  },
  "light": {
    "bg": "#F7F9FC",
    "bgDeep": "#EEF2F8",
    "surface": "#FFFFFF",
    "surface2": "#F1F5FA",
    "surfaceRaised": "#F1F5FA",
    "border": "#E2E8F2",
    "borderSoft": "#EDF1F7",
    "borderStrong": "#C9D2E3",
    "controlBorder": "#7C8AA3",
    "text": "#0B1733",
    "textStrong": "#080F22",
    "textMuted": "#5A6B85",
    "textSoft": "#616F88",
    "link": "#2560E6",
    "focus": "#2560E6",
    "hover": "#F1F5FA",
    "overlay": "rgba(11, 23, 51, 0.48)"
  }
} as const;

export type ShThemeName = keyof typeof shTheme;
export type ShTheme = (typeof shTheme)[ShThemeName];
