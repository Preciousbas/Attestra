import { useId } from "react";
import {
  BRAND_CHECK_PATH,
  BRAND_COLORS,
  BRAND_INNER_CIRCLE,
  BRAND_SEAL_PATH,
  BRAND_VIEWBOX,
} from "../../shared/brand-mark.ts";

export type BrandLogoVariant = "mark" | "app-icon";

export function BrandLogo({
  size = 30,
  variant = "mark",
}: {
  size?: number;
  variant?: BrandLogoVariant;
}) {
  const sealGrad = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox={BRAND_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {variant === "app-icon" && (
        <rect width="32" height="32" rx="8" fill={BRAND_COLORS.tile} />
      )}
      <path d={BRAND_SEAL_PATH} fill={`url(#${sealGrad})`} />
      <circle
        cx={BRAND_INNER_CIRCLE.cx}
        cy={BRAND_INNER_CIRCLE.cy}
        r={BRAND_INNER_CIRCLE.r}
        fill={BRAND_COLORS.inner}
      />
      <path
        d={BRAND_CHECK_PATH}
        stroke={BRAND_COLORS.check}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id={sealGrad}
          x1="6"
          y1="4"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={BRAND_COLORS.sealStart} />
          <stop offset="1" stopColor={BRAND_COLORS.sealEnd} />
        </linearGradient>
      </defs>
    </svg>
  );
}
