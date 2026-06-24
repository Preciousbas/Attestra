/** Attestra brand mark — scalloped verification seal. Favicon-first, single source of truth. */

export const BRAND_VIEWBOX = "0 0 32 32";

/** 8-point scalloped outer seal */
export const BRAND_SEAL_PATH =
  "M16 2.8L20.29 5.65 25.33 6.67 26.35 11.71 29.2 16 26.35 20.29 25.33 25.33 20.29 26.35 16 29.2 11.71 26.35 6.67 25.33 5.65 20.29 2.8 16 5.65 11.71 6.67 6.67 11.71 5.65Z";

export const BRAND_INNER_CIRCLE = { cx: 16, cy: 16, r: 7.4 };

export const BRAND_CHECK_PATH = "M12.6 16.3 14.7 18.5 19.6 13";

export const BRAND_COLORS = {
  sealStart: "#9d8fff",
  sealEnd: "#7c6dfa",
  inner: "#070b12",
  check: "#2dd4bf",
  tile: "#0e1420",
} as const;
