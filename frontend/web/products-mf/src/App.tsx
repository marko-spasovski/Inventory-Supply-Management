import React, { useEffect, useState } from 'react';
import { useStrings } from './i18n';

interface Product  { id: string; name: string; sku: string; description: string; weight: number; categoryId: string; }
interface Category { id: string; name: string; description: string | null; }
type ProductForm  = Omit<Product, 'id'>;
type CategoryForm = Omit<Category, 'id'>;

const styles = {
  wrap:  { padding: '1.5rem' } as React.CSSProperties,
  h1:    { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' } as React.CSSProperties,
  h2:    { fontSize: '1.1rem', fontWeight: 600, color: '#334155' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)' },
  th:    { padding: '0.75rem 1rem', background: '#f1f5f9', textAlign: 'left' as const, fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' as const },
  td:    { padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#334155' },
  btn:   { padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 } as React.CSSProperties,
  input: { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
};

const EMPTY_P: ProductForm  = { name: '', sku: '', description: '', weight: 0, categoryId: '' };
const EMPTY_C: CategoryForm = { name: '', description: '' };

// Capitalize the first letter, leaving the rest untouched.
const capitalizeFirst = (v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1) : v;

export default function App() {
  const s = useStrings();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadP, setLoadP]           = useState(true);
  const [loadC, setLoadC]           = useState(true);
  const [pForm, setPForm]           = useState<ProductForm>(EMPTY_P);
  const [cForm, setCForm]           = useState<CategoryForm>(EMPTY_C);
  const [editP, setEditP]           = useState<Product | null>(null);
  const [editC, setEditC]           = useState<Category | null>(null);
  const [showP, setShowP]           = useState(false);
  const [showC, setShowC]           = useState(false);
  const [tab, setTab]               = useState<'products' | 'categories'>('products');
  const [skuQuery, setSkuQuery]     = useState('');
  const [skuResult, setSkuResult]   = useState<Product | null>(null);
  const [skuError, setSkuError]     = useState('');
  const [filterCat, setFilterCat]   = useState<string>('');

  async function loadProducts() {
    setLoadP(true);
    const r = await fetch('/api/products', { credentials: 'include' });
    setProducts(await r.json() as Product[]);
    setLoadP(false);
  }
  async function loadCategories() {
    setLoadC(true);
    const r = await fetch('/api/categories', { credentials: 'include' });
    setCategories(await r.json() as Category[]);
    setLoadC(false);
  }

  useEffect(() => { void loadProducts(); void loadCategories(); }, []);

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...pForm,
      name:        capitalizeFirst(pForm.name.trim()),
      sku:         capitalizeFirst(pForm.sku.trim()),
      description: capitalizeFirst(pForm.description.trim()),
    };
    const url = editP ? `/api/products/${editP.id}` : '/api/products';
    const r   = await fetch(url, { method: editP ? 'PUT' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) { alert(s.common.saveFailed); return; }
    setShowP(false); void loadProducts();
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    const url = editC ? `/api/categories/${editC.id}` : '/api/categories';
    const r = await fetch(url, { method: editC ? 'PUT' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cForm) });
    if (!r.ok) { alert(s.common.saveFailed); return; }
    setShowC(false); void loadCategories();
  }

  async function deleteProduct(id: string) {
    if (!confirm(s.products.deleteConfirm)) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
    void loadProducts();
  }

  async function deleteCategory(id: string) {
    if (!confirm(s.categories.deleteConfirm)) return;
    const r = await fetch(`/api/categories/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!r.ok && r.status !== 204) { alert(s.common.deleteFailed); return; }
    void loadCategories();
  }

  async function searchSku(e: React.FormEvent) {
    e.preventDefault();
    setSkuError(''); setSkuResult(null);
    if (!skuQuery.trim()) return;
    try {
      const r = await fetch(`/api/products/by-sku?sku=${encodeURIComponent(skuQuery.trim())}`, { credentials: 'include' });
      if (r.status === 404) { setSkuError(`${s.products.noMatchSku} "${skuQuery}".`); return; }
      if (!r.ok) { setSkuError(s.products.searchFailed); return; }
      setSkuResult(await r.json() as Product);
    } catch (e) { setSkuError(String(e)); }
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: active ? 600 : 400, fontSize: '0.9rem',
    background: active ? '#3b82f6' : '#e2e8f0', color: active ? '#fff' : '#475569',
  });

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id.slice(0, 8) + '…';

  const visibleProducts = filterCat ? products.filter(p => p.categoryId === filterCat) : products;

  return (
    <div style={styles.wrap}>
      <h1 style={styles.h1}>{s.products.productsAndCategories}</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button style={tabBtn(tab === 'products')}   onClick={() => setTab('products')}>{s.products.title}</button>
        <button style={tabBtn(tab === 'categories')} onClick={() => setTab('categories')}>{s.categories.title}</button>
      </div>

      {tab === 'products' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={styles.h2}>{s.products.title}</h2>
            <form onSubmit={searchSku} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                style={{ ...styles.input, width: 220 }}
                placeholder={s.products.skuPlaceholder}
                value={skuQuery}
                onChange={e => setSkuQuery(e.target.value)}
              />
              <button type="submit" style={{ ...styles.btn, background: '#6366f1', color: '#fff' }}>{s.products.find}</button>
              {(skuResult || skuError) && (
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => { setSkuQuery(''); setSkuResult(null); setSkuError(''); }}>{s.products.clear}</button>
              )}
            </form>
            <select style={{ ...styles.input, width: 200 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">{s.products.allCategories}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button style={{ ...styles.btn, background: '#3b82f6', color: '#fff', marginLeft: 'auto' }} onClick={() => { setEditP(null); setPForm(EMPTY_P); setShowP(true); }}>+ {s.products.newProduct}</button>
          </div>

          {skuError && <p style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{skuError}</p>}
          {skuResult && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              {s.products.match}: <strong>{skuResult.name}</strong> · {s.products.sku} <code>{skuResult.sku}</code> · {catName(skuResult.categoryId)} · {skuResult.weight} kg
            </div>
          )}

          {loadP ? <p style={{ color: '#64748b' }}>{s.common.loading}</p> : (
            <table style={styles.table}>
              <thead><tr>{[s.products.name, s.products.sku, s.products.category, s.products.weight, s.products.description, s.common.actions].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {visibleProducts.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}><code style={{ fontSize: '0.8rem' }}>{p.sku}</code></td>
                    <td style={styles.td}>{catName(p.categoryId)}</td>
                    <td style={styles.td}>{p.weight} kg</td>
                    <td style={styles.td} title={p.description}>{p.description.slice(0, 30)}{p.description.length > 30 ? '…' : ''}</td>
                    <td style={styles.td}>
                      <button style={{ ...styles.btn, background: '#e2e8f0', color: '#334155', marginRight: '0.5rem' }} onClick={() => { setEditP(p); setPForm({ name: p.name, sku: p.sku, description: p.description, weight: p.weight, categoryId: p.categoryId }); setShowP(true); }}>{s.common.edit}</button>
                      <button style={{ ...styles.btn, background: '#fef2f2', color: '#dc2626' }} onClick={() => deleteProduct(p.id)}>{s.common.delete}</button>
                    </td>
                  </tr>
                ))}
                {visibleProducts.length === 0 && <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>{s.products.noItems}</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'categories' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <h2 style={styles.h2}>{s.categories.title}</h2>
            <button style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }} onClick={() => { setEditC(null); setCForm(EMPTY_C); setShowC(true); }}>+ {s.categories.newCategory}</button>
          </div>
          {loadC ? <p style={{ color: '#64748b' }}>{s.common.loading}</p> : (
            <table style={styles.table}>
              <thead><tr>{[s.categories.name, s.categories.description, s.common.actions].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.description ?? '—'}</td>
                    <td style={styles.td}>
                      <button style={{ ...styles.btn, background: '#e2e8f0', color: '#334155', marginRight: '0.5rem' }} onClick={() => { setEditC(c); setCForm({ name: c.name, description: c.description ?? '' }); setShowC(true); }}>{s.common.edit}</button>
                      <button style={{ ...styles.btn, background: '#fef2f2', color: '#dc2626' }} onClick={() => deleteCategory(c.id)}>{s.common.delete}</button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && <tr><td colSpan={3} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>{s.categories.noItems}</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}

      {showP && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 460, boxShadow: '0 8px 40px rgba(0,0,0,.15)', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>{editP ? s.products.editProduct : s.products.newProduct}</h2>
            <form onSubmit={saveProduct}>
              {([['name', s.products.name], ['sku', s.products.sku], ['description', s.products.description]] as [keyof ProductForm, string][]).map(([k, lbl]) => (
                <div key={k} style={{ marginBottom: '0.875rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{lbl}</label>
                  <input style={styles.input} type="text" value={pForm[k] as string} onChange={e => setPForm(f => ({ ...f, [k]: e.target.value }))} required={k !== 'description'} />
                </div>
              ))}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.products.weight}</label>
                <input style={styles.input} type="number" step="0.01" min={0} value={pForm.weight} onChange={e => setPForm(f => ({ ...f, weight: +e.target.value }))} required />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.products.category}</label>
                <select style={styles.input} value={pForm.categoryId} onChange={e => setPForm(f => ({ ...f, categoryId: e.target.value }))} required>
                  <option value="">{s.products.selectCategory}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setShowP(false)}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }}>{s.common.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showC && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: 420, boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>{editC ? s.categories.editCategory : s.categories.newCategory}</h2>
            <form onSubmit={saveCategory}>
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.categories.name}</label>
                <input style={styles.input} type="text" value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>{s.categories.description}</label>
                <input style={styles.input} type="text" value={cForm.description ?? ''} onChange={e => setCForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...styles.btn, background: '#e2e8f0', color: '#334155' }} onClick={() => setShowC(false)}>{s.common.cancel}</button>
                <button type="submit" style={{ ...styles.btn, background: '#3b82f6', color: '#fff' }}>{s.common.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
