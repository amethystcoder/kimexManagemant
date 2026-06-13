import React, { useState } from 'react';
import { Icon, Button, Field, Input } from './ui.jsx';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const features = [
    ['warehouse', 'Live inventory across the floor & cold store'],
    ['match',     'Reconcile customer statements in seconds'],
    ['tag',       'Print shelf labels, discounts & promotions'],
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Brand panel */}
      <div
        style={{
          flex: '1 1 50%',
          background: 'linear-gradient(155deg, #20264b 0%, #161a33 60%, #11142a 100%)',
          color: '#fff', padding: '56px 56px',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
        }}
        className="login-brand"
      >
        <div style={{
          position: 'absolute', width: 460, height: 460, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(226,60,38,.55), transparent 68%)',
          top: -160, right: -140, filter: 'blur(8px)',
        }} />
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,.06), transparent 70%)',
          bottom: -120, left: -80,
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ background: '#fff', borderRadius: 12, padding: '9px 12px', display: 'grid', placeItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,.25)' }}>
            <img src="/static/logo.svg" alt="Kimex" style={{ height: 26, display: 'block' }}
              onError={e => { e.target.style.display = 'none'; }} />
          </span>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-.01em' }}>StockWise</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)' }}>Super Store Suite</div>
          </div>
        </div>

        {/* Copy */}
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <div className="eyebrow" style={{ color: '#e8886e' }}>Kimex Super Store · Ireland</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.08, margin: '12px 0 20px', maxWidth: 460 }}>
            One suite to run the whole shop floor.
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, maxWidth: 420 }}>
            {features.map(([ic, txt]) => (
              <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name={ic} size={19} style={{ color: '#e8886e' }} />
                </span>
                <span style={{ fontSize: 14.5, color: 'rgba(255,255,255,.82)' }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', marginTop: 36, fontSize: 12.5, color: 'rgba(255,255,255,.45)' }}>
          © 2026 Kimex Super Store Ltd. · v2.0
        </div>
      </div>

      {/* Form panel */}
      <div
        style={{ flex: '1 1 50%', display: 'grid', placeItems: 'center', padding: 32, background: 'var(--bg)' }}
        className="login-form-panel"
      >
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 6px' }}>Welcome back</h2>
          <p className="muted" style={{ margin: '0 0 28px', fontSize: 14.5 }}>Sign in to the Kimex StockWise suite.</p>

          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--r-sm)',
              background: 'var(--danger-soft, #fef2f2)', border: '1px solid var(--danger, #e23c26)',
              color: 'var(--danger, #e23c26)', fontSize: 13.5, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Username">
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your.name"
                autoFocus
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <Input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  title={show ? 'Hide' : 'Show'}
                  style={{
                    position: 'absolute', right: 6, top: 5,
                    width: 30, height: 30, border: 0,
                    background: 'none', cursor: 'pointer',
                    color: 'var(--faint)', display: 'grid', placeItems: 'center',
                  }}
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="btn--block"
              disabled={busy || !username.trim() || !password}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
