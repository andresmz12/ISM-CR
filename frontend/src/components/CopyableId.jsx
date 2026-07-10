import { useState } from 'react';
import Icon from './Icon';

// Chip con el UUID de un registro y un botón para copiarlo — pensado para IDs
// que el usuario necesita pegar en otro lado (ej. variables de entorno de
// integraciones como LEADS_DEFAULT_PROJECT_ID).
export default function CopyableId({ id, label = 'ID' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${label}: ${id}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
    >
      <span className="max-w-[160px] truncate">{id}</span>
      <Icon name={copied ? 'check' : 'copy'} className={`h-3 w-3 shrink-0 ${copied ? 'text-emerald-600' : ''}`} />
    </button>
  );
}
