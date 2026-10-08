export function parseJobNumberInput(rawValue: string): string | null {
  const value = rawValue.replace(/,/g, '');
  if (!/^\d*(?:\.\d*)?$/.test(value)) return null;
  if (value === '') return '';
  const normalized = value.startsWith('.') ? `0${value}` : value;
  return Number.isFinite(Number(normalized)) ? normalized : null;
}

export function formatJobNumberInput(value: string, grouped: boolean): string {
  if (value === '') return '';
  const [whole, fraction] = value.split('.');
  const wholeNumber = Number(whole);
  const formattedWhole = grouped
    ? wholeNumber.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : String(wholeNumber);
  return fraction === undefined ? formattedWhole : `${formattedWhole}.${fraction}`;
}
