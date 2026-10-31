import React from "react";
import { MintLogo } from "./MintLogo";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "Cargando información",
  subtitle = "Consultando los datos necesarios para esta vista.",
  fullScreen = true,
}) => (
  <div
    className={`flex flex-col items-center justify-center bg-canvas text-primary font-sans ${
      fullScreen ? "fixed inset-0 z-50" : "flex-1 min-h-[16rem] w-full"
    }`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="relative flex h-48 w-48 items-center justify-center" aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-border opacity-40" />
      <div className="absolute h-40 w-40 rounded-full border border-border opacity-60" />
      <div className="absolute h-32 w-32 rounded-full border border-border opacity-80" />

      <svg
        className="absolute h-28 w-28 animate-spin motion-reduce:animate-none"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          className="stroke-brand opacity-20"
          strokeWidth="3"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          className="stroke-brand"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="70 200"
        />
      </svg>

      <div className="relative flex h-20 w-20 items-center justify-center rounded-container bg-panel border border-border">
        <MintLogo size="md" showText={false} />
      </div>
    </div>

    <div className="mt-group max-w-sm space-y-compact px-base text-center">
      <h2 className="text-section-title font-semibold text-primary">{title}</h2>
      <p className="text-body leading-relaxed text-secondary">{subtitle}</p>
    </div>
  </div>
);
