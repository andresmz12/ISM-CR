import { useMemo, useRef, useState } from 'react';
import api from '../api/client';
import Icon from './Icon';

const FIELDS = [
  { key: 'fullName', label: 'Nombre completo', required: true, hints: ['nombre', 'name', 'cliente', 'full name', 'fullname'] },
  { key: 'phone', label: 'Teléfono', required: true, hints: ['telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil', 'tel'] },
  { key: 'phoneAlt', label: 'Teléfono alterno', hints: ['alterno', 'telefono 2', 'teléfono 2', 'phone 2', 'otro telefono'] },
  { key: 'email', label: 'Email', hints: ['email', 'correo', 'e-mail', 'mail'] },
  { key: 'address', label: 'Dirección', hints: ['direccion', 'dirección', 'address', 'domicilio'] },
  { key: 'source', label: 'Origen', hints: ['origen', 'source', 'fuente', 'canal'] },
  { key: 'statusName', label: 'Estatus', hints: ['estatus', 'status', 'estado', 'etapa'] },
  { key: 'tags', label: 'Etiquetas', hints: ['etiquetas', 'tags', 'etiqueta'] },
];

function guessMapping(headers) {
  const mapping = {};
  const used = new Set();
  for (const field of FIELDS) {
    const idx = headers.findIndex((h, i) => {
      if (used.has(i)) return false;
      const norm = String(h).trim().toLowerCase();
      return field.hints.some((hint) => norm === hint || norm.includes(hint));
    });
    if (idx >= 0) { mapping[field.key] = idx; used.add(idx); }
  }
  return mapping;
}

export default function ImportClientsModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload'); // upload | map | done
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  function handleFile(file) {
    setError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // xlsx pesa ~400 kB: se carga solo cuando el usuario importa un archivo
        const XLSX = await import('xlsx');
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const nonEmpty = data.filter((r) => r.some((c) => String(c).trim() !== ''));
        if (nonEmpty.length < 2) {
          setError('El archivo no tiene datos (se espera una fila de encabezados y al menos un cliente).');
          return;
        }
        const [head, ...body] = nonEmpty;
        if (body.length > 2000) {
          setError(`El archivo tiene ${body.length} filas; el máximo por importación es 2000. Divide el archivo e intenta de nuevo.`);
          return;
        }
        setFileName(file.name);
        setHeaders(head.map((h) => String(h)));
        setRows(body);
        setMapping(guessMapping(head));
        setStep('map');
      } catch {
        setError('No se pudo leer el archivo. Usa un .xlsx, .xls o .csv válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const mappedPreview = useMemo(() => rows.slice(0, 5).map((r) => {
    const obj = {};
    for (const f of FIELDS) {
      const idx = mapping[f.key];
      obj[f.key] = idx !== undefined && idx !== '' ? String(r[idx] ?? '') : '';
    }
    return obj;
  }), [rows, mapping]);

  const canImport = mapping.fullName !== undefined && mapping.fullName !== ''
    && mapping.phone !== undefined && mapping.phone !== '';

  async function handleImport() {
    setImporting(true);
    setError('');
    try {
      const payload = rows.map((r) => {
        const get = (key) => {
          const idx = mapping[key];
          const v = idx !== undefined && idx !== '' ? String(r[idx] ?? '').trim() : '';
          return v || undefined;
        };
        return {
          fullName: get('fullName') ?? '',
          phone: get('phone') ?? '',
          phoneAlt: get('phoneAlt'),
          email: get('email'),
          address: get('address'),
          source: get('source'),
          statusName: get('statusName'),
          tags: get('tags') ? get('tags').split(/[,;]/).map((t) => t.trim()).filter(Boolean) : undefined,
        };
      }).filter((r) => r.fullName || r.phone);
      const res = await api.post('/clients/import', { rows: payload, duplicateAction });
      setResult(res.data);
      setStep('done');
      onImported();
    } catch (err) {
      setError(err.response?.data?.error || 'La importación falló. Revisa el archivo e intenta de nuevo.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Icon name="upload" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Importar clientes desde Excel</h2>
              <p className="text-xs text-slate-500">Acepta .xlsx, .xls y .csv — máximo 2000 filas por archivo</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center transition hover:border-orange-400 hover:bg-orange-50/50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm">
                <Icon name="file" className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Arrastra tu archivo aquí o haz clic para elegirlo</p>
                <p className="mt-1 text-xs text-slate-500">
                  La primera fila debe tener los encabezados (Nombre, Teléfono, Email, ...)
                </p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                <Icon name="file" className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-800">{fileName}</span>
                <span>· {rows.length} filas detectadas</span>
                <button onClick={() => { setStep('upload'); setRows([]); }} className="ml-auto text-xs font-medium text-orange-600 hover:underline">
                  Cambiar archivo
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">1. Relaciona las columnas de tu archivo</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <label className="w-36 shrink-0 text-sm text-slate-600">
                        {f.label}{f.required && <span className="text-red-500"> *</span>}
                      </label>
                      <select
                        value={mapping[f.key] ?? ''}
                        onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                      >
                        <option value="">— No importar —</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">2. Vista previa (primeras 5 filas)</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {FIELDS.filter((f) => mapping[f.key] !== undefined && mapping[f.key] !== '').map((f) => (
                          <th key={f.key} className="px-3 py-2 text-left font-semibold text-slate-500">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {mappedPreview.map((row, i) => (
                        <tr key={i}>
                          {FIELDS.filter((f) => mapping[f.key] !== undefined && mapping[f.key] !== '').map((f) => (
                            <td key={f.key} className="whitespace-nowrap px-3 py-2 text-slate-700">{row[f.key] || <span className="text-slate-300">—</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">3. Si un teléfono ya existe en el CRM</h3>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={duplicateAction === 'skip'} onChange={() => setDuplicateAction('skip')} className="accent-orange-600" />
                    Omitir la fila (recomendado)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={duplicateAction === 'create'} onChange={() => setDuplicateAction('create')} className="accent-orange-600" />
                    Crear de todos modos
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canImport || importing}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
                >
                  <Icon name="upload" className="h-4 w-4" />
                  {importing ? 'Importando...' : `Importar ${rows.length} clientes`}
                </button>
              </div>
              {!canImport && (
                <p className="text-right text-xs text-amber-600">Debes asignar las columnas de Nombre completo y Teléfono para importar.</p>
              )}
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-5 py-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="check" className="h-7 w-7" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Importación completada</h3>
                <p className="mt-1 text-sm text-slate-500">{fileName}</p>
              </div>
              <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 px-3 py-4">
                  <div className="text-2xl font-bold text-emerald-700">{result.created}</div>
                  <div className="text-xs font-medium text-emerald-600">Creados</div>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-4">
                  <div className="text-2xl font-bold text-amber-700">{result.duplicates}</div>
                  <div className="text-xs font-medium text-amber-600">Duplicados</div>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-4">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-xs font-medium text-red-600">Con error</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mx-auto max-h-40 max-w-md overflow-y-auto rounded-lg border border-red-100 bg-red-50/50 p-3 text-left text-xs text-red-700">
                  {result.errors.map((e, i) => <div key={i}>Fila {e.row}: {e.error}</div>)}
                </div>
              )}
              <button onClick={onClose} className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
