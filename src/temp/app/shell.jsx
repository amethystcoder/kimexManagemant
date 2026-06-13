import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Icon, IconButton } from './ui.jsx';
import { useStore, initials, statusOf, expiryTierOf, TIER_LABEL } from './data.jsx';

/* ---------------- NAV config ---------------- */
export const NAV = [
  { group: 'Operations', items: [
    { id: 'dashboard',  label: 'Dashboard',          icon: 'dashboard', title: 'Dashboard',          sub: 'Inventory overview · Kimex Super Store' },
    { id: 'restock',    label: 'Restock',             icon: 'boxplus',   title: 'Restock',            sub: 'Receive deliveries & top up stock' },
    { id: 'expiry',     label: 'Expiry Tracker',      icon: 'clock',     title: 'Expiry Tracker',     sub: 'Monitor stock nearing expiry' },
  ]},
  { group: 'Tools', items: [
    { id: 'statements', label: 'Statement Matcher',   icon: 'match',     title: 'Statement Matcher',  sub: 'Reconcile customer account statements' },
    { id: 'tags',       label: 'Tag Generator',       icon: 'tag',       title: 'Tag Generator',      sub: 'Shelf labels, discounts & promotions' },
  ]},
  { group: 'Administration', items: [
    { id: 'users',      label: 'User Management',     icon: 'users',     title: 'User Management',    sub: 'Staff accounts & access tiers' },
    { id: 'logs',       label: 'Activity Log',        icon: 'logs',      title: 'Activity Log',       sub: 'System events & audit trail' },
  ]},
];

export const ROUTE_META = {};
NAV.forEach(g => g.items.forEach(it => { ROUTE_META[it.id] = it; }));

/* ---------------- Hash routing ---------------- */
export function useHashRoute() {
  const get = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');
  const [route, setRoute] = useState(get());
  useEffect(() => {
    const h = () => setRoute(get());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const nav = useCallback(r => { location.hash = '/' + r; }, []);
  return [route, nav];
}

/* ---------------- Header context ---------------- */
export const HeaderCtx = createContext({ setHeader: () => {} });

export function useHeader(cfg, deps) {
  const { setHeader } = useContext(HeaderCtx);
  useEffect(() => {
    setHeader(cfg);
    return () => setHeader(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || []);
}

/* ---------------- Sidebar ---------------- */
function Sidebar({ route, onNav, open, currentUser }) {
  const { inventory } = useStore();
  const attention    = inventory.filter(i => { const s = statusOf(i); return s.key === 'low' || s.key === 'out'; }).length;
  const expiryAlert  = inventory.filter(i => { const t = expiryTierOf(i); return t && (t.expired || t.key === 'critical' || t.key === 'urgent'); }).length;
  const tierDisplay = TIER_LABEL[currentUser.tier] || currentUser.tier;

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`}>
      <div className="sidebar__brand">
        <img src="/static/logo.svg" alt="Kimex" onError={e => { e.target.style.display = 'none'; }} />
        <div className="sidebar__brand-text">
          <b>StockWise</b>
          <span>Super Store Suite</span>
        </div>
      </div>
      <nav className="sidebar__nav">
        {NAV.map(g => (
          <div className="nav-group" key={g.group}>
            <div className="nav-group__label">{g.group}</div>
            {g.items.map(it => (
              <button
                key={it.id}
                className={`nav-item${route === it.id ? ' is-active' : ''}`}
                onClick={() => onNav(it.id)}
              >
                <Icon name={it.icon} />
                {it.label}
                {it.id === 'restock' && attention > 0 && (
                  <span className="nav-item__badge">{attention}</span>
                )}
                {it.id === 'expiry' && expiryAlert > 0 && (
                  <span className="nav-item__badge">{expiryAlert}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar__foot">
        <button className="userchip">
          <span className="avatar">{initials(currentUser.name)}</span>
          <span className="userchip__meta">
            <b>{currentUser.name}</b>
            <span>{tierDisplay}</span>
          </span>
          <Icon name="settings" size={16} style={{ marginLeft: 'auto', color: 'var(--faint)' }} />
        </button>
      </div>
    </aside>
  );
}

/* ---------------- Topbar ---------------- */
function Topbar({ header, onMenu, onSignOut }) {
  return (
    <header className="topbar">
      <IconButton icon="menu" onClick={onMenu} className="menu-btn" />
      <div className="topbar__title">
        <h1>{header.title}</h1>
        {header.sub && <span>{header.sub}</span>}
      </div>
      <div className="topbar__spacer" />
      {header.actions && (
        <div className="topbar__page-actions">{header.actions}</div>
      )}
      <div className="topbar__icons">
        <IconButton icon="bell" dot title="Notifications" />
        <IconButton icon="logout" onClick={onSignOut} title="Sign out" />
      </div>
    </header>
  );
}

/* ---------------- Toasts ---------------- */
function Toasts() {
  const { toasts } = useStore();
  return (
    <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 90, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid var(--${t.tone === 'ok' ? 'ok' : t.tone === 'warn' ? 'warn' : 'accent'})`,
            boxShadow: 'var(--sh-lg)', borderRadius: 'var(--r-md)',
            padding: '12px 16px', minWidth: 240, maxWidth: 360,
            animation: 'pop .2s ease',
          }}
        >
          <span
            className={`stat__icon chip-${t.tone === 'ok' ? 'ok' : t.tone === 'warn' ? 'warn' : 'accent'}`}
            style={{ width: 28, height: 28 }}
          >
            <Icon name={t.tone === 'warn' ? 'alert' : 'check'} size={16} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- AppShell ---------------- */
export function AppShell({ route, onNav, onSignOut, currentUser, children }) {
  const [header, setHeader] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = ROUTE_META[route] || { title: 'Kimex StockWise' };
  const effective = { title: meta.title, sub: meta.sub, actions: null, ...(header || {}) };

  useEffect(() => { setMenuOpen(false); }, [route]);

  return (
    <HeaderCtx.Provider value={{ setHeader }}>
      <div className="app">
        <Sidebar route={route} onNav={onNav} open={menuOpen} currentUser={currentUser} />
        {menuOpen && (
          <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
        )}
        <div className="app__main">
          <Topbar header={effective} onMenu={() => setMenuOpen(o => !o)} onSignOut={onSignOut} />
          <div className="app__scroll">{children}</div>
        </div>
        <Toasts />
      </div>
    </HeaderCtx.Provider>
  );
}
