import React, { useState } from 'react';
import { Icon, Button, IconButton, Field, Input, Select, Textarea, Badge, SearchInput, Card, Modal, EmptyState } from './ui.jsx';
import { useStore, euro, fmtDate, statusOf, TYPE_META } from './data.jsx';
import { useHeader } from './shell.jsx';

function RestockLineModal({ inventory, onAdd, onClose }) {
  const [name,     setName]     = useState('');
  const [type,     setType]     = useState('Dry');
  const [sku,      setSku]      = useState('');
  const [qty,      setQty]      = useState('');
  const [unit,     setUnit]     = useState('');
  const [price,    setPrice]    = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [supplier, setSupplier] = useState('');
  const [remarks,  setRemarks]  = useState('');

  const pick = (val) => {
    const it = inventory.find(i => i.name === val);
    if (it) {
      setType(it.type); setSku(it.sku); setUnit(it.unit);
      setPrice(String(it.price)); setSupplier(it.supplier);
    }
    setName(val);
  };

  const valid = name.trim() && Number(qty) > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      name: name.trim(), type, sku: sku.trim(),
      qty: Number(qty), unit: unit.trim() || '1 unit',
      price: Number(price) || 0, expiry,
      supplier: supplier.trim(), remarks: remarks.trim(),
    });
    onClose();
  };

  return (
    <Modal
      title="Add delivery line"
      sub="Receive a product into today's restock"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="plus" onClick={submit} disabled={!valid}>Add line</Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Field label="Product" hint="Pick an existing product to auto-fill, or type a new name">
          <input
            className="input"
            list="prod-list"
            value={name}
            onChange={e => pick(e.target.value)}
            placeholder="e.g. Basmati Rice"
            autoFocus
          />
          <datalist id="prod-list">
            {inventory.map(i => <option key={i.id} value={i.name} />)}
          </datalist>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value)}>
              {Object.keys(TYPE_META).map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="SKU">
            <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="AUTO" className="mono" />
          </Field>
          <Field label="Quantity received">
            <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Unit / pack">
            <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. 5kg sack" />
          </Field>
          <Field label="Unit price (€)">
            <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
          </Field>
        </div>
        <Field label="Supplier">
          <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Atlantic Cold Chain" />
        </Field>
        <div style={{ marginTop: 14 }}>
          <Field label="Remarks (optional)">
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Batch notes, damages, PO reference…" rows={2} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export function Restock() {
  const { inventory, addStock, log, toast } = useStore();
  const [draft,   setDraft]   = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [q,       setQ]       = useState('');
  const [busy,    setBusy]    = useState(false);

  useHeader(
    { actions: <Button variant="primary" icon="plus" onClick={() => setShowAdd(true)}>Add delivery line</Button> },
    []
  );

  const addLine   = (line) => setDraft(d => [...d, { ...line, key: Math.random().toString(36).slice(2) }]);
  const removeLine = (key) => setDraft(d => d.filter(l => l.key !== key));

  const totalUnits = draft.reduce((s, l) => s + l.qty, 0);
  const totalValue = draft.reduce((s, l) => s + l.qty * (l.price || 0), 0);

  const submit = async () => {
    if (draft.length === 0) return;
    setBusy(true);
    try {
      await addStock(draft);
      log();
      toast(`Restock submitted · ${draft.length} line${draft.length !== 1 ? 's' : ''}, ${totalUnits} units`);
      setDraft([]);
    } catch (e) {
      toast('Restock failed: ' + e.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const attention = inventory
    .filter(i => { const s = statusOf(i); return s.key !== 'ok'; })
    .sort((a, b) => a.qty - b.qty);

  const refItems = inventory
    .filter(i => q === '' || (i.name + i.sku).toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="page">
      {showAdd && (
        <RestockLineModal inventory={inventory} onAdd={addLine} onClose={() => setShowAdd(false)} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20 }} className="dash-cols">
        <div className="col gap16">
          {/* Receiving card */}
          <Card
            flush
            title={`Receiving — ${new Date().toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            sub={draft.length
              ? `${draft.length} line(s) · ${totalUnits} units · ${euro(totalValue)}`
              : "Build today's delivery, then submit to inventory"}
            actions={draft.length > 0 && (
              <Button variant="primary" icon="check" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit restock'}
              </Button>
            )}
          >
            {draft.length === 0 ? (
              <div style={{ padding: 8 }}>
                <EmptyState icon="truck" title="No delivery lines yet">
                  Add the products you're receiving today. They'll be committed to inventory when you submit.
                </EmptyState>
                <div style={{ textAlign: 'center', paddingBottom: 16 }}>
                  <Button variant="primary" icon="plus" onClick={() => setShowAdd(true)}>Add delivery line</Button>
                </div>
              </div>
            ) : (
              <div className="tablewrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Product</th><th>Type</th>
                      <th className="right">Qty</th><th className="right">Unit price</th>
                      <th className="right">Line value</th><th>Expiry</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map(l => (
                      <tr key={l.key}>
                        <td className="cell-strong">
                          {l.name}
                          {l.remarks && <span className="cell-sub" style={{ display: 'block', fontWeight: 400 }}>{l.remarks}</span>}
                        </td>
                        <td><span className="tag-pill">{l.type}</span></td>
                        <td className="right num">{l.qty}</td>
                        <td className="right num">{l.price ? euro(l.price) : '—'}</td>
                        <td className="right num cell-strong">{l.price ? euro(l.qty * l.price) : '—'}</td>
                        <td className="num cell-sub">{l.expiry ? fmtDate(l.expiry) : '—'}</td>
                        <td className="right">
                          <IconButton
                            icon="trash"
                            className="btn--sm"
                            style={{ width: 32, height: 32, border: 'none', background: 'transparent' }}
                            onClick={() => removeLine(l.key)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={2} className="cell-strong">Total</td>
                      <td className="right num cell-strong">{totalUnits}</td>
                      <td></td>
                      <td className="right num cell-strong">{euro(totalValue)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Quick-add catalogue */}
          <Card flush title="Quick add from catalogue" sub="Search existing products to pull into the delivery">
            <div style={{ padding: '14px var(--card-pad)', borderBottom: '1px solid var(--border)' }}>
              <SearchInput value={q} onChange={setQ} placeholder="Search the catalogue…" />
            </div>
            {refItems.map(i => {
              const m = TYPE_META[i.type] || { abbr: '?', tone: 'ink' };
              return (
                <div className="alert-row" key={i.id}>
                  <span className={`prod__thumb chip-${m.tone}`}>{m.abbr}</span>
                  <div className="alert-row__main">
                    <b>{i.name}</b>
                    <span className="mono">{i.sku} · {i.qty} {i.unit}</span>
                  </div>
                  <Button
                    size="sm" variant="ghost" icon="plus"
                    onClick={() => addLine({ name: i.name, type: i.type, sku: i.sku, qty: i.reorder, unit: i.unit, price: i.price, expiry: i.expiry, supplier: i.supplier, remarks: '' })}
                  >
                    Add {i.reorder}
                  </Button>
                </div>
              );
            })}
            {refItems.length === 0 && <EmptyState icon="search" title="No products found">Try a different search term.</EmptyState>}
          </Card>
        </div>

        {/* Suggested reorder */}
        <div className="col gap16">
          <Card flush title="Suggested reorder" sub={`${attention.length} item(s) need attention`}>
            {attention.length === 0
              ? <EmptyState icon="checkcircle" title="Nothing to reorder">Stock levels are healthy.</EmptyState>
              : attention.slice(0, 8).map(i => {
                  const s = statusOf(i);
                  return (
                    <div className="alert-row" key={i.id}>
                      <span className={`alert-row__ic chip-${s.tone}`}>
                        <Icon name={s.key === 'out' ? 'alert' : s.key === 'expiring' ? 'clock' : 'trenddown'} />
                      </span>
                      <div className="alert-row__main">
                        <b>{i.name}</b>
                        <span>{s.key === 'expiring' ? `Expires ${fmtDate(i.expiry)}` : `${i.qty}/${i.reorder} ${i.unit}`}</span>
                      </div>
                      {s.key !== 'expiring' && (
                        <Button
                          size="sm" variant="ghost" icon="plus"
                          onClick={() => addLine({ name: i.name, type: i.type, sku: i.sku, qty: i.reorder, unit: i.unit, price: i.price, expiry: i.expiry, supplier: i.supplier, remarks: '' })}
                        />
                      )}
                    </div>
                  );
                })
            }
          </Card>
        </div>
      </div>
    </div>
  );
}
