import React from "react";

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  helperText,
  error,
  leftIcon,
  rightElement,
  className = "",
  id,
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-hairline">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-label font-medium text-secondary"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-muted pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          className={`w-full h-9 px-3 text-body bg-panel text-primary border rounded-control transition-colors placeholder:text-muted disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            leftIcon ? "pl-9" : ""
          } ${rightElement ? "pr-10" : ""} ${
            error
              ? "border-state-error"
              : "border-strong hover:border-strong/80"
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-2.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-caption text-state-error mt-hairline">{error}</p>
      ) : helperText ? (
        <p className="text-caption text-muted mt-hairline">{helperText}</p>
      ) : null}
    </div>
  );
};
