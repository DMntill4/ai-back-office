import React from "react";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  hasBorder?: boolean;
  variant?: "default" | "card";
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  hasBorder = true,
  variant = "default",
  children,
  className = "",
  ...props
}) => {
  const radiusClass = variant === "card" ? "rounded-card" : "rounded-container";
  return (
    <div
      className={`bg-panel ${radiusClass} p-group ${
        hasBorder ? "border border-border" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

