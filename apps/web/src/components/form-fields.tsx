import type { ReactNode } from 'react';

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

type TextFieldProps = BaseProps & {
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date';
  defaultValue?: string | number;
  placeholder?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
};

export function TextField({
  label,
  name,
  error,
  hint,
  required,
  type = 'text',
  defaultValue,
  placeholder,
  autoComplete,
  min,
  max,
  step,
  disabled,
}: TextFieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="field-input"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      {hint && !error ? (
        <p className="field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${name}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SelectOption = { value: string; label: string };

type SelectFieldProps = BaseProps & {
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function SelectField({
  label,
  name,
  error,
  hint,
  required,
  options,
  defaultValue,
  placeholder,
  disabled,
}: SelectFieldProps) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <select
        id={name}
        name={name}
        className="field-input"
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextareaFieldProps = BaseProps & {
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
};

export function TextareaField({
  label,
  name,
  error,
  hint,
  required,
  defaultValue,
  placeholder,
  rows = 4,
}: TextareaFieldProps) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <textarea
        id={name}
        name={name}
        className="field-input"
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
      />
      {hint && !error ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </legend>
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      {children}
    </fieldset>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      role="status"
    >
      {children}
    </div>
  );
}
