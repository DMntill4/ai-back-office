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
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-txt-secondary"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-txt-tertiary pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          className={`w-full h-9 px-3 text-xs bg-forest-card text-txt-primary border rounded-md transition-colors placeholder:text-txt-tertiary disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? "pl-9" : ""
          } ${rightElement ? "pr-10" : ""} ${
            error
              ? "border-state-error focus-visible:ring-state-error"
              : "border-forest-border hover:border-forest-borderBright"
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
        <p className="text-[11px] text-state-error flex items-center gap-1">
          <span aria-hidden="true">■</span> {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-txt-tertiary">{helperText}</p>
      ) : null}
    </div>
  );
};

