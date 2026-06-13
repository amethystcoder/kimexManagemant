import React, { useState } from 'react';
import { Icon, Button, IconButton, Badge, Select, SearchInput, Segmented, Card, StatCard, Modal, EmptyState } from './ui.jsx';
import { useStore, euro, fmtDate, relTime, statusOf, expiryTierOf, EXPIRY_TIERS, TYPE_META } from './data.jsx';
import { useHeader } from './shell.jsx';

const TYPE_FILTERS = ['All', 'Dry', 'Frozen', 'Beverages', 'Household', 'Baby', 'Produce'];

function useMetrics(inventory) {
  const totalUnits = inventory.reduce((s, i) => s + i.qty, 0);
  const value      = inventory.reduce((s, i) => s + i.qty * i.price, 0);
  const statuses   = inventory.map(statusOf);
  const low        = statuses.filter(s => s.key === 'low').length;
  const out        = statuses.filter(s => s.key === 'out').length;
  const expiring   = statuses.filter(s => s.key === 'expiring').length;
  return { skus: inventory.length, totalUnits, value, low, out, expiring, attention: low + out };
}

function StatusBadge({ item }) {
  const s = statusOf(item);
  const tone = s.tone === 'danger' ? 'accent' : s.tone;
  return <Badge tone={tone}>{s.label}</Badge>;
}

function StockCell({ item }) {
  const pct   = Math.min(100, Math.round((item.qty / Math.max(item.reorder * 1.6, 1)) * 100));
  const s     = statusOf(item);
  const color = s.key === 'out' ? 'var(--danger)' : (s.key === 'low' || s.key === 'expiring') ? 'var(--warn)' : 'var(--ok)';
  return (
    <div style={{ minWidth: 120 }}>
      <div className="row" style={{ gap: 8, marginBottom: 5 }}>
        <span className="num cell-strong" style={{ fontSize: 14.5 }}>{item.qty}</span>
        <span className="cell-sub">{item.unit}</span>
      </div>
      <div className="bar"><i style={{ width: pct + '%', background: color }} /></div>
    </div>
  );
}

function ProductCell({ item }) {
  const m = TYPE_META[item.type] || { abbr: '?', tone: 'ink' };
  return (
    <div className="prod">
      <span className={`prod__thumb chip-${m.tone}`}>{m.abbr}</span>
      <span className="cell-main">
        <span className="cell-strong">{item.name}</span>
        <span className="cell-sub mono">{item.sku}</span>
      </span>
    </div>
  );
}

function InventoryTable({ items, onRow, columns }) {
  const cols = columns || ['product', 'type', 'stock', 'price', 'supplier', 'expiry', 'status'];
  const has  = c => cols.includes(c);
  return (
    <div className="tablewrap">
      <table className="tbl">
        <thead>
          <tr>
            {has('product')  && <th>Product</th>}
            {has('type')     && <th>Type</th>}
            {has('stock')    && <th>On hand</th>}
            {has('price')    && <th className="right">Unit price</th>}
            {has('supplier') && <th>Supplier</th>}
            {has('expiry')   && <th>Expiry</th>}
            {has('status')   && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} onClick={() => onRow && onRow(item)} style={{ cursor: onRow ? 'pointer' : 'default' }}>
              {has('product')  && <td><ProductCell item={item} /></td>}
              {has('type')     && <td><span className="tag-pill">{item.type}</span></td>}
              {has('stock')    && <td><StockCell item={item} /></td>}
              {has('price')    && <td className="right num">{euro(item.price)}</td>}
              {has('supplier') && <td className="cell-sub">{item.supplier}</td>}
              {has('expiry')   && <td className="num cell-sub">{fmtDate(item.expiry)}</td>}
              {has('status')   && <td><StatusBadge item={item} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <EmptyState icon="search" title="No products found">Try a different search or filter.</EmptyState>
      )}
    </div>
  );
}

function InventoryToolbar({ q, setQ, type, setType, sort, setSort }) {
  return (
    <div className="between wrap" style={{ gap: 12 }}>
      <SearchInput value={q} onChange={setQ} placeholder="Search products or SKU…" className="search--top" />
      <div className="row gap8 wrap">
        <div className="segmented" style={{ flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(t => (
            <button key={t} className={type === t ? 'is-active' : ''} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
        <Select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 168 }}>
          <option value="name">Sort: Name</option>
          <option value="qty">Sort: Stock (low→high)</option>
          <option value="value">Sort: Value (high→low)</option>
          <option value="expiry">Sort: Expiry (soonest)</option>
        </Select>
      </div>
    </div>
  );
}

function useInventoryView(inventory) {
  const [q, setQ]       = useState('');
  const [type, setType] = useState('All');
  const [sort, setSort] = useState('name');
  let items = inventory.filter(i =>
    (type === 'All' || i.type === type) &&
    (q === '' || (i.name + ' ' + i.sku + ' ' + i.supplier).toLowerCase().includes(q.toLowerCase()))
  );
  items = [...items].sort((a, b) => {
    if (sort === 'qty')   return a.qty - b.qty;
    if (sort === 'value') return b.qty * b.price - a.qty * a.price;
    if (sort === 'expiry') return new Date(a.expiry) - new Date(b.expiry);
    return a.name.localeCompare(b.name);
  });
  return { items, q, setQ, type, setType, sort, setSort };
}

/* ── Side cards ── */
function AttentionCard({ inventory, onRow, onGoRestock }) {
  const items = inventory
    .filter(i => { const s = statusOf(i); return s.key !== 'ok'; })
    .sort((a, b) => (a.qty === 0 ? -1 : 0))
    .slice(0, 6);
  return (
    <Card
      title="Needs attention"
      sub={`${items.length} item${items.length !== 1 ? 's' : ''}`}
      actions={<Button size="sm" variant="subtle" iconRight="chevright" onClick={onGoRestock}>Restock</Button>}
      flush
    >
      {items.length === 0
        ? <EmptyState icon="checkcircle" title="All good">Everything is well stocked.</EmptyState>
        : items.map(i => {
            const s = statusOf(i);
            return (
              <div className="alert-row" key={i.id} onClick={() => onRow(i)} style={{ cursor: 'pointer' }}>
                <span className={`alert-row__ic chip-${s.tone}`}>
                  <Icon name={s.key === 'out' ? 'alert' : s.key === 'expiring' ? 'clock' : 'trenddown'} />
                </span>
                <div className="alert-row__main">
                  <b>{i.name}</b>
                  <span>{s.key === 'expiring' ? `Expires ${fmtDate(i.expiry)}` : `${i.qty} on hand · reorder at ${i.reorder}`}</span>
                </div>
                <Badge tone={s.tone === 'danger' ? 'accent' : s.tone}>{s.label}</Badge>
              </div>
            );
          })
      }
    </Card>
  );
}

function ActivityCard({ logs, limit = 6 }) {
  const toneFor = m => ({ Inventory: 'ok', Tags: 'accent', Statements: 'info', Users: 'warn', Auth: 'ink' }[m] || 'ink');
  const iconFor = m => ({ Inventory: 'package', Tags: 'tag', Statements: 'match', Users: 'user', Auth: 'shield' }[m] || 'dots');
  return (
    <Card
      title="Recent activity"
      actions={<Button size="sm" variant="subtle" iconRight="chevright" onClick={() => { location.hash = '/logs'; }}>View all</Button>}
      flush
    >
      {logs.slice(0, limit).map(l => {
        const mod = l.module ? (l.module.charAt(0).toUpperCase() + l.module.slice(1)) : 'Other';
        const user = l.username || 'system';
        return (
          <div className="feed-item" key={l.id}>
            <span className={`feed-dot chip-${toneFor(mod)}`}><Icon name={iconFor(mod)} /></span>
            <div className="feed-body">
              <p><b style={{ fontWeight: 600 }}>{user}</b> · {String(l.action || '').toLowerCase().replace(/_/g, ' ')}</p>
              {l.details && <p className="muted" style={{ fontSize: 12.5 }}>{typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}</p>}
              <time>{relTime(l.created_at)}</time>
            </div>
          </div>
        );
      })}
      {logs.length === 0 && <EmptyState icon="logs" title="No activity yet">Actions will appear here.</EmptyState>}
    </Card>
  );
}

function TypeBreakdown({ inventory }) {
  const total  = inventory.length;
  const groups = TYPE_FILTERS.slice(1)
    .map(t => ({
      t,
      count: inventory.filter(i => i.type === t).length,
      units: inventory.filter(i => i.type === t).reduce((s, i) => s + i.qty, 0),
    }))
    .filter(g => g.count > 0)
    .sort((a, b) => b.count - a.count);
  return (
    <Card title="By category" flush>
      <div style={{ padding: 'var(--card-pad)' }}>
        {groups.map(g => {
          const m = TYPE_META[g.t];
          return (
            <div key={g.t} style={{ marginBottom: 14 }}>
              <div className="between" style={{ marginBottom: 6 }}>
                <span className="row gap8">
                  <span className={`stat__icon chip-${m.tone}`} style={{ width: 26, height: 26 }}>
                    <Icon name={m.icon} size={15} />
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{g.t}</span>
                </span>
                <span className="cell-sub">
                  <span className="num cell-strong">{g.count}</span> SKUs · {g.units} units
                </span>
              </div>
              <div className="bar">
                <i style={{
                  width: (g.count / Math.max(total, 1) * 100) + '%',
                  background: `var(--${m.tone === 'ink' ? 'navy' : m.tone === 'accent' ? 'accent' : m.tone})`,
                }} />
              </div>
            </div>
          );
        })}
        {groups.length === 0 && <EmptyState icon="package" title="No inventory">Add items to see breakdown.</EmptyState>}
      </div>
    </Card>
  );
}

function ExpiryStrip({ inventory }) {
  const tierCounts = EXPIRY_TIERS.map(t => ({
    ...t,
    count: inventory.filter(i => { const et = expiryTierOf(i); return et && !et.expired && et.key === t.key; }).length,
  })).filter(t => t.count > 0);
  const expired = inventory.filter(i => { const et = expiryTierOf(i); return et && et.expired; }).length;
  if (tierCounts.length === 0 && expired === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '11px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', marginTop: 16,
    }}>
      <Icon name="clock" size={15} style={{ color: 'var(--faint)', flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>Expiry alerts</span>
      {expired > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {expired} expired
        </span>
      )}
      {tierCounts.map(t => (
        <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: `var(--${t.tone}-soft, var(--surface-2))`, color: `var(--${t.tone})` }}>
          {t.count} {t.label.toLowerCase()}
        </span>
      ))}
      <Button size="sm" variant="subtle" iconRight="chevright" style={{ marginLeft: 'auto' }} onClick={() => { location.hash = '/expiry'; }}>
        View tracker
      </Button>
    </div>
  );
}

function ItemDetailModal({ item, onClose }) {
  const { addStock, toast, log } = useStore();
  const m = TYPE_META[item.type] || { abbr: '?', tone: 'ink' };
  const s = statusOf(item);
  const [busy, setBusy] = useState(false);

  const restock = async () => {
    setBusy(true);
    try {
      await addStock([{ name: item.name, sku: item.sku, type: item.type, qty: item.reorder, price: item.price, expiry: item.expiry, supplier: item.supplier, unit: item.unit }]);
      log();
      toast(`${item.name} restocked · +${item.reorder} ${item.unit}`);
      onClose();
    } catch (e) {
      toast('Restock failed: ' + e.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ k, v, mono }) => (
    <div className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="muted" style={{ fontSize: 13.5 }}>{k}</span>
      <span className={mono ? 'num cell-strong' : 'cell-strong'} style={{ fontSize: 13.5 }}>{v}</span>
    </div>
  );

  return (
    <Modal
      title={item.name}
      sub={item.sku}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon="boxplus" onClick={restock} disabled={busy}>
            {busy ? 'Restocking…' : `Record restock (+${item.reorder})`}
          </Button>
        </>
      }
    >
      <div className="row between" style={{ marginBottom: 16 }}>
        <span className="row gap12">
          <span className={`prod__thumb chip-${m.tone}`} style={{ width: 46, height: 46, fontSize: 14 }}>{m.abbr}</span>
          <span className="col"><span className="tag-pill" style={{ width: 'fit-content' }}>{item.type}</span></span>
        </span>
        <StatusBadge item={item} />
      </div>
      <Row k="On hand"       v={`${item.qty} × ${item.unit}`} mono />
      <Row k="Reorder level" v={item.reorder}                  mono />
      <Row k="Unit price"    v={euro(item.price)}              mono />
      <Row k="Stock value"   v={euro(item.qty * item.price)}   mono />
      <Row k="Supplier"      v={item.supplier} />
      <Row k="Last restock"  v={fmtDate(item.restockDate)}     mono />
      <Row k="Expiry"        v={fmtDate(item.expiry)}          mono />
      <Row k="Added by"      v={item.addedBy} />
    </Modal>
  );
}

/* ── Reorder Queue ── */
function ReorderQueue({ inventory, onRow }) {
  const { addStock, toast, log } = useStore();
  const items = inventory
    .filter(i => { const s = statusOf(i); return s.key !== 'ok'; })
    .sort((a, b) => a.qty - b.qty);

  const quick = async (i) => {
    try {
      await addStock([{ name: i.name, sku: i.sku, type: i.type, qty: i.reorder, price: i.price, expiry: i.expiry, supplier: i.supplier, unit: i.unit }]);
      log();
      toast(`${i.name} restocked · +${i.reorder} ${i.unit}`);
    } catch (e) {
      toast('Error: ' + e.message, 'warn');
    }
  };

  return (
    <Card title="Action queue" sub="Items below reorder level or expiring" flush>
      {items.length === 0
        ? <EmptyState icon="checkcircle" title="Nothing to action">All stock is healthy.</EmptyState>
        : items.map(i => {
            const s = statusOf(i);
            const m = TYPE_META[i.type] || { abbr: '?', tone: 'ink' };
            return (
              <div key={i.id} className="alert-row" style={{ gap: 14 }}>
                <span className={`prod__thumb chip-${m.tone}`}>{m.abbr}</span>
                <div className="alert-row__main" onClick={() => onRow(i)} style={{ cursor: 'pointer' }}>
                  <b>{i.name}</b>
                  <span className="mono">{i.sku} · {i.qty}/{i.reorder} {i.unit}</span>
                </div>
                <Badge tone={s.tone === 'danger' ? 'accent' : s.tone}>{s.label}</Badge>
                {s.key !== 'expiring' && (
                  <Button size="sm" variant="ghost" icon="plus" onClick={() => quick(i)}>{i.reorder}</Button>
                )}
              </div>
            );
          })
      }
    </Card>
  );
}

/* ── Dashboard main ── */
export function Dashboard() {
  const { inventory, logs } = useStore();
  const [layout, setLayout] = useState(() => localStorage.getItem('kx_dash_layout') || 'overview');
  const [detail, setDetail] = useState(null);
  const view = useInventoryView(inventory);
  const m    = useMetrics(inventory);
  const setL = (l) => { setLayout(l); localStorage.setItem('kx_dash_layout', l); };

  useHeader({
    actions: (
      <Segmented
        value={layout}
        onChange={setL}
        options={[
          { value: 'overview',   label: 'Overview',   icon: 'dashboard' },
          { value: 'operations', label: 'Operations', icon: 'truck' },
          { value: 'table',      label: 'Table',      icon: 'logs' },
        ]}
      />
    ),
  }, [layout]);

  const stats = (
    <div className="statgrid">
      <StatCard label="Active SKUs"      value={m.skus}                             icon="layers"  tone="info"   delta="+3 this week"   deltaDir="up" />
      <StatCard label="Units on hand"    value={m.totalUnits.toLocaleString('en-IE')} icon="package" tone="ink"    delta="live"           deltaDir="flat" />
      <StatCard label="Stock value"      value={euro(m.value)}                       icon="euro"    tone="accent" delta="live"           deltaDir="flat" />
      <StatCard label="Needs attention"  value={m.attention}                         icon="alert"   tone="warn"   delta={`${m.out} out · ${m.low} low`} deltaDir="flat" />
    </div>
  );

  return (
    <div className={`page${layout === 'table' ? ' page--wide' : ''}`}>
      {detail && <ItemDetailModal item={detail} onClose={() => setDetail(null)} />}

      {layout === 'overview' && (
        <>
          {stats}
          <ExpiryStrip inventory={inventory} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20, marginTop: 20 }} className="dash-cols">
            <div className="col gap16">
              <Card title="Inventory" sub={`${view.items.length} of ${inventory.length} products`} flush>
                <div style={{ padding: '14px var(--card-pad)', borderBottom: '1px solid var(--border)' }}>
                  <InventoryToolbar {...view} />
                </div>
                <InventoryTable items={view.items.slice(0, 9)} onRow={setDetail} columns={['product', 'type', 'stock', 'price', 'status']} />
                <div style={{ padding: '12px var(--card-pad)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <span className="cell-sub">Showing {Math.min(9, view.items.length)} — open the full table from the Table layout</span>
                </div>
              </Card>
            </div>
            <div className="col gap16">
              <AttentionCard inventory={inventory} onRow={setDetail} onGoRestock={() => { location.hash = '/restock'; }} />
              <ActivityCard logs={logs} limit={5} />
            </div>
          </div>
        </>
      )}

      {layout === 'operations' && (
        <>
          {stats}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20, marginTop: 20 }} className="dash-cols">
            <div className="col gap16">
              <ReorderQueue inventory={inventory} onRow={setDetail} />
            </div>
            <div className="col gap16">
              <TypeBreakdown inventory={inventory} />
              <ActivityCard logs={logs} limit={4} />
            </div>
          </div>
        </>
      )}

      {layout === 'table' && (
        <Card title="Full inventory" sub={`${view.items.length} of ${inventory.length} products`} flush>
          <div style={{ padding: '14px var(--card-pad)', borderBottom: '1px solid var(--border)' }}>
            <InventoryToolbar {...view} />
          </div>
          <InventoryTable items={view.items} onRow={setDetail} />
        </Card>
      )}
    </div>
  );
}
