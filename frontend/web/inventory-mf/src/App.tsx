import React, { useEffect, useMemo, useState } from 'react';
import { useStrings } from './i18n';

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minQuantity?: number | null;
  maxQuantity?: number | null;
}
interface Option { id: string; label: string; }

const API = '/api/inventory';
const styles = {
  wrap:   { padding: '1.5rem' } as React.CSSProperties,
  h1:     { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' } as React.CSSProperties,
  table:  { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)' },
  th:     { padding: '0.75rem 1rem', background: '#f1f5f9', textAlign: 'left' as const, fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' as const },
  td:     { padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#334155' },
  btn:    { padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 } as React.CSSProperties,
  input:  { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
  label:  { display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem', fontWeight: 500 } as React.CSSProperties,
};

async function fetchOptions<T>(path: string, toOption: (item: T) => Option): Promise<Option[]> {
  try {
    const r = await fetch(`/api${path}`, { credentials: 'include' });
    if (!r.ok) return [];
    return (await r.json() as T[]).map(toOption);
  } catch { return []; }
}

function nameById(options: Option[], id: string) {
  return options.find(o => o.id === id)?.label ?? id.slice(0, 8) + '…';
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [variant, setVariant] = useState<'success' | 'error'>('success');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const showToast = (m: string, v: 'success' | 'error' = 'success') => { setVariant(v); setMsg(m); };
  const toast = msg ? (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: variant === 'success' ? '#16a34a' : '#dc2626', color: '#fff',
      padding: '0.75rem 1.4rem', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,.22)',
      fontSize: '0.9rem', fontWeight: 600, zIndex: 200, animation: 'erpToastIn .28s ease',
    }}>
      <style>{'@keyframes erpToastIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}'}</style>
      {msg}
    </div>
  ) : null;
  return { showToast, toast };
}

export default function App() {
  const s = useStrings();
  const { showToast, toast } = useToast();
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filterWh, setFilterWh]     = useState<string>('');

  const [products,   setProducts]   = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);

  // Edit thresholds
  const [editItem, setEditItem]     = useState<InventoryItem | null>(null);
  const [editMin, setEditMin]       = useState<string>('');
  const [editMax, setEditMax]       = useState<string>('');

  // Consume
  const [selected, setSelected]     = useState<Record<string, number>>({}); // inventoryId -> qty
  const [showConsume, setShowConsume] = useState(false);
  const [purpose, setPurpose]       = useState('');
  const [dateOfUsage, setDateOfUsage] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile]   = useState<File | null>(null);
  const [busy, setBusy]             = useState(false);

  async function loadAll() {
    setLoading(true); setError('');
    try {
      const r = await fetch(API, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load inventory');
      setItems(await r.json() as InventoryItem[]);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function loadByWarehouse(warehouseId: string) {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/${warehouseId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load warehouse inventory');
      setItems(await r.json() as InventoryItem[]);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void loadAll();
    void fetchOptions('/products',   (p: any) => ({ id: p.id, label: `${p.name} (${p.sku})` })).then(setProducts);
    void fetchOptions('/warehouses', (w: any) => ({ id: w.id, label: `${w.name} — ${w.city}` })).then(setWarehouses);
  }, []);

  useEffect(() => {
    if (filterWh) void loadByWarehouse(filterWh);
    else void loadAll();
  }, [filterWh]);

  function reload() {
    if (filterWh) void loadByWarehouse(filterWh); else void loadAll();
  }

  // ── Edit thresholds ──────────────────────────────────────────────────────
  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setEditMin(item.minQuantity == null ? '' : String(item.minQuantity));
    setEditMax(item.maxQuantity == null ? '' : String(item.maxQuantity));
  }

  async function saveThresholds(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    try {
      const body = {
        productId: editItem.productId,
        warehouseId: editItem.warehouseId,
        minQuantity: editMin === '' ? null : Number(editMin),
        maxQuantity: editMax === '' ? null : Number(editMax),
      };
      const r = await fetch(`${API}/thresholds`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(t || `Update failed (${r.status})`);
      }
      setEditItem(null);
      reload();
    } catch (e) { alert(String(e)); }
  }

  // ── Consume ──────────────────────────────────────────────────────────────
  function toggleSelect(item: InventoryItem) {
    setSelected(prev => {
      const next = { ...prev };
      if (next[item.id] !== undefined) delete next[item.id];
      else next[item.id] = 1;
      return next;
    });
  }

  const selectedItems = items.filter(i => selected[i.id] !== undefined);

  async function buildConsumptionPdf(): Promise<File> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16); doc.text('Stock Consumption Record', 14, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Purpose:     ${purpose || '-'}`, 14, y); y += 6;
    doc.text(`Date of use: ${dateOfUsage || '-'}`, 14, y); y += 6;
    doc.text(`Generated:   ${new Date().toLocaleString()}`, 14, y); y += 8;
    if (description) {
      doc.text('Description:', 14, y); y += 5;
      doc.splitTextToSize(description, 180).forEach((line: string) => { doc.text(line, 14, y); y += 5; });
      y += 3;
    }
    doc.setFontSize(11); doc.text('Consumed items', 14, y); y += 6;
    doc.setFontSize(10);
    doc.text('Product', 14, y);
    doc.text('Warehouse', 90, y);
    doc.text('Qty', 175, y);
    y += 4;
    doc.line(14, y, 196, y); y += 5;
    selectedItems.forEach(it => {
      doc.text(String(nameById(products, it.productId)).slice(0, 45), 14, y);
      doc.text(String(nameById(warehouses, it.warehouseId)).slice(0, 40), 90, y);
      doc.text(String(selected[it.id]), 178, y, { align: 'right' });
      y += 6;
      if (y > 280) { doc.addPage(); y = 18; }
    });
    const blob = doc.output('blob') as Blob;
    return new File([blob], 'consumption.pdf', { type: 'application/pdf' });
  }

  async function handleConsume(e: React.FormEvent) {
    e.preventDefault();
    if (selectedItems.length === 0) { showToast(s.stock.consumeSelect, 'error'); return; }
    for (const it of selectedItems) {
      const q = selected[it.id];
      if (!q || q <= 0) { showToast(s.stock.consumeQtyGt0, 'error'); return; }
      if (q > it.quantity) { showToast(s.stock.consumeQtyMax, 'error'); return; }
    }
    if (proofFile) {
      const isPdf = proofFile.type === 'application/pdf' || proofFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) { showToast(s.stock.proofMustPdf, 'error'); return; }
    }

    setBusy(true);
    try {
      const document = await buildConsumptionPdf();
      const itemsPayload = selectedItems.map(it => ({
        productId: it.productId, warehouseId: it.warehouseId, quantity: selected[it.id],
      }));
      const fd = new FormData();
      fd.append('items', JSON.stringify(itemsPayload));
      fd.append('purpose', purpose);
      fd.append('dateOfUsage', dateOfUsage);
      fd.append('description', description);
      fd.append('document', document, document.name);
      if (proofFile) fd.append('proof', proofFile, proofFile.name);

      const r = await fetch(`${API}/consume`, { method: 'POST', credentials: 'include', body: fd });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(t || `Consume failed (${r.status})`);
      }
      // reset
      setShowConsume(false);
      setSelected({});
      setPurpose(''); setDescription(''); setProofFile(null);
      setDateOfUsage(new Date().toISOString().slice(0, 10));
      reload();
      showToast(s.stock.consumeSaved, 'success');
    } catch (e) { showToast(String(e), 'error'); }
    finally { setBusy(false); }
  }

  const lowStockCount = useMemo(
    () => items.filter(i => typeof i.minQuantity === 'number' && i.quantity < (i.minQuantity ?? 0)).length,
    [items],
  );
  const selectedCount = selectedItems.length;

  return (
    <div style={styles.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <h1 style={{ ...styles.h1, marginBottom: 0 }}>{s.stock.title}</h1>
        {lowStockCount > 0 && (
          <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 999, padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 600 }}>
            {s.stock.low}: {lowStockCount}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#475569' }}>{s.stock.warehouse}:</label>
          <select style={{ ...styles.input, width: 'auto', minWidth: 220 }} value={filterWh} onChange={e => setFilterWh(e.target.value)}>
            <option value="">{s.stock.allWarehouses}</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <button
            style={{ ...styles.btn, background: selectedCount ? '#6d28d9' : '#c4b5fd', color: '#fff', cursor: selectedCount ? 'pointer' : 'not-allowed' }}
            disabled={selectedCount === 0}
            onClick={() => setShowConsume(true)}
          >
            {s.stock.consumeStock}{selectedCount ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>{s.common.loading}</p>}

      {!loading && !error && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 36 }}></th>
              {[s.stock.product, s.stock.warehouse, s.stock.quantity, s.stock.minQuantity, s.stock.maxQuantity, s.common.actions].map(h => <th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const min = item.minQuantity ?? null;
              const max = item.maxQuantity ?? null;
              const low = min !== null && item.quantity < min;
              const high = max !== null && item.quantity > max;
              const checked = selected[item.id] !== undefined;
              return (
                <tr key={item.id} style={checked ? { background: '#f5f3ff' } : undefined}>
                  <td style={styles.td}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSelect(item)} disabled={item.quantity <= 0} />
                  </td>
                  <td style={styles.td}>{nameById(products,   item.productId)}</td>
                  <td style={styles.td}>{nameById(warehouses, item.warehouseId)}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600, color: low ? '#dc2626' : high ? '#f59e0b' : '#16a34a' }}>{item.quantity}</span>
                  </td>
                  <td style={styles.td}>{min ?? '—'}</td>
                  <td style={styles.td}>{max ?? '—'}</td>
                  <td style={styles.td}>
                    <button style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => openEdit(item)}>{s.common.edit}</button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>{s.stock.noItems}</td></tr>}
          </tbody>
        </table>
      )}

      {/* Edit thresholds modal */}
      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 420, boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#1e293b' }}>{s.stock.editThresholds}</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {nameById(products, editItem.productId)} · {nameById(warehouses, editItem.warehouseId)} · {s.stock.quantity}: {editItem.quantity}
            </p>
            <form onSubmit={saveThresholds}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1, marginBottom: '0.5rem' }}>
                  <label style={styles.label}>{s.stock.minThreshold}</label>
                  <input style={styles.input} type="number" min={0} placeholder="e.g. 10" value={editMin} onChange={e => setEditMin(e.target.value)} />
                </div>
                <div style={{ flex: 1, marginBottom: '0.5rem' }}>
                  <label style={styles.label}>{s.stock.maxThreshold}</label>
                  <input style={styles.input} type="number" min={0} placeholder="e.g. 500" value={editMax} onChange={e => setEditMax(e.target.value)} />
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 1.25rem' }}>
                {s.stock.thresholdHint}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setEditItem(null)}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }}>{s.common.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consume modal */}
      {showConsume && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 560, boxShadow: '0 8px 40px rgba(0,0,0,.15)', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#1e293b' }}>{s.stock.consumeTitle}</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {s.stock.consumeIntro}
            </p>
            <form onSubmit={handleConsume}>
              <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{[s.stock.product, s.stock.warehouse, s.stock.available_, s.stock.consume].map(h => <th key={h} style={{ ...styles.th, fontSize: '0.7rem' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {selectedItems.map(it => (
                      <tr key={it.id}>
                        <td style={{ ...styles.td, fontSize: '0.8rem' }}>{nameById(products, it.productId)}</td>
                        <td style={{ ...styles.td, fontSize: '0.8rem' }}>{nameById(warehouses, it.warehouseId)}</td>
                        <td style={{ ...styles.td, fontSize: '0.8rem' }}>{it.quantity}</td>
                        <td style={{ ...styles.td, width: 110 }}>
                          <input
                            style={{ ...styles.input, padding: '0.3rem 0.5rem' }}
                            type="number" min={1} max={it.quantity}
                            value={selected[it.id]}
                            onChange={e => setSelected(prev => ({ ...prev, [it.id]: Number(e.target.value) }))}
                            required
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1, marginBottom: '0.875rem' }}>
                  <label style={styles.label}>{s.stock.purpose}</label>
                  <input style={styles.input} type="text" value={purpose} onChange={e => setPurpose(e.target.value)} required />
                </div>
                <div style={{ width: 170, marginBottom: '0.875rem' }}>
                  <label style={styles.label}>{s.stock.dateOfUsage}</label>
                  <input style={styles.input} type="date" value={dateOfUsage} onChange={e => setDateOfUsage(e.target.value)} required />
                </div>
              </div>
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={styles.label}>{s.stock.description}</label>
                <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={styles.label}>{s.stock.proofDocument}</label>
                <input type="file" accept="application/pdf,.pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} style={{ fontSize: '0.9rem' }} />
                {proofFile && <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>{proofFile.name} · {(proofFile.size / 1024).toFixed(1)} KB</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setShowConsume(false)} disabled={busy}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#6d28d9', color: '#fff' }} disabled={busy}>
                  {busy ? s.stock.processing : s.stock.useStock}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast}
    </div>
  );
}
