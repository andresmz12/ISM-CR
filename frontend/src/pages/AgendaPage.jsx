import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Icon, { Avatar } from '../components/Icon';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABEL = { month: 'long', year: 'numeric' };

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ClientTaskList({ items, emptyText }) {
  if (items.length === 0) return <p className="py-4 text-sm text-slate-400">{emptyText}</p>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <Avatar name={c.fullName} className="h-9 w-9 text-xs" />
            <div>
              <Link to={`/clients/${c.id}`} className="font-semibold text-slate-900 hover:text-orange-600">{c.fullName}</Link>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Icon name="phone" className="h-3.5 w-3.5" />{c.phone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right text-sm text-slate-500">
            <StatusBadge name={c.status?.name} />
            <span>{c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleString() : '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView() {
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/clients/tasks/today'),
      api.get('/clients/tasks/overdue'),
    ])
      .then(([t, o]) => { setToday(t.data); setOverdue(o.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="clock" className="h-4 w-4 text-red-600" />
            <h2 className="text-sm font-semibold text-red-800">Seguimientos vencidos ({overdue.length})</h2>
          </div>
          <ClientTaskList items={overdue} emptyText="Sin pendientes." />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="calendar" className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Para contactar hoy ({today.length})</h2>
        </div>
        <ClientTaskList items={today} emptyText="Sin seguimientos programados para hoy." />
      </div>
    </div>
  );
}

function CalendarView() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date());

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59), [cursor]);

  const gridDays = useMemo(() => {
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      const d = new Date(monthStart);
      d.setDate(d.getDate() - (firstWeekday - i));
      cells.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), inMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, inMonth: false });
    }
    return cells;
  }, [cursor, monthStart, monthEnd]);

  useEffect(() => {
    setLoading(true);
    api.get('/clients/tasks/range', { params: { start: monthStart.toISOString(), end: monthEnd.toISOString() } })
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, [monthStart, monthEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const key = dateKey(new Date(ev.nextFollowUpAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }, [events]);

  const today = new Date();
  const selectedEvents = eventsByDay.get(dateKey(selectedDay)) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm capitalize text-slate-500">{cursor.toLocaleDateString('es', MONTH_LABEL)}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d); setSelectedDay(new Date()); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Hoy
          </button>
          <div className="flex rounded-lg border border-slate-300 bg-white shadow-sm">
            <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="p-2 text-slate-500 hover:text-slate-900">
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>
            <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="p-2 text-slate-500 hover:text-slate-900">
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{w}</div>
            ))}
          </div>
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {gridDays.map(({ date, inMonth }, i) => {
                const dayEvents = eventsByDay.get(dateKey(date)) ?? [];
                const isToday = isSameDay(date, today);
                const isSelected = isSameDay(date, selectedDay);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(date)}
                    className={`flex min-h-24 flex-col items-start gap-1 border-b border-r border-slate-100 p-2 text-left transition ${
                      inMonth ? 'bg-white' : 'bg-slate-50/50'
                    } ${isSelected ? 'ring-2 ring-inset ring-orange-400' : ''} hover:bg-orange-50/40`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? 'bg-orange-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      {date.getDate()}
                    </span>
                    <div className="w-full space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div key={ev.id} className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          new Date(ev.nextFollowUpAt) < today ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600'
                        }`}>
                          {ev.fullName}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[11px] font-medium text-slate-400">+{dayEvents.length - 2} más</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {selectedDay.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <div className="divide-y divide-slate-100">
            {selectedEvents.map((ev) => (
              <div key={ev.id} className="py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={ev.fullName} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/clients/${ev.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-orange-600">
                      {ev.fullName}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Icon name="phone" className="h-3 w-3" />{ev.phone}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge name={ev.status?.name} />
                  {ev.assignedAgent && <span className="text-xs text-slate-400">{ev.assignedAgent.fullName}</span>}
                </div>
              </div>
            ))}
            {selectedEvents.length === 0 && <p className="py-4 text-sm text-slate-400">Sin seguimientos programados este día.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [view, setView] = useState('list');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agenda</h1>
          <p className="mt-0.5 text-sm text-slate-500">Seguimientos de hoy, vencidos y programados</p>
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm shadow-sm">
          <button
            onClick={() => setView('list')}
            className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Lista
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`rounded-md px-3 py-1.5 font-medium transition ${view === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Calendario
          </button>
        </div>
      </div>

      {view === 'list' ? <ListView /> : <CalendarView />}
    </div>
  );
}
