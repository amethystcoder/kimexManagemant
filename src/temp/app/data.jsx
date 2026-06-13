import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

/* ---------------- Tier mapping ---------------- */
export const TIER_LABEL = { admin: 'Admin', user: 'Manager', general: 'Staff' };
export const TIER_API   = { Admin: 'admin', Manager: 'user', Staff: 'general' };

/* ---------------- Type metadata ---------------- */
export const TYPE_META = {
  Dry:       { abbr: 'DRY', icon: 'box2',     tone: 'ink' },
  Frozen:    { abbr: 'FRZ', icon: 'snow',     tone: 'info' },
  Beverages: { abbr: 'BEV', icon: 'euro',     tone: 'accent' },
  Household: { abbr: 'HSE', icon: 'layers',   tone: 'ink' },
  Baby:      { abbr: 'BBY', icon: 'package',  tone: 'warn' },
  Produce:   { abbr: 'PRD', icon: 'spark',    tone: 'ok' },
};

/* ---------------- Utilities ---------------- */
export const euro = n =>
  '€' + Number(n).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const initials = name =>
  String(name || '').split(/[\s.]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

/* ---------------- Expiry tiers ---------------- */
export const EXPIRY_TIERS = [
  { key: 'critical', label: 'Critical', days: 14,  tone: 'accent',  discount: 50 },
  { key: 'urgent',   label: 'Urgent',   days: 30,  tone: 'warn',    discount: 30 },
  { key: 'warning',  label: 'Warning',  days: 90,  tone: 'info',    discount: 20 },
  { key: 'watch',    label: 'Watch',    days: 150, tone: 'ok',      discount: 10 },
  { key: 'notice',   label: 'Notice',   days: 210, tone: 'neutral', discount: 5  },
];

export function expiryTierOf(item) {
  if (!item.expiry || item.qty === 0) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((new Date(item.expiry) - today) / 86400000);
  if (daysLeft < 0) return { ...EXPIRY_TIERS[0], daysLeft, expired: true };
  for (const tier of EXPIRY_TIERS) {
    if (daysLeft <= tier.days) return { ...tier, daysLeft, expired: false };
  }
  return null;
}

export function statusOf(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(item.expiry);
  const days = Math.round((exp - today) / 86400000);
  if (item.qty === 0) return { key: 'out',      label: 'Out of stock',   tone: 'danger' };
  if (days <= 7)      return { key: 'expiring', label: 'Expiring soon',  tone: 'warn'   };
  if (item.qty <= item.reorder) return { key: 'low', label: 'Low stock', tone: 'warn'   };
  return { key: 'ok', label: 'In stock', tone: 'ok' };
}

export function relTime(ts) {
  const now  = new Date();
  const d    = new Date(ts);
  const mins = Math.round((now - d) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24)  return hrs + 'h ago';
  const days = Math.round(hrs / 24);
  if (days < 7)  return days + 'd ago';
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return (
    d.toLocaleDateString('en-IE', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

/* ---------------- Log display helpers ---------------- */
export function normModule(m) {
  const map = { auth: 'Auth', inventory: 'Inventory', users: 'Users', tags: 'Tags', statements: 'Statements' };
  return map[(m || '').toLowerCase()] || (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Other');
}

export function normAction(a) {
  const map = {
    LOGIN_SUCCESS: 'Signed in',        LOGIN_FAILED: 'Sign-in failed',
    LOGOUT: 'Signed out',              CREATE_USER: 'Created user',
    UPDATE_USER: 'Updated user',       DEACTIVATE_USER: 'Deactivated user',
    ACTIVATE_USER: 'Activated user',   CHANGE_PASSWORD: 'Changed password',
    CREATE_INVENTORY_ITEM: 'Added item',   UPDATE_INVENTORY_ITEM: 'Updated item',
    DELETE_INVENTORY_ITEM: 'Deleted item', BULK_RESTOCK: 'Restocked items',
  };
  return map[a] || String(a || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

export function normDetails(d) {
  if (!d) return '—';
  if (typeof d === 'string') return d;
  return Object.entries(d)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(', ');
}

/* ---------------- API helper (private) ---------------- */
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 401) {
    window.location.href = '/login/login.html';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/* ---------------- Store (context) ---------------- */
const StoreCtx = createContext(null);

export function StoreProvider({ children, user }) {
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);

  const isAdmin = user?.tier === 'admin';

  /* ── loaders ── */
  const reloadInventory = useCallback(async () => {
    try { setInventory(await apiFetch('/api/inventory')); } catch (e) { console.error('inventory:', e); }
  }, []);

  const reloadUsers = useCallback(async () => {
    try { setUsers(await apiFetch('/api/users')); } catch { /* 403 for non-admin */ }
  }, []);

  const reloadLogs = useCallback(async () => {
    try { setLogs(await apiFetch('/api/logs')); } catch { /* 403 for non-admin */ }
  }, []);

  useEffect(() => {
    reloadInventory();
    if (isAdmin) { reloadUsers(); reloadLogs(); }
  }, [isAdmin, reloadInventory, reloadUsers, reloadLogs]);

  /* ── toast ── */
  const toast = useCallback((msg, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  /* ── log (fires background reload) ── */
  const log = useCallback(() => {
    if (isAdmin) setTimeout(() => reloadLogs().catch(() => {}), 800);
  }, [isAdmin, reloadLogs]);

  /* ── inventory ── */
  const addStock = useCallback(async (lines) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    await apiFetch('/api/inventory/restock', {
      method: 'POST',
      body: JSON.stringify({
        lines: arr.map(l => ({
          name: l.name, type: l.type, sku: l.sku || undefined,
          qty: Number(l.qty), unit: l.unit || undefined,
          price: l.price != null ? Number(l.price) : undefined,
          expiry: l.expiry || undefined, supplier: l.supplier || undefined,
        })),
      }),
    });
    await reloadInventory();
  }, [reloadInventory]);

  /* ── remove stock (set qty to 0) ── */
  const removeStock = useCallback(async (id) => {
    await apiFetch(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ qty: 0 }),
    });
    await reloadInventory();
  }, [reloadInventory]);

  /* ── users ── */
  const updateUser = useCallback(async (id, patch) => {
    const apiPatch = { ...patch };
    if (apiPatch.tier && TIER_API[apiPatch.tier]) apiPatch.tier = TIER_API[apiPatch.tier];
    const updated = await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiPatch),
    });
    setUsers(us => us.map(u => u.id === id ? { ...u, ...updated } : u));
    return updated;
  }, []);

  const addUser = useCallback(async (data) => {
    const tier = TIER_API[data.tier] || data.tier || 'general';
    const created = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        full_name: data.full_name || data.name,
        username: data.username,
        password: data.password,
        tier,
        is_active: data.is_active !== false,
      }),
    });
    setUsers(us => [...us, created]);
    return created;
  }, []);

  const toggleUser = useCallback(async (id) => {
    const updated = await apiFetch(`/api/users/${id}/toggle`, { method: 'PATCH' });
    setUsers(us => us.map(u => u.id === id ? { ...u, ...updated } : u));
    return updated;
  }, []);

  const val = {
    inventory, users, logs, toasts, isAdmin,
    toast, log, addStock, removeStock, updateUser, addUser, toggleUser,
    reloadInventory, reloadUsers, reloadLogs,
  };

  return <StoreCtx.Provider value={val}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
