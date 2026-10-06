import { memo, useEffect, useId, useState } from 'react';
import type { DateRange, ParamDef, ParamValue } from '../types';
import { input } from './ui';

interface Props {
  def: ParamDef;
  value: ParamValue;
  defaultValue: ParamValue;
  error?: string;
  onChange: (key: string, value: ParamValue) => void;
  /** Reports text that is not a number yet, so Run can stay disabled without losing the user's typing. */
  onDraftInvalid: (key: string, invalid: boolean) => void;
}

const labelCls = 'text-[13px] font-medium text-ink';

function helpText(def: ParamDef) {
  if (def.help) return def.help;
  if (def.min !== undefined && def.max !== undefined) return `Between ${def.min} and ${def.max}`;
  return null;
}

function NumberInput({ def, value, error, onChange, onDraftInvalid, describedBy, id }: Props & { describedBy: string; id: string }) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value));
  const [draftError, setDraftError] = useState<string | null>(null);

  // External changes (reset, saved configuration, back button) replace the draft.
  useEffect(() => {
    setText((prev) => (Number(prev) === value && prev.trim() !== '' ? prev : value === null ? '' : String(value)));
    setDraftError(null);
    onDraftInvalid(def.key, false);
  }, [value, def.key, onDraftInvalid]);

  return (
    <div className="flex items-stretch">
      <input
        id={id}
        type="number"
        inputMode={def.type === 'int' ? 'numeric' : 'decimal'}
        min={def.min}
        max={def.max}
        step={def.step ?? (def.type === 'int' ? 1 : 'any')}
        value={text}
        aria-invalid={!!(error || draftError) || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const n = Number(raw);
          const invalid = raw.trim() === '' || Number.isNaN(n);
          setDraftError(invalid ? 'Enter a number' : null);
          onDraftInvalid(def.key, invalid);
          if (!invalid) onChange(def.key, n);
        }}
        className={`${input} font-plex-mono ${def.unit ? 'rounded-r-none' : ''}`}
      />
      {def.unit && (
        <span className="flex items-center rounded-r-lg border border-l-0 border-line bg-paper px-2.5 text-[12.5px] text-muted">
          {def.unit}
        </span>
      )}
    </div>
  );
}

/** One generic field per parameter type. No screen-specific branches. */
export const ParameterField = memo(function ParameterField(props: Props) {
  const { def, value, defaultValue, error, onChange } = props;
  const id = useId();
  const helpId = `${id}-help`;
  const changed = JSON.stringify(value) !== JSON.stringify(defaultValue);
  const help = helpText(def);
  const reset = changed ? (
    <button type="button" onClick={() => onChange(def.key, defaultValue)} className="border-0 bg-transparent p-0 text-[11.5px] text-forest hover:underline">
      Reset
    </button>
  ) : null;
  const footer = (error || help) && (
    <span id={helpId} className={`text-xs ${error ? 'text-warn' : 'text-muted'}`}>
      {error ?? help}
    </span>
  );

  if (def.type === 'boolean')
    return (
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-ink">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(def.key, e.target.checked)}
            aria-describedby={helpId}
            className="mt-0.5 size-4 shrink-0 accent-forest"
          />
          <span className="flex-1">{def.label}</span>
          {reset}
        </label>
        {footer && <span className="pl-6.5">{footer}</span>}
      </div>
    );

  if (def.type === 'multi_select') {
    const selected = new Set(Array.isArray(value) ? value : []);
    return (
      <fieldset className="flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 flex w-full items-center justify-between">
          <span className={labelCls}>{def.label}</span>
          {reset}
        </legend>
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-white px-2.5 py-2">
          {def.options?.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o.value);
                  else next.delete(o.value);
                  onChange(def.key, def.options!.map((x) => x.value).filter((v) => next.has(v)));
                }}
                className="size-4 accent-forest"
              />
              {o.label}
            </label>
          ))}
        </div>
        {footer}
      </fieldset>
    );
  }

  if (def.type === 'date_range') {
    const r = (value as DateRange | null) ?? { from: '', to: '' };
    return (
      <fieldset className="flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 flex w-full items-center justify-between">
          <span className={labelCls}>{def.label}</span>
          {reset}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" aria-label={`${def.label} from`} value={r.from} max={r.to || undefined} onChange={(e) => onChange(def.key, { ...r, from: e.target.value })} className={`${input} font-plex-mono text-[12.5px]`} aria-invalid={!!error || undefined} />
          <input type="date" aria-label={`${def.label} to`} value={r.to} min={r.from || undefined} onChange={(e) => onChange(def.key, { ...r, to: e.target.value })} className={`${input} font-plex-mono text-[12.5px]`} aria-invalid={!!error || undefined} />
        </div>
        {footer}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelCls}>
          {def.label}
        </label>
        {reset}
      </div>
      {(def.type === 'int' || def.type === 'decimal') && <NumberInput {...props} id={id} describedBy={helpId} />}
      {def.type === 'select' && (
        <select id={id} value={String(value ?? '')} onChange={(e) => onChange(def.key, e.target.value)} aria-describedby={helpId} className={input}>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {def.type === 'date' && (
        <input id={id} type="date" value={String(value ?? '')} onChange={(e) => onChange(def.key, e.target.value)} aria-describedby={helpId} className={`${input} font-plex-mono`} />
      )}
      {def.type === 'text' && (
        <input id={id} type="text" value={String(value ?? '')} onChange={(e) => onChange(def.key, e.target.value)} aria-describedby={helpId} className={input} />
      )}
      {footer}
    </div>
  );
});
