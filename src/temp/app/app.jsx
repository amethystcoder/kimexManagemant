import React, { useState, useEffect } from 'react';
import { Login } from './login.jsx';
import { AppShell, useHashRoute } from './shell.jsx';
import { StoreProvider } from './data.jsx';
import { Dashboard } from './dashboard.jsx';
import { Restock } from './restock.jsx';
import { Statements } from './statements.jsx';
import { Tags } from './tags.jsx';
import { Users, Logs } from './admin.jsx';
import { Expiry } from './expiry.jsx';

const TIER_LABEL = { admin: 'Admin', user: 'Manager', general: 'Staff' };

const VIEWS = {
  dashboard:  () => <Dashboard />,
  restock:    () => <Restock />,
  expiry:     () => <Expiry />,
  statements: () => <Statements />,
  tags:       () => <Tags />,
  users:      () => <Users />,
  logs:       () => <Logs />,
};

export function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [route,   nav]        = useHashRoute();

  /* Check existing session on mount */
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(u  => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const signIn = (userData) => {
    setUser(userData);
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      location.hash = '/dashboard';
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {}
    setUser(null);
    location.hash = '';
    location.href = '/login/login.html';
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--muted)', fontSize: 15 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={signIn} />;
  }

  const currentUser = {
    name:     user.full_name || user.username,
    tier:     user.tier,
    username: user.username,
  };

  const view = VIEWS[route] || VIEWS.dashboard;

  return (
    <StoreProvider user={user}>
      <AppShell
        route={VIEWS[route] ? route : 'dashboard'}
        onNav={nav}
        onSignOut={signOut}
        currentUser={currentUser}
      >
        {view()}
      </AppShell>
    </StoreProvider>
  );
}
