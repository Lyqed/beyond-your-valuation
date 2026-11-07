import { useId, type CSSProperties } from 'react';

type RangeFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  step?: number;
  display: string;
  hint?: string;
};

export default function RangeField({ label, value, onChange, min = 0, max, step = 1, display, hint }: RangeFieldProps) {
  const id = useId();
  const tolerance = 1e-10;
  const position = (value - min) / step;
  const offGrid = Math.abs(position - Math.round(position)) > tolerance;
  const lastStep = Math.floor((max - min) / step + tolerance);
  const visibleMin = Math.min(min, value);
  // Saved version-one scenarios may have finer precision than the visible controls.
  // Preserve their exact value until an edit, then emit only reachable grid values.
  const atStep = (index: number) => Number((min + index * step).toPrecision(15));
  const snap = (next: number) => atStep(Math.max(0, Math.min(lastStep, Math.round((next - min) / step))));

  return <div className="range-field">
    <div className="field-top"><label htmlFor={id}>{label}</label><output htmlFor={id}>{display}</output></div>
    <input
      id={id}
      type="range"
      min={visibleMin}
      max={max}
      step={offGrid ? 'any' : step}
      value={value}
      onChange={event => { if (lastStep >= 0) onChange(snap(Number(event.target.value))); }}
      onKeyDown={event => {
        if (!offGrid) return;
        const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 0;
        if (!direction) return;
        event.preventDefault();
        const nextStep = direction > 0 ? Math.floor(position) + 1 : Math.ceil(position) - 1;
        if (nextStep >= 0 && nextStep <= lastStep) onChange(atStep(nextStep));
      }}
      aria-valuetext={display}
      aria-describedby={hint ? `${id}-hint` : undefined}
      style={{ '--fill': `${max === visibleMin ? 0 : (value - visibleMin) / (max - visibleMin) * 100}%` } as CSSProperties}
    />
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}
