import React, { useEffect, useState } from 'react';
import { useStrings } from './i18n';

type OrderStatus = 'Requested' | 'Approved' | 'Delivered' | 'Closed' | 'Rejected';
interface Order {
  id: string; productId: string; companyId: string; warehouseId: string;
  driverId: string; quantity: number; status: number; deliveryDate?: string;
  createdAt?: string; lastModified?: string;
}
interface CreateForm { productId: string; companyId: string; warehouseId: string; driverId: string; quantity: number; deliveryDate: string; }
interface Option { id: string; label: string; }

const STATUS_MAP: Record<number, OrderStatus> = { 0: 'Requested', 1: 'Approved', 2: 'Delivered', 3: 'Closed', 4: 'Rejected' };
const STATUS_NEXT: Record<number, number>      = { 1: 2, 2: 3 };
const STATUS_COLOR: Record<number, string>     = { 0: '#f59e0b', 1: '#3b82f6', 2: '#10b981', 3: '#64748b', 4: '#dc2626' };

const API = '/api';
const styles = {
  wrap:   { padding: '1.5rem' } as React.CSSProperties,
  h1:     { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' } as React.CSSProperties,
  table:  { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)' },
  th:     { padding: '0.75rem 1rem', background: '#f1f5f9', textAlign: 'left' as const, fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' as const },
  td:     { padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155' },
  btn:    { padding: '0.35rem 0.8rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 } as React.CSSProperties,
  input:  { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
  select: { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' as const, background: '#fff', cursor: 'pointer' } as React.CSSProperties,
  label:  { display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem', fontWeight: 500 } as React.CSSProperties,
};

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

async function fetchOptions<T>(path: string, toOption: (item: T) => Option): Promise<Option[]> {
  try {
    const r = await fetch(`${API}${path}`, { credentials: 'include' });
    if (!r.ok) return [];
    return (await r.json() as T[]).map(toOption);
  } catch { return []; }
}

function nameById(options: Option[], id: string) {
  return options.find(o => o.id === id)?.label ?? id.slice(0, 8) + '…';
}

export default function App() {
  const s = useStrings();
  const { showToast, toast } = useToast();
  const [confirmApprove, setConfirmApprove] = useState<{ order: Order; available: number; capacity: number } | null>(null);
  const [whCap, setWhCap] = useState<Record<string, { total: number; used: number }>>({});
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [form, setForm] = useState<CreateForm>({ productId: '', companyId: '', warehouseId: '', driverId: '', quantity: 1, deliveryDate: '' });
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [products,   setProducts]   = useState<Option[]>([]);
  const [companies,  setCompanies]  = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [drivers,    setDrivers]    = useState<Option[]>([]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/orders`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load orders');
      setOrders(await r.json() as Order[]);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    void fetchOptions('/products',   (p: any) => ({ id: p.id, label: `${p.name} (${p.sku})` })).then(setProducts);
    void fetchOptions('/companies',  (c: any) => ({ id: c.id, label: c.name })).then(setCompanies);
    void fetch(`${API}/warehouses`, { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<any[]> : [])
      .then((ws: any[]) => {
        setWarehouses(ws.map(w => ({ id: w.id, label: `${w.name} — ${w.city}` })));
        const m: Record<string, { total: number; used: number }> = {};
        ws.forEach(w => { m[w.id] = { total: w.totalCapacity, used: w.usedCapacity }; });
        setWhCap(m);
      })
      .catch(() => {});
    void fetchOptions('/drivers',    (d: any) => ({ id: d.id, label: d.name })).then(setDrivers);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/orders`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error('Create failed');
      setShowCreate(false);
      setForm({ productId: '', companyId: '', warehouseId: '', driverId: '', quantity: 1, deliveryDate: '' });
      void load();
    } catch (e) { alert(String(e)); }
  }

  async function setStatus(orderId: string, status: number) {
    const r = await fetch(`${API}/orders/status`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, status }) });
    if (!r.ok) throw new Error('Status update failed');
  }

  // Approve flow: warn when the order won't fit the warehouse's free capacity,
  // but allow the manager to approve anyway (capacity may go over total).
  function requestApprove(order: Order) {
    const cap = whCap[order.warehouseId];
    const available = cap ? cap.total - cap.used : Number.POSITIVE_INFINITY;
    if (order.quantity > available) {
      setConfirmApprove({ order, available, capacity: cap ? cap.total : 0 });
    } else {
      void doApprove(order);
    }
  }

  async function doApprove(order: Order) {
    setConfirmApprove(null);
    try {
      await setStatus(order.id, 1);
      showToast(s.orders.approvedToast, 'success');
      void load();
    } catch (e) { showToast(String(e), 'error'); }
  }

  function requestReject(order: Order) {
    if (!confirm(s.orders.rejectConfirm)) return;
    void doReject(order);
  }

  async function doReject(order: Order) {
    setConfirmApprove(null);
    try {
      await setStatus(order.id, 4);
      showToast(s.orders.rejectedToast, 'success');
      void load();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function advanceStatus(order: Order) {
    const next = STATUS_NEXT[order.status];
    if (next === undefined) return;
    // Delivered → Closed requires a document upload first.
    if (order.status === 2 && next === 3) {
      setClosingOrder(order);
      setUploadFile(null);
      return;
    }
    try {
      await setStatus(order.id, next);
      void load();
    } catch (e) { alert(String(e)); }
  }

  async function handleUploadAndClose(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !closingOrder) return;

    // Backend (DocumentStorageService) only accepts non-empty PDFs.
    if (uploadFile.size === 0) {
      alert('The selected file is empty. Please choose a non-empty PDF.');
      return;
    }
    const isPdf = uploadFile.type === 'application/pdf'
      || uploadFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Only PDF documents are accepted.');
      return;
    }

    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('File', uploadFile, uploadFile.name);
      fd.append('OrderId', closingOrder.id);
      const r = await fetch(`${API}/orders/upload-document`, { method: 'POST', credentials: 'include', body: fd });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(text || `Upload failed (${r.status})`);
      }
      await setStatus(closingOrder.id, 3);
      setClosingOrder(null);
      setUploadFile(null);
      void load();
    } catch (e) { alert(String(e)); }
    finally { setUploadBusy(false); }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await fetch(`${API}/orders/${id}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch order');
      setDetail(await r.json() as Order);
    } catch (e) { alert(String(e)); }
    finally { setDetailLoading(false); }
  }

  const field = (key: keyof CreateForm, label: string, options: Option[]) => (
    <div key={key} style={{ marginBottom: '0.875rem' }}>
      <label style={styles.label}>{label}</label>
      <select
        style={styles.select}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required
      >
        <option value="">{s.common.selectPlaceholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={styles.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <h1 style={{ ...styles.h1, marginBottom: 0 }}>{s.orders.title}</h1>
        <button style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }} onClick={() => setShowCreate(true)}>+ {s.orders.newOrder}</button>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
      {loading && <p style={{ color: '#64748b' }}>{s.common.loading}</p>}

      {!loading && !error && (
        <table style={styles.table}>
          <thead>
            <tr>{[s.orders.product, s.orders.company, s.orders.warehouse, s.orders.driver, s.orders.quantity, s.orders.status, s.orders.deliveryDate, s.common.actions].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={styles.td}>{nameById(products,   o.productId)}</td>
                <td style={styles.td}>{nameById(companies,  o.companyId)}</td>
                <td style={styles.td}>{nameById(warehouses, o.warehouseId)}</td>
                <td style={styles.td}>{nameById(drivers,    o.driverId)}</td>
                <td style={styles.td}>{o.quantity}</td>
                <td style={styles.td}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: 999, background: STATUS_COLOR[o.status] + '22', color: STATUS_COLOR[o.status], fontWeight: 600, fontSize: '0.8rem' }}>
                    {s.orders.statuses[STATUS_MAP[o.status]]}
                  </span>
                </td>
                <td style={styles.td}>{o.deliveryDate ? o.deliveryDate.slice(0, 10) : '—'}</td>
                <td style={styles.td}>
                  <button style={{ ...styles.btn, background: '#f1f5f9', color: '#334155', marginRight: '0.4rem' }} onClick={() => void openDetail(o.id)}>{s.orders.view}</button>
                  {o.status === 0 && (
                    <>
                      <button style={{ ...styles.btn, background: '#dcfce7', color: '#15803d', marginRight: '0.4rem' }} onClick={() => requestApprove(o)}>
                        ✓ {s.orders.approve}
                      </button>
                      <button style={{ ...styles.btn, background: '#fef2f2', color: '#dc2626' }} onClick={() => requestReject(o)}>
                        ✕ {s.orders.doNotApprove}
                      </button>
                    </>
                  )}
                  {STATUS_NEXT[o.status] !== undefined && (
                    o.status === 2 ? (
                      <button style={{ ...styles.btn, background: '#ede9fe', color: '#6d28d9' }} onClick={() => advanceStatus(o)}>
                        📎 {s.orders.uploadAndClose}
                      </button>
                    ) : (
                      <button style={{ ...styles.btn, background: '#e0f2fe', color: '#0369a1' }} onClick={() => advanceStatus(o)}>
                        → {s.orders.statuses[STATUS_MAP[STATUS_NEXT[o.status]]]}
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>{s.orders.noOrders}</td></tr>}
          </tbody>
        </table>
      )}

      {/* Create Order Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 480, boxShadow: '0 8px 40px rgba(0,0,0,.15)', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>{s.orders.createOrder}</h2>
            <form onSubmit={handleCreate}>
              {field('productId',   s.orders.product,   products)}
              {field('companyId',   s.orders.company,   companies)}
              {field('warehouseId', s.orders.warehouse, warehouses)}
              {field('driverId',    s.orders.driver,    drivers)}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={styles.label}>{s.orders.quantity}</label>
                <input style={styles.input} type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} required />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={styles.label}>{s.orders.deliveryDate}</label>
                <input style={styles.input} type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setShowCreate(false)}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }}>{s.common.create}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload & Close Modal (Delivered → Closed requires a document) */}
      {closingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 440, boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>{s.orders.closeOrder}</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {s.orders.uploadHint}
            </p>
            <form onSubmit={handleUploadAndClose}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={styles.label}>{s.orders.document}</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                  style={{ fontSize: '0.9rem' }}
                />
                {uploadFile && (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                    {uploadFile.name} · {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => { setClosingOrder(null); setUploadFile(null); }} disabled={uploadBusy}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#6d28d9', color: '#fff' }} disabled={!uploadFile || uploadBusy}>
                  {uploadBusy ? s.orders.uploading : s.orders.uploadAndClose}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {(detail || detailLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 480, boxShadow: '0 8px 40px rgba(0,0,0,.15)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>{s.orders.orderDetail}</h2>
              <button onClick={() => setDetail(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#64748b' }}>×</button>
            </div>
            {detailLoading && <p style={{ color: '#64748b' }}>{s.common.loading}</p>}
            {detail && (
              <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '0.5rem', columnGap: '0.75rem', fontSize: '0.875rem' }}>
                <dt style={{ color: '#64748b' }}>ID</dt><dd style={{ margin: 0 }}><code>{detail.id}</code></dd>
                <dt style={{ color: '#64748b' }}>{s.orders.product}</dt><dd style={{ margin: 0 }}>{nameById(products, detail.productId)}</dd>
                <dt style={{ color: '#64748b' }}>{s.orders.company}</dt><dd style={{ margin: 0 }}>{nameById(companies, detail.companyId)}</dd>
                <dt style={{ color: '#64748b' }}>{s.orders.warehouse}</dt><dd style={{ margin: 0 }}>{nameById(warehouses, detail.warehouseId)}</dd>
                <dt style={{ color: '#64748b' }}>{s.orders.driver}</dt><dd style={{ margin: 0 }}>{nameById(drivers, detail.driverId)}</dd>
                <dt style={{ color: '#64748b' }}>{s.orders.quantity}</dt><dd style={{ margin: 0 }}>{detail.quantity}</dd>
                <dt style={{ color: '#64748b' }}>{s.orders.status}</dt>
                <dd style={{ margin: 0 }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: 999, background: STATUS_COLOR[detail.status] + '22', color: STATUS_COLOR[detail.status], fontWeight: 600 }}>
                    {s.orders.statuses[STATUS_MAP[detail.status]]}
                  </span>
                </dd>
                <dt style={{ color: '#64748b' }}>{s.orders.deliveryDate}</dt><dd style={{ margin: 0 }}>{detail.deliveryDate ? detail.deliveryDate.slice(0, 10) : '—'}</dd>
                {detail.createdAt && <><dt style={{ color: '#64748b' }}>{s.orders.created}</dt><dd style={{ margin: 0 }}>{new Date(detail.createdAt).toLocaleString()}</dd></>}
                {detail.lastModified && <><dt style={{ color: '#64748b' }}>{s.orders.modified}</dt><dd style={{ margin: 0 }}>{new Date(detail.lastModified).toLocaleString()}</dd></>}
              </dl>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setDetail(null)}>{s.common.close}</button>
            </div>
          </div>
        </div>
      )}

      {/* Over-capacity approval confirmation */}
      {confirmApprove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 460, boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.6rem', color: '#b45309' }}>⚠ {s.orders.capacityWarnTitle}</h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {s.orders.capacityWarnBody
                .replace('{qty}', String(confirmApprove.order.quantity))
                .replace('{available}', String(Math.max(0, confirmApprove.available)))
                .replace('{capacity}', String(confirmApprove.capacity))}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setConfirmApprove(null)}>{s.common.cancel}</button>
              <button style={{ ...styles.btn, background: '#fef2f2', color: '#dc2626' }} onClick={() => void doReject(confirmApprove.order)}>✕ {s.orders.doNotApprove}</button>
              <button style={{ ...styles.btn, background: '#15803d', color: '#fff' }} onClick={() => void doApprove(confirmApprove.order)}>✓ {s.orders.approveAnyway}</button>
            </div>
          </div>
        </div>
      )}

      {toast}
    </div>
  );
}
