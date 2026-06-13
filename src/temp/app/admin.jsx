import React, { useState } from 'react';
import { Icon, Button, IconButton, Badge, Field, Input, Select, SearchInput, Card, StatCard, Modal, EmptyState } from './ui.jsx';
import { useStore, initials, relTime, fmtDateTime, normModule, normAction, normDetails, TIER_LABEL } from './data.jsx';
import { useHeader } from './shell.jsx';

/* ── Activity Log ── */
const MODULE_TONE = { Inventory: 'ok', Tags: 'accent', Statements: 'info', Users: 'warn', Auth: 'neutral' };
const MODULES     = ['All', 'Inventory', 'Tags', 'Statements', 'Users', 'Auth'];

export function Logs() {
  const { logs, isAdmin } = useStore();
  const [q,   setQ]   = useState('');
  const [mod, setMod] = useState('All');

  if (!isAdmin) {
    return (
      <div className="page">
        <EmptyState icon="lock" title="Admin access required">
          The activity log is only available to administrators.
        </EmptyState>
      </div>
    );
  }

  const rows = logs.filter(l => {
    const modDisplay = normModule(l.module);
    return (
      (mod === 'All' || modDisplay === mod) &&
      (q === '' || (
        (l.username || '') + normAction(l.action) + normDetails(l.details)
      ).toLowerCase().includes(q.toLowerCase()))
    );
  });

  const today   = new Date().toISOString().slice(0, 10);
  const todayCt = logs.filter(l => l.created_at && l.created_at.startsWith(today)).length;

  return (
    <div className="page">
      <div className="statgrid mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <StatCard label="Events logged"       value={logs.length}                                                       icon="logs"    tone="ink"  />
        <StatCard label="Today"               value={todayCt}                                                           icon="calendar" tone="info" />
        <StatCard label="Inventory changes"   value={logs.filter(l => (l.module || '').toLowerCase() === 'inventory').length} icon="package" tone="ok"   />
        <StatCard label="Sign-ins"            value={logs.filter(l => l.action === 'LOGIN_SUCCESS').length}              icon="shield"  tone="warn" />
      </div>

      <Card
        flush
        title="Audit trail"
        sub={`${rows.length} of ${logs.length} events`}
        actions={<Button size="sm" variant="ghost" icon="download">Export CSV</Button>}
      >
        <div style={{ padding: '14px var(--card-pad)', borderBottom: '1px solid var(--border)' }} className="between wrap">
          <SearchInput value={q} onChange={setQ} placeholder="Search events, users, details…" className="search--top" />
          <div className="segmented wrap">
            {MODULES.map(m => (
              <button key={m} className={mod === m ? 'is-active' : ''} onClick={() => setMod(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div className="tablewrap">
          <table className="tbl">
            <thead>
              <tr><th>When</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr>
            </thead>
            <tbody>
              {rows.map(l => {
                const modDisplay = normModule(l.module);
                return (
                  <tr key={l.id}>
                    <td className="num cell-sub" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                    <td>
                      <div className="row gap8">
                        <span className="avatar" style={{ width: 26, height: 26, fontSize: 10.5 }}>
                          {initials(l.username || 'system')}
                        </span>
                        <span className="mono" style={{ fontSize: 13 }}>{l.username || 'system'}</span>
                      </div>
                    </td>
                    <td className="cell-strong">{normAction(l.action)}</td>
                    <td><Badge tone={MODULE_TONE[modDisplay] || 'neutral'}>{modDisplay}</Badge></td>
                    <td className="cell-sub">{normDetails(l.details)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState icon="search" title="No matching events">Adjust your search or module filter.</EmptyState>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── User Management ── */
const TIER_TONE = { Admin: 'accent', Manager: 'info', Staff: 'neutral' };

function UserModal({ user, onClose, onSave }) {
  const isEdit = Boolean(user);
  const [fullName,  setFullName]  = useState(user ? (user.full_name || '') : '');
  const [username,  setUsername]  = useState(user ? (user.username || '') : '');
  const [password,  setPassword]  = useState('');
  const [tier,      setTier]      = useState(user ? (TIER_LABEL[user.tier] || 'Staff') : 'Staff');
  const [isActive,  setIsActive]  = useState(user ? user.is_active : true);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState('');

  const valid = fullName.trim() && username.trim() && (!isEdit ? password.length >= 6 : true);

  const handleSave = async () => {
    if (!valid) return;
    setBusy(true);
    setErr('');
    try {
      await onSave({ full_name: fullName.trim(), username: username.trim(), password: password || undefined, tier, is_active: isActive });
      onClose();
    } catch (e) {
      setErr(e.message || 'Failed to save user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit user' : 'Add user'}
      sub={isEdit ? user.username : 'Create a new staff account'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="check" disabled={!valid || busy} onClick={handleSave}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      {err && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#fef2f2', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 13.5 }}>
          {err}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full name">
          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Sade Lawal" autoFocus />
        </Field>
        <Field label="Username" hint={isEdit ? 'Username cannot be changed' : ''}>
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. s.lawal" disabled={isEdit} />
        </Field>
        <Field label={isEdit ? 'New password (leave blank to keep)' : 'Password'} hint={!isEdit ? 'Minimum 6 characters' : ''}>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isEdit ? '••••••••' : 'At least 6 characters'}
            autoComplete="new-password"
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Access tier">
            <Select value={tier} onChange={e => setTier(e.target.value)}>
              <option>Admin</option>
              <option>Manager</option>
              <option>Staff</option>
            </Select>
          </Field>
          {isEdit && (
            <Field label="Status">
              <button
                type="button"
                onClick={() => setIsActive(a => !a)}
                className="input row"
                style={{ justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>{isActive ? 'Active' : 'Inactive'}</span>
                <span style={{
                  width: 36, height: 20, borderRadius: 999,
                  background: isActive ? 'var(--ok)' : 'var(--border-2)',
                  position: 'relative', transition: 'background .15s',
                }}>
                  <span style={{
                    position: 'absolute', top: 2, left: isActive ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', transition: 'left .15s',
                    boxShadow: 'var(--sh-sm)',
                  }} />
                </span>
              </button>
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Users() {
  const { users, addUser, updateUser, toggleUser, isAdmin, log, toast } = useStore();
  const [q,     setQ]     = useState('');
  const [tier,  setTier]  = useState('All');
  const [modal, setModal] = useState(null); // { user } | { isNew: true }

  useHeader(
    { actions: isAdmin ? <Button variant="primary" icon="plus" onClick={() => setModal({ isNew: true })}>Add user</Button> : null },
    [isAdmin]
  );

  if (!isAdmin) {
    return (
      <div className="page">
        <EmptyState icon="lock" title="Admin access required">
          User management is only available to administrators.
        </EmptyState>
      </div>
    );
  }

  const rows = users.filter(u => {
    const tierDisplay = TIER_LABEL[u.tier] || u.tier;
    return (
      (tier === 'All' || tierDisplay === tier) &&
      (q === '' || (u.full_name + u.username).toLowerCase().includes(q.toLowerCase()))
    );
  });

  const save = async (data) => {
    try {
      if (modal.user) {
        await updateUser(modal.user.id, data);
        log();
        toast('User updated');
      } else {
        await addUser(data);
        log();
        toast('User created');
      }
    } catch (e) {
      toast('Error: ' + e.message, 'warn');
      throw e; // re-throw so modal can show inline error
    }
  };

  const toggle = async (u) => {
    try {
      await toggleUser(u.id);
      log();
      toast(u.is_active ? `${u.full_name} deactivated` : `${u.full_name} activated`);
    } catch (e) {
      toast('Error: ' + e.message, 'warn');
    }
  };

  return (
    <div className="page">
      {modal && (
        <UserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}

      <div className="statgrid mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <StatCard label="Total users" value={users.length}                                                           icon="users"       tone="ink"    />
        <StatCard label="Active"      value={users.filter(u => u.is_active).length}                                  icon="checkcircle" tone="ok"     />
        <StatCard label="Admins"      value={users.filter(u => u.tier === 'admin').length}                            icon="shield"      tone="accent" />
        <StatCard label="Managers"    value={users.filter(u => u.tier === 'user').length}                             icon="user"        tone="info"   />
      </div>

      <Card flush title="Staff accounts" sub={`${rows.length} of ${users.length} users`}>
        <div style={{ padding: '14px var(--card-pad)', borderBottom: '1px solid var(--border)' }} className="between wrap">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name or username…" className="search--top" />
          <div className="segmented">
            {['All', 'Admin', 'Manager', 'Staff'].map(t => (
              <button key={t} className={tier === t ? 'is-active' : ''} onClick={() => setTier(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="tablewrap">
          <table className="tbl">
            <thead>
              <tr><th>User</th><th>Tier</th><th>Status</th><th className="right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(u => {
                const tierDisplay = TIER_LABEL[u.tier] || u.tier;
                const avatarBg    = u.tier === 'admin' ? 'var(--accent)' : u.tier === 'user' ? 'var(--navy)' : 'var(--ink-2)';
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="prod">
                        <span className="avatar" style={{ width: 38, height: 38, background: avatarBg }}>
                          {initials(u.full_name || u.username)}
                        </span>
                        <span className="cell-main">
                          <span className="cell-strong">{u.full_name || u.username}</span>
                          <span className="cell-sub mono">{u.username}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge tone={TIER_TONE[tierDisplay] || 'neutral'} plain={tierDisplay === 'Staff'}>
                        <Icon
                          name={tierDisplay === 'Admin' ? 'shield' : tierDisplay === 'Manager' ? 'user' : 'users'}
                          size={12}
                        />
                        {tierDisplay}
                      </Badge>
                    </td>
                    <td>{u.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}</td>
                    <td className="right">
                      <div className="row gap8" style={{ justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" onClick={() => toggle(u)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <IconButton
                          icon="edit"
                          className="btn--sm"
                          style={{ width: 32, height: 32 }}
                          onClick={() => setModal({ user: u })}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState icon="users" title="No users found">Try a different search or tier.</EmptyState>
          )}
        </div>
      </Card>
    </div>
  );
}
