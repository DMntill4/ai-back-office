import React, { useState } from "react";

export interface MintLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-6",
  md: "h-8",
  lg: "h-11",
} as const;

const ICON_SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-11 w-11",
} as const;

export const MintLogo: React.FC<MintLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const [hasAssetError, setHasAssetError] = useState(false);

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-compact ${className}`}
    >
      {hasAssetError ? (
        <span
          className="inline-flex shrink-0 items-center gap-1.5"
          role="img"
          aria-label="Mint."
        >
          <svg
            className={ICON_SIZE_CLASSES[size]}
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="42" height="42" rx="13" fill="#042F2C" />
            <path
              d="M12 28.5V18.8c0-2.2 2.8-3.1 4.1-1.4l5.9 7.7 5.9-7.7c1.3-1.7 4.1-.8 4.1 1.4v9.7"
              stroke="#10B981"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M27.5 12.2c3.5-2.1 6.4-1.8 7.3-1.5-.2 3.2-2.2 5.5-6.1 6.3"
              stroke="#34D399"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-sans text-body font-bold tracking-tight text-primary">
            Mint<span className="text-brand">.</span>
          </span>
        </span>
      ) : (
        <img
          src="/assets/bannerIcon.png"
          alt="Mint."
          loading="eager"
          draggable={false}
          onError={() => setHasAssetError(true)}
          className={`${SIZE_CLASSES[size]} w-auto shrink-0 object-contain mix-blend-screen`}
        />
      )}
      {showText && (
        <span className="font-mono text-caption text-secondary whitespace-nowrap">
          AI Back Office
        </span>
      )}
    </span>
  );
};
