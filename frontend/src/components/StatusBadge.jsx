const COLORS = [
  'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-teal-500',
  'bg-rose-500', 'bg-emerald-500', 'bg-slate-500',
];

export function colorForStatus(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % COLORS.length;
  return COLORS[hash];
}

export default function StatusBadge({ name }) {
  if (!name) return null;
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white ${colorForStatus(name)}`}>
      {name}
    </span>
  );
}
