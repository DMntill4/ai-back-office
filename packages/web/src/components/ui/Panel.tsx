import React from "react";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  hasBorder?: boolean;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  hasBorder = true,
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-panel rounded-container p-group ${
        hasBorder ? "border border-border" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

