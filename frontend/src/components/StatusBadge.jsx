// Una paleta por estatus: bg sólido (pill/badge), borderLeft (barra lateral de
// fila — usa `border-l-*` en vez de `border-*` a propósito, para no pisar el
// `border-b-slate-100` que separa filas en la misma celda) y chip claro (fondo
// del encabezado de grupo). Se listan como clases completas (no interpoladas)
// para que Tailwind las detecte en el build.
const PALETTE = [
  { bg: 'bg-sky-500', borderLeft: 'border-l-sky-500', chip: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-violet-500', borderLeft: 'border-l-violet-500', chip: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-amber-500', borderLeft: 'border-l-amber-500', chip: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-teal-500', borderLeft: 'border-l-teal-500', chip: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-rose-500', borderLeft: 'border-l-rose-500', chip: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-emerald-500', borderLeft: 'border-l-emerald-500', chip: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-slate-500', borderLeft: 'border-l-slate-500', chip: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' },
];

function paletteForStatus(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash];
}

export function colorForStatus(name = '') {
  return paletteForStatus(name).bg;
}

export function statusPalette(name = '') {
  return paletteForStatus(name);
}

export default function StatusBadge({ name }) {
  if (!name) return null;
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white ${colorForStatus(name)}`}>
      {name}
    </span>
  );
}
