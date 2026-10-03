export default function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return <span className="text-ochre" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>{'★'.repeat(full)}<span className="text-ink/20">{'★'.repeat(5 - full)}</span></span>;
}
