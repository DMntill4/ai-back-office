import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  helperText,
  error,
  className = "",
  id,
  disabled,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-txt-secondary"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          disabled={disabled}
          className={`w-full h-9 pl-3 pr-8 text-xs bg-forest-card text-txt-primary border rounded-md appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${error
              ? "border-state-error focus-visible:ring-state-error"
              : "border-forest-border hover:border-forest-borderBright"
            } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-forest-card text-txt-primary"
            >
              {opt.label}
            </option>
          ))}
        </select>

        <span className="absolute right-2.5 pointer-events-none text-txt-tertiary">
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>

      {error ? (
        <p className="text-caption text-state-error">{error}</p>
      ) : helperText ? (
        <p className="text-caption text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};

