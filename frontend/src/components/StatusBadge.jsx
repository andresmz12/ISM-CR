const COLORS = [
  { badge: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  { badge: 'bg-purple-50 text-purple-700 ring-purple-600/20', dot: 'bg-purple-500' },
  { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  { badge: 'bg-teal-50 text-teal-700 ring-teal-600/20', dot: 'bg-teal-500' },
  { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
  { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  { badge: 'bg-slate-50 text-slate-700 ring-slate-600/20', dot: 'bg-slate-500' },
];

function colorForStatus(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % COLORS.length;
  return COLORS[hash];
}

export default function StatusBadge({ name }) {
  if (!name) return null;
  const c = colorForStatus(name);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {name}
    </span>
  );
}
