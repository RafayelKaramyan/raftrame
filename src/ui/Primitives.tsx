import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function IconButton({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Field({
  label,
  value,
  onCommit,
  type = 'text',
  min,
  max,
  step,
  maxLength = 60,
  minLength = 1,
}: {
  label: string;
  value: string | number;
  onCommit: (value: string) => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  minLength?: number;
}) {
  const [error, setError] = useState('');
  const id = useId();
  return (
    <label className="field">
      <span>{label}</span>
      <input
        key={String(value)}
        defaultValue={value}
        type={type}
        required
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        minLength={minLength}
        aria-describedby={error ? id : undefined}
        aria-invalid={error ? true : undefined}
        onInput={() => setError('')}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        onBlur={(event) => {
          const input = event.currentTarget;
          if (!input.checkValidity() || !input.value.trim()) {
            setError(input.validationMessage || 'Enter a value.');
            return;
          }
          if (String(value) !== input.value.trim()) onCommit(input.value.trim());
        }}
      />
      {error && (
        <small id={id} className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
