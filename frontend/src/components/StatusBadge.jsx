const COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-amber-100 text-amber-800',
  'bg-teal-100 text-teal-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
  'bg-gray-100 text-gray-800',
];

function colorForStatus(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % COLORS.length;
  return COLORS[hash];
}

export default function StatusBadge({ name }) {
  if (!name) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorForStatus(name)}`}>
      {name}
    </span>
  );
}
