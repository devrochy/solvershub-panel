// SolversHub — tema React Native (GENERADO por build.mjs — NO EDITAR).
import type { TextStyle } from "react-native";

export const shBrand = {
  "product": "SolversHub",
  "company": "Roshi",
  "tagline": "Centro de soluciones impulsado con IA",
  "version": "1.4",
  "manual_version": "1.5"
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
  "danger": "#D64545",
  "status": {
    "light": {
      "success": "#17784F",
      "warning": "#8A6100",
      "danger": "#B42E2E",
      "info": "#2058D6"
    },
    "dark": {
      "success": "#2FBF7F",
      "danger": "#F28B82"
    }
  },
  "data": {
    "light": {
      "1": "#2560E6",
      "2": "#B8860B",
      "3": "#0E9DB5",
      "4": "#7B4FD6",
      "seq1": "#52C2D5",
      "seq2": "#2AA9BF",
      "seq3": "#13929F",
      "seq4": "#0E7585",
      "seq5": "#0A5866"
    },
    "dark": {
      "1": "#4F7FF5",
      "2": "#A8851A",
      "3": "#139AAF",
      "4": "#8E6CE8",
      "seq1": "#13798A",
      "seq2": "#1A9BB0",
      "seq3": "#3DBCD0",
      "seq4": "#73D3E2",
      "seq5": "#AEE7F0"
    }
  }
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
export const shDensity = {
  "rowComfortable": 48,
  "rowCompact": 40,
  "controlMd": 40,
  "controlLg": 48
} as const;

/** Duraciones en ms y curvas [x1, y1, x2, y2] para Easing.bezier. Con reducir movimiento, usar 0. */
export const shMotion = {
  "duration": {
    "instant": 100,
    "fast": 150,
    "base": 200,
    "slow": 250
  },
  "easing": {
    "out": [
      0.2,
      0,
      0,
      1
    ],
    "in": [
      0.3,
      0,
      1,
      1
    ],
    "emphasized": [
      0.05,
      0.7,
      0.1,
      1
    ]
  }
} as const;

/** Escala tipográfica de la app (la familia ya trae el peso: Montserrat_700Bold…). */
export const shType = {
  "hero": {
    "fontFamily": "Montserrat_700Bold",
    "fontSize": 28,
    "lineHeight": 34
  },
  "h1": {
    "fontFamily": "Montserrat_600SemiBold",
    "fontSize": 22,
    "lineHeight": 28
  },
  "block": {
    "fontFamily": "Montserrat_600SemiBold",
    "fontSize": 17,
    "lineHeight": 24
  },
  "body": {
    "fontFamily": "Inter_400Regular",
    "fontSize": 16,
    "lineHeight": 24
  },
  "dense": {
    "fontFamily": "Inter_400Regular",
    "fontSize": 14,
    "lineHeight": 20
  },
  "label": {
    "fontFamily": "Inter_500Medium",
    "fontSize": 14,
    "lineHeight": 20
  },
  "caption": {
    "fontFamily": "Inter_400Regular",
    "fontSize": 12,
    "lineHeight": 16
  },
  "mono": {
    "fontFamily": "monospace",
    "fontSize": 13,
    "lineHeight": 18
  }
} as const satisfies Record<string, TextStyle>;

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
    "overlay": "rgba(8, 15, 34, 0.72)",
    "statusSuccessFg": "#2FBF7F",
    "statusSuccessBg": "rgba(34, 160, 107, 0.12)",
    "statusSuccessBorder": "rgba(34, 160, 107, 0.32)",
    "statusWarningFg": "#E0A106",
    "statusWarningBg": "rgba(224, 161, 6, 0.12)",
    "statusWarningBorder": "rgba(224, 161, 6, 0.32)",
    "statusDangerFg": "#F28B82",
    "statusDangerBg": "rgba(214, 69, 69, 0.12)",
    "statusDangerBorder": "rgba(214, 69, 69, 0.32)",
    "statusInfoFg": "#22C7E0",
    "statusInfoBg": "rgba(34, 199, 224, 0.12)",
    "statusInfoBorder": "rgba(34, 199, 224, 0.32)",
    "dataCat1": "#4F7FF5",
    "dataCat2": "#A8851A",
    "dataCat3": "#139AAF",
    "dataCat4": "#8E6CE8",
    "dataSingle": "#22C7E0",
    "dataSeq1": "#13798A",
    "dataSeq2": "#1A9BB0",
    "dataSeq3": "#3DBCD0",
    "dataSeq4": "#73D3E2",
    "dataSeq5": "#AEE7F0",
    "dataGrid": "rgba(201, 210, 227, 0.10)",
    "dataAxis": "#8695B0",
    "elev0": "none",
    "elev1": "none",
    "elev2": "0 8px 24px rgba(0, 0, 0, 0.32)",
    "elev3": "0 16px 48px rgba(0, 0, 0, 0.40)"
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
    "overlay": "rgba(11, 23, 51, 0.48)",
    "statusSuccessFg": "#17784F",
    "statusSuccessBg": "rgba(34, 160, 107, 0.12)",
    "statusSuccessBorder": "rgba(34, 160, 107, 0.32)",
    "statusWarningFg": "#8A6100",
    "statusWarningBg": "rgba(224, 161, 6, 0.12)",
    "statusWarningBorder": "rgba(224, 161, 6, 0.32)",
    "statusDangerFg": "#B42E2E",
    "statusDangerBg": "rgba(214, 69, 69, 0.12)",
    "statusDangerBorder": "rgba(214, 69, 69, 0.32)",
    "statusInfoFg": "#2058D6",
    "statusInfoBg": "rgba(37, 96, 230, 0.12)",
    "statusInfoBorder": "rgba(37, 96, 230, 0.32)",
    "dataCat1": "#2560E6",
    "dataCat2": "#B8860B",
    "dataCat3": "#0E9DB5",
    "dataCat4": "#7B4FD6",
    "dataSingle": "#0E9DB5",
    "dataSeq1": "#52C2D5",
    "dataSeq2": "#2AA9BF",
    "dataSeq3": "#13929F",
    "dataSeq4": "#0E7585",
    "dataSeq5": "#0A5866",
    "dataGrid": "#E2E8F2",
    "dataAxis": "#616F88",
    "elev0": "none",
    "elev1": "0 1px 2px rgba(8, 15, 34, 0.06)",
    "elev2": "0 8px 24px rgba(8, 15, 34, 0.12)",
    "elev3": "0 16px 48px rgba(8, 15, 34, 0.18)"
  }
} as const;

export type ShThemeName = keyof typeof shTheme;
export type ShTheme = (typeof shTheme)[ShThemeName];
