import { useState } from 'react';
import api from '../api/client';
import Icon from './Icon';

const TYPE_LABELS = { CALL: 'Llamada', EMAIL: 'Email', WHATSAPP: 'WhatsApp', SMS: 'SMS', VISIT: 'Visita', OTHER: 'Otro' };
const INTERACTION_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'SMS', 'VISIT', 'OTHER'];

export default function QuickNoteModal({ client, onClose, onSaved }) {
  const [type, setType] = useState('CALL');
  const [notes, setNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/clients/${client.id}/interactions`, {
        type,
        notes,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la nota.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Agregar nota</h2>
            <p className="text-sm text-slate-500">{client.fullName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nota *</label>
            <textarea required autoFocus rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="¿Qué se habló con el cliente?" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Próximo seguimiento (opcional)</label>
            <input type="datetime-local" value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} className={inputCls} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
