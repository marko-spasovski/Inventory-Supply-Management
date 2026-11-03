import React, { useEffect, useState } from 'react';
import { useStrings } from './i18n';

interface Warehouse {
  id: string; name: string; country: string; city: string;
  totalCapacity: number; usedCapacity: number;
}
interface Form { name: string; country: string; city: string; totalCapacity: number; }

const API = '/api/warehouses';
const COUNTRIES = ['MACEDONIA', 'SLOVENIA'];
const CITIES    = ['SKOPJE', 'KUMANOVO', 'LJUBLJANA', 'MARIBOR'];

const styles = {
  wrap:  { padding: '1.5rem' } as React.CSSProperties,
  h1:    { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)' },
  th:    { padding: '0.75rem 1rem', background: '#f1f5f9', textAlign: 'left' as const, fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' as const },
  td:    { padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#334155' },
  btn:   { padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 } as React.CSSProperties,
  input: { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', width: '100%' } as React.CSSProperties,
};

export default function App() {
  const s = useStrings();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal]           = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Warehouse | null>(null);
  const [form, setForm]             = useState<Form>({ name: '', country: 'SLOVENIA', city: 'LJUBLJANA', totalCapacity: 1000 });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(API, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load');
      setWarehouses(await r.json() as Warehouse[]);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function loadTotal() {
    try {
      const r = await fetch(`${API}/total`, { credentials: 'include' });
      if (!r.ok) return;
      const data = await r.json() as { totalNumberOfWarehouses?: number };
      setTotal(data.totalNumberOfWarehouses ?? null);
    } catch { /* non-critical */ }
  }

  useEffect(() => { void load(); void loadTotal(); }, []);

  function openCreate() { setEditing(null); setForm({ name: '', country: 'SLOVENIA', city: 'LJUBLJANA', totalCapacity: 1000 }); setShowForm(true); }
  function openEdit(w: Warehouse) { setEditing(w); setForm({ name: w.name, country: w.country, city: w.city, totalCapacity: w.totalCapacity }); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const opts = { method: editing ? 'PUT' : 'POST', credentials: 'include' as const, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) };
      const url  = editing ? `${API}/${editing.id}` : API;
      const r    = await fetch(url, opts);
      if (!r.ok) throw new Error('Save failed');
      setShowForm(false);
      void load(); void loadTotal();
    } catch (e) { alert(String(e)); }
  }

  async function handleDelete(id: string) {
    if (!confirm(s.warehouses.deleteConfirm)) return;
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' });
    void load(); void loadTotal();
  }

  return (
    <div style={styles.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <h1 style={{ ...styles.h1, marginBottom: 0 }}>{s.warehouses.title}</h1>
          {total !== null && (
            <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 999, padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 600 }}>
              {s.warehouses.total}: {total}
            </span>
          )}
        </div>
        <button style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }} onClick={openCreate}>+ {s.warehouses.newWarehouse}</button>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>{s.common.loading}</p>}

      {!loading && !error && (
        <table style={styles.table}>
          <thead>
            <tr>
              {[s.warehouses.name, s.warehouses.country, s.warehouses.city, s.warehouses.capacity, s.warehouses.used, s.common.actions].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {warehouses.map(w => (
              <tr key={w.id}>
                <td style={styles.td}>{w.name}</td>
                <td style={styles.td}>{w.country}</td>
                <td style={styles.td}>{w.city}</td>
                <td style={styles.td}>{w.totalCapacity}</td>
                <td style={styles.td}>{w.usedCapacity}</td>
                <td style={styles.td}>
                  <button style={{ ...styles.btn, background: '#e2e8f0', color: '#334155', marginRight: '0.5rem' }} onClick={() => openEdit(w)}>{s.common.edit}</button>
                  <button style={{ ...styles.btn, background: '#fef2f2', color: '#dc2626' }} onClick={() => handleDelete(w.id)}>{s.common.delete}</button>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>{s.warehouses.noItems}</td></tr>
            )}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 440, boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>{editing ? s.warehouses.editWarehouse : s.warehouses.newWarehouse}</h2>
            <form onSubmit={handleSave}>
              {([['name', s.warehouses.name, 'text']] as [keyof Form, string, string][]).map(([key, lbl, type]) => (
                <div key={key} style={{ marginBottom: '0.875rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{lbl}</label>
                  <input style={styles.input} type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))} required />
                </div>
              ))}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.warehouses.country}</label>
                <select style={styles.input} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.warehouses.city}</label>
                <select style={styles.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.warehouses.capacity}</label>
                <input style={styles.input} type="number" min={1} value={form.totalCapacity} onChange={e => setForm(f => ({ ...f, totalCapacity: +e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setShowForm(false)}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }}>{s.common.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
