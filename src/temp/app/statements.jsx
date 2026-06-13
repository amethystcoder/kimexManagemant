import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;
import { Icon, Button, Badge, Card, EmptyState } from './ui.jsx';
import { useStore, euro } from './data.jsx';
import { useHeader } from './shell.jsx';

/* ===== Parsing + matching logic ===== */
const TOLERANCE = 3;
const DATE_RE   = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const TIME_RE   = /^\d{1,2}:\d{2}:\d{2}$/;
const EURO_RE   = /[+-]?€[\d,]+\.\d{2}/g;

const isDate    = s => DATE_RE.test(String(s || '').trim());
const isTime    = s => TIME_RE.test(String(s || '').trim());
const hasEuro   = s => String(s || '').includes('€');
const safeText  = (v, f = '') => { if (v == null) return f; const s = String(v).trim(); return s === '' ? f : s; };
const parseAmt  = a => { if (a == null) return 0; const n = Number(String(a).replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const within    = (a, b) => Math.abs(a - b) <= TOLERANCE;
const splitMerged = t => { if (!t || typeof t !== 'string') return null; const m = t.match(EURO_RE); return (m && m.length >= 2) ? [m[0], m[1]] : null; };
const firstDateIdx = w => { for (let i = 0; i < w.length; i++) if (isDate(w[i])) return i; return -1; };
const tokenize  = t => String(t || '').split(/\s+/).map(x => x.trim()).filter(Boolean);

function extractCustomer(arr) {
  if (!Array.isArray(arr)) return null;
  const n  = arr.map(s => safeText(s).toLowerCase());
  let ci   = n.indexOf('customer'); if (ci === -1) return null;
  let ei   = -1;
  for (let i = ci + 1; i < n.length; i++) if (n[i] === 'statement') { ei = i; break; }
  if (ei === -1) return null;
  const parts = arr.slice(ci + 1, ei).map(s => safeText(s)).filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function parseTransactions(pageTexts) {
  const list = []; let customerName = '';
  for (const pageText of pageTexts) {
    let t = 0;
    const words = tokenize(pageText);
    const di    = firstDateIdx(words);
    if (di === -1) continue;
    const cust = extractCustomer(words.slice(0, di));
    if (!customerName) customerName = cust || '';
    let parsed = words.slice(di);
    while (parsed.length && !isDate(parsed[parsed.length - 1]) && !isTime(parsed[parsed.length - 1])) parsed.pop();
    while (t < parsed.length) {
      if (!isDate(parsed[t])) { t++; continue; }
      const tmp = { transaction_date: parsed[t], transaction_type: 'Unknown', transaction_details: '', amount: '€0.00', balance_after: '€0.00', date_entered: parsed[t], time_entered: '00:00:00' };
      t++;
      const det = [];
      while (t < parsed.length && !hasEuro(parsed[t])) { if (isDate(parsed[t]) && det.length) break; det.push(parsed[t]); t++; }
      tmp.transaction_details = det.join(' ').trim();
      const dl = tmp.transaction_details.toLowerCase();
      if (dl.includes('payment')) tmp.transaction_type = 'Payment';
      else if (dl.includes('customer') && dl.includes('order')) tmp.transaction_type = 'Order';
      else if (dl.includes('opening') && dl.includes('balance')) tmp.transaction_type = 'Opening Balance';
      if (t >= parsed.length || !hasEuro(parsed[t])) continue;
      tmp.amount = safeText(parsed[t], '€0.00'); t++;
      if (t < parsed.length && hasEuro(parsed[t])) { tmp.balance_after = safeText(parsed[t], tmp.amount); t++; } else tmp.balance_after = tmp.amount;
      if (t < parsed.length && isDate(parsed[t])) { tmp.date_entered = parsed[t]; t++; } else tmp.date_entered = tmp.transaction_date;
      if (t < parsed.length && isTime(parsed[t])) { tmp.time_entered = parsed[t]; t++; } else tmp.time_entered = '00:00:00';
      list.push(tmp);
    }
  }
  if (!customerName) customerName = 'Unknown Customer';
  return { customerName, transactionDataList: list };
}

const signed = tx => {
  const a = Math.abs(parseAmt(tx.amount));
  if (tx.transaction_type === 'Payment') return a;
  if (tx.transaction_type === 'Order')   return -a;
  return 0;
};

function matchNet(transactions) {
  const groups = [], used = new Set(); const n = transactions.length; let i = 0;
  while (i < n) {
    if (used.has(i)) { i++; continue; }
    const st = transactions[i];
    if (st.transaction_type !== 'Order' && st.transaction_type !== 'Payment') { i++; continue; }
    let bal = 0, bucket = [], matched = false;
    for (let j = i; j < n; j++) {
      if (used.has(j)) continue;
      const tx = transactions[j];
      if (tx.transaction_type !== 'Order' && tx.transaction_type !== 'Payment') continue;
      bal += signed(tx); bucket.push({ tx, idx: j });
      if (bucket.length >= 2 && within(bal, 0)) {
        bucket.forEach(b => used.add(b.idx));
        groups.push({ balance: bal, transactions: bucket.map(b => b.tx) });
        i = j + 1; matched = true; break;
      }
    }
    if (!matched) i++;
  }
  return { reconciledGroups: groups, remaining: transactions.filter((_, idx) => !used.has(idx)) };
}

function matchTransactions(transactions) {
  const exactMatches = [], partMatches = [], used = new Set();
  for (let i = 0; i < transactions.length; i++) {
    if (used.has(i)) continue;
    const order = transactions[i]; if (order.transaction_type !== 'Order') continue;
    for (let j = i + 1; j < transactions.length; j++) {
      if (used.has(j)) continue;
      const pay = transactions[j]; if (pay.transaction_type !== 'Payment') continue;
      if (parseAmt(order.amount) * -1 === parseAmt(pay.amount)) {
        exactMatches.push([order, pay]); used.add(i); used.add(j); break;
      }
    }
  }
  for (let i = 0; i < transactions.length; i++) {
    if (used.has(i)) continue;
    const order = transactions[i]; if (order.transaction_type !== 'Order') continue;
    const oa = Math.abs(parseAmt(order.amount)); let sum = 0; const pays = [];
    for (let j = i + 1; j < transactions.length; j++) {
      if (used.has(j)) continue;
      const p = transactions[j]; if (p.transaction_type !== 'Payment') continue;
      sum += Math.abs(parseAmt(p.amount)); pays.push({ tx: p, idx: j });
      if (within(sum, oa)) { used.add(i); pays.forEach(x => used.add(x.idx)); partMatches.push({ order, payments: pays.map(x => x.tx) }); break; }
      if (sum > oa + TOLERANCE) break;
    }
  }
  const rem = transactions.filter((tx, i) => !used.has(i) && (tx.transaction_type === 'Order' || tx.transaction_type === 'Payment'));
  const { reconciledGroups, remaining } = matchNet(rem);
  const other = transactions.filter((tx, i) => !used.has(i) && tx.transaction_type !== 'Opening Balance' && tx.transaction_type !== 'Order' && tx.transaction_type !== 'Payment');
  return { exactMatches, partMatches, reconciledGroups, remaining: [...remaining, ...other] };
}

const SAMPLE_TX = [
  { transaction_type: 'Opening Balance', transaction_details: 'Opening balance', amount: '€0.00', date_entered: '01/05/2026', time_entered: '09:00:00' },
  { transaction_type: 'Order',   transaction_details: 'Customer Order #1041 — Rice & Oil', amount: '-€240.00', date_entered: '03/05/2026', time_entered: '11:24:00' },
  { transaction_type: 'Payment', transaction_details: 'Payment received — card',            amount: '€240.00',  date_entered: '03/05/2026', time_entered: '16:02:00' },
  { transaction_type: 'Order',   transaction_details: 'Customer Order #1042 — Frozen goods',amount: '-€180.00', date_entered: '07/05/2026', time_entered: '10:10:00' },
  { transaction_type: 'Payment', transaction_details: 'Part payment — cash',                amount: '€100.00',  date_entered: '07/05/2026', time_entered: '14:30:00' },
  { transaction_type: 'Payment', transaction_details: 'Part payment — transfer',            amount: '€80.00',   date_entered: '10/05/2026', time_entered: '09:45:00' },
  { transaction_type: 'Order',   transaction_details: 'Customer Order #1043 — Beverages',   amount: '-€95.50',  date_entered: '12/05/2026', time_entered: '13:00:00' },
  { transaction_type: 'Payment', transaction_details: 'Payment received — transfer',        amount: '€95.50',   date_entered: '13/05/2026', time_entered: '08:20:00' },
  { transaction_type: 'Order',   transaction_details: 'Customer Order #1044 — Household',   amount: '-€60.00',  date_entered: '15/05/2026', time_entered: '17:05:00' },
  { transaction_type: 'Payment', transaction_details: 'Payment on account',                 amount: '€50.00',   date_entered: '18/05/2026', time_entered: '12:15:00' },
];

/* ===== UI sub-components ===== */
function TxStep({ tx, n, tone }) {
  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
          fontFamily: 'var(--mono)',
          background: tone === 'pending' ? 'var(--warn-soft, #fef9ef)' : 'var(--ink)',
          color:      tone === 'pending' ? '#b97316' : '#fff',
        }}>{n}</span>
        <span style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 4 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
        <div className="between" style={{ gap: 10 }}>
          <b style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {tx.transaction_type === 'Payment' ? 'Payment' : tx.transaction_type === 'Order' ? 'Order placed' : tx.transaction_type}
          </b>
          <span className="num cell-strong" style={{ whiteSpace: 'nowrap', flexShrink: 0, color: tx.transaction_type === 'Payment' ? 'var(--ok)' : 'var(--ink)' }}>
            {safeText(tx.amount, '€0.00')}
          </span>
        </div>
        <div className="cell-sub" style={{ marginTop: 2 }}>{safeText(tx.transaction_details)}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3 }}>
          {safeText(tx.date_entered)} · {safeText(tx.time_entered)}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ title, tone, children }) {
  return (
    <div style={{
      minWidth: 290, maxWidth: 320, flexShrink: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid var(--${tone})`,
      borderRadius: 'var(--r-md)', padding: 18, boxShadow: 'var(--sh-sm)',
    }}>
      {title && <div className="eyebrow" style={{ color: `var(--${tone})`, marginBottom: 12 }}>{title}</div>}
      <div className="match-steps">{children}</div>
    </div>
  );
}

function ResultRow({ title, count, tone, icon, children, empty }) {
  const chipTone = tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : tone === 'info' ? 'info' : 'accent';
  return (
    <div className="mt24">
      <div className="sectionhead" style={{ marginBottom: 12 }}>
        <h2 className="row gap8">
          <span className={`stat__icon chip-${chipTone}`} style={{ width: 28, height: 28 }}>
            <Icon name={icon} size={16} />
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>{title}</span>
        </h2>
        <Badge tone={chipTone}>{count}</Badge>
      </div>
      {count === 0
        ? <div className="card"><div className="card__body cell-sub" style={{ textAlign: 'center' }}>{empty}</div></div>
        : <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>{children}</div>
      }
    </div>
  );
}

/* ===== Main Statements view ===== */
export function Statements() {
  const { toast, log } = useStore();
  const [status,   setStatus]   = useState('Upload a customer statement PDF, or load the sample to see how matching works.');
  const [results,  setResults]  = useState(null);
  const [customer, setCustomer] = useState('');
  const [history,  setHistory]  = useState([]);
  const [drag,     setDrag]     = useState(false);
  const fileRef = useRef(null);

  useHeader(
    { actions: <Button variant="ghost" icon="spark" onClick={() => loadSample()}>Load sample</Button> },
    []
  );

  const store = (key, data, count) =>
    setHistory(h => [{ key, data, count }, ...h.filter(x => x.key !== key)].slice(0, 6));

  const loadSample = () => {
    const r = matchTransactions(SAMPLE_TX);
    setResults(r); setCustomer('Dunnes Wholesale (sample)');
    setStatus(`Sample loaded · ${SAMPLE_TX.length} transactions · ${r.exactMatches.length} exact, ${r.partMatches.length} semi, ${r.remaining.length} unmatched`);
    store('Dunnes Wholesale (sample)', r, SAMPLE_TX.length);
    log();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setStatus(`Reading ${file.name}…`);
    try {
      const pdf   = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p  = await pdf.getPage(i);
        const tc = await p.getTextContent();
        pages.push(tc.items.map(t => t.str).join(' '));
      }
      setStatus('Parsing transactions…');
      const tx = parseTransactions(pages);
      const r  = matchTransactions(tx.transactionDataList);
      setResults(r); setCustomer(tx.customerName);
      setStatus(`Done · ${tx.customerName} · ${tx.transactionDataList.length} transactions · ${r.exactMatches.length} exact, ${r.partMatches.length} semi, ${r.reconciledGroups.length} net, ${r.remaining.length} unmatched`);
      store(tx.customerName, r, tx.transactionDataList.length);
      log();
      toast(`Statement matched · ${tx.customerName}`);
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Could not process that PDF. Try the sample to preview the experience.');
      toast('PDF read failed — try the sample mode', 'warn');
    }
  };

  const summary = results && [
    { label: 'Matched',        tone: 'ok',   n: results.exactMatches.length },
    { label: 'Semi-matched',   tone: 'warn', n: results.partMatches.length },
    { label: 'Net reconciled', tone: 'info', n: results.reconciledGroups.length },
    { label: 'Unmatched',      tone: 'accent', n: results.remaining.filter(r => r.transaction_type !== 'Opening Balance').length },
  ];

  return (
    <div className="page">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,320px) minmax(0,1fr)', gap: 20, alignItems: 'start' }} className="dash-cols">

        {/* Uploader */}
        <div className="col gap16">
          <div
            className="card"
            style={{ borderStyle: drag ? 'solid' : undefined, borderColor: drag ? 'var(--accent)' : undefined }}
          >
            <div
              className="card__body"
              style={{ textAlign: 'center', padding: 28 }}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <span className="stat__icon chip-accent" style={{ width: 52, height: 52, margin: '0 auto 14px', borderRadius: 14 }}>
                <Icon name="filepdf" size={26} />
              </span>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Drop a statement PDF</div>
              <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
                or browse to upload. Parsed entirely in your browser.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
              <div className="row gap8" style={{ justifyContent: 'center' }}>
                <Button variant="primary" icon="upload" onClick={() => fileRef.current.click()}>Browse PDF</Button>
                <Button variant="ghost" icon="spark" onClick={loadSample}>Sample</Button>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <Card title="Recent" flush>
              {history.map(h => (
                <div
                  className="alert-row"
                  key={h.key}
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setResults(h.data); setCustomer(h.key); setStatus(`Loaded ${h.key} · ${h.count} transactions`); }}
                >
                  <span className="alert-row__ic chip-ink"><Icon name="file" /></span>
                  <div className="alert-row__main"><b>{h.key}</b><span>{h.count} transactions</span></div>
                  <Icon name="chevright" size={16} style={{ color: 'var(--faint)' }} />
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="col">
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`stat__icon chip-${results ? 'ok' : 'ink'}`} style={{ width: 30, height: 30 }}>
              <Icon name={results ? 'checkcircle' : 'match'} size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {customer && <div style={{ fontWeight: 700 }}>{customer}</div>}
              <div className="cell-sub">{status}</div>
            </div>
          </div>

          {results && (
            <div className="statgrid mt16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {summary.map(s => (
                <div className="stat" key={s.label} style={{ padding: '14px 16px' }}>
                  <div className="stat__label">{s.label}</div>
                  <div className="stat__val" style={{ fontSize: 26, marginTop: 8, color: `var(--${s.tone})` }}>{s.n}</div>
                </div>
              ))}
            </div>
          )}

          {!results ? (
            <div className="card mt16">
              <div className="card__body">
                <EmptyState icon="match" title="No statement loaded">
                  Upload a PDF or load the sample to reconcile orders against payments.
                </EmptyState>
              </div>
            </div>
          ) : (
            <>
              <ResultRow title="Matched transactions" tone="ok" icon="checkcircle" count={results.exactMatches.length} empty="No exact matches found.">
                {results.exactMatches.map((m, i) => (
                  <MatchCard key={i} title={`Match ${i + 1}`} tone="ok">
                    <TxStep tx={m[0]} n={1} /><TxStep tx={m[1]} n={2} />
                  </MatchCard>
                ))}
              </ResultRow>
              <ResultRow title="Semi-matched (part payments)" tone="warn" icon="layers" count={results.partMatches.length} empty="No part-payment matches found.">
                {results.partMatches.map((m, i) => (
                  <MatchCard key={i} title={`Order + ${m.payments.length} payments`} tone="warn">
                    <TxStep tx={m.order} n={1} />
                    {m.payments.map((p, j) => <TxStep key={j} tx={p} n={j + 2} />)}
                  </MatchCard>
                ))}
              </ResultRow>
              <ResultRow title="Net reconciled" tone="info" icon="refresh" count={results.reconciledGroups.length} empty="No net reconciliations found.">
                {results.reconciledGroups.map((g, i) => (
                  <MatchCard key={i} title={`Group nets to ${euro(Math.abs(g.balance))}`} tone="info">
                    {g.transactions.map((tx, j) => <TxStep key={j} tx={tx} n={j + 1} />)}
                  </MatchCard>
                ))}
              </ResultRow>
              <ResultRow
                title="Unmatched"
                tone="accent"
                icon="alert"
                count={results.remaining.filter(r => r.transaction_type !== 'Opening Balance').length}
                empty="Nothing left unmatched."
              >
                {results.remaining
                  .filter(r => r.transaction_type !== 'Opening Balance')
                  .map((tx, i) => (
                    <MatchCard
                      key={i}
                      title={tx.transaction_type === 'Order' ? 'Unpaid order' : tx.transaction_type === 'Payment' ? 'Unmatched payment' : 'Unmatched'}
                      tone="accent"
                    >
                      <TxStep tx={tx} n="!" tone="pending" />
                    </MatchCard>
                  ))
                }
              </ResultRow>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
