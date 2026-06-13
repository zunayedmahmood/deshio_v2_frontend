export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function money(value: any) {
  const number = Number(value || 0);
  return `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(number)}`;
}

export function number(value: any) {
  return new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function pct(value: any) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function dateLabel(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function joinIds(values: string[]) {
  return values.filter(Boolean).join(',');
}
