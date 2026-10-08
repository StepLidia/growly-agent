import { formatJobNumberInput, parseJobNumberInput } from '../calculations/jobNumberInput';

type JobNumberInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  grouped?: boolean;
};

export function JobNumberInput({ label, value, onChange, grouped = false }: JobNumberInputProps) {
  return (
    <input
      aria-label={label}
      className="glass-input w-full min-w-0 py-1! text-right text-sm font-black text-slate-950 outline-none"
      type="text"
      inputMode="decimal"
      value={formatJobNumberInput(value, grouped)}
      onChange={(event) => {
        const nextValue = parseJobNumberInput(event.currentTarget.value);
        if (nextValue !== null) onChange(nextValue);
      }}
    />
  );
}
