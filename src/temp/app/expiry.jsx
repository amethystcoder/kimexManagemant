import React, { useState } from 'react';
import { Icon, Button, Badge, SearchInput, Card, StatCard, EmptyState } from './ui.jsx';
import { useStore, euro, fmtDate, EXPIRY_TIERS, expiryTierOf } from './data.jsx';
import { useHeader } from './shell.jsx';

export function Expiry() {
  const { inventory, removeStock, toast, log } = useStore();
  const [q, setQ] = useState('');

  useHeader({ actions: null }, []);

  const allExpiring = inventory
    .map(i => ({ ...i, tier: expiryTierOf(i) }))
    .filter(i => i.tier !== null);

  const expired = allExpiring.filter(i => i.tier.expired);
  const active  = allExpiring.filter(i => !i.tier.expired);

  const filtered = (list) =>
    q ? list.filter(i => (i.name + i.sku).toLowerCase().includes(q.toLowerCase())) : list;

  const countFor = (key) => active.filter(i => i.tier.key === key).length;

  const goToTag = (item) => {
    const discounted = (item.price * (1 - item.tier.discount / 100)).toFixed(2);
    const params = new URLSearchParams({
      mode: 'discount',
      name: item.name,
      oldPrice: String(item.price),
      newPrice: discounted,
    });
    location.hash = `/tags?${params.toString()}`;
  };

  const handleRemove = async (item) => {
    try {
      await removeStock(item.id);
      log();
      toast(`${item.name} — stock set to zero`);
    } catch (e) {
      toast('Failed: ' + e.message, 'warn');
    }
  };

  return (
    <div className="page">
      <div className="statgrid mb16" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <StatCard label="Total expiring"   value={active.length}           icon="clock"     tone="ink"    />
        <StatCard label="Critical (≤2 wk)" value={countFor('critical')}    icon="alert"     tone="accent" />
        <StatCard label="Urgent (≤1 mo)"   value={countFor('urgent')}      icon="clock"     tone="warn"   />
        <StatCard label="Warning (≤3 mo)"  value={countFor('warning')}     icon="trenddown" tone="info"   />
        <StatCard label="Watch / Notice"   value={countFor('watch') + countFor('notice')} icon="calendar" tone="neutral" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search expiring items…" />
      </div>

      {/* Expired section */}
      {filtered(expired).length > 0 && (
        <div className="mb16">
          <Card
            flush
            title={`Expired — ${filtered(expired).length} item${filtered(expired).length !== 1 ? 's' : ''}`}
            sub="These items have already passed their expiry date — remove from active stock"
          >
            {filtered(expired).map(item => (
              <ExpiryRow
                key={item.id}
                item={item}
                showTag={false}
                onRemove={() => handleRemove(item)}
              />
            ))}
          </Card>
        </div>
      )}

      {/* Active tiers */}
      {EXPIRY_TIERS.map(tier => {
        const items = filtered(active).filter(i => i.tier.key === tier.key);
        if (items.length === 0) return null;
        return (
          <div key={tier.key} className="mb16">
            <Card
              flush
              title={`${tier.label} — ${items.length} item${items.length !== 1 ? 's' : ''}`}
              sub={`Expires within ${tier.days} days · Recommended discount: ${tier.discount}% off`}
            >
              {items
                .sort((a, b) => a.tier.daysLeft - b.tier.daysLeft)
                .map(item => (
                  <ExpiryRow
                    key={item.id}
                    item={item}
                    showTag
                    onGoToTag={() => goToTag(item)}
                    onRemove={() => handleRemove(item)}
                  />
                ))}
            </Card>
          </div>
        );
      })}

      {filtered(allExpiring).length === 0 && (
        <EmptyState icon="checkcircle" title="No items expiring soon">
          {q
            ? 'No expiring items match your search.'
            : 'All active stock has more than 7 months before expiry.'}
        </EmptyState>
      )}
    </div>
  );
}

function ExpiryRow({ item, showTag, onGoToTag, onRemove }) {
  const tier      = item.tier;
  const discounted = (item.price * (1 - tier.discount / 100)).toFixed(2);
  const daysLabel  = tier.expired
    ? 'Expired'
    : tier.daysLeft === 0 ? 'Expires today'
    : tier.daysLeft === 1 ? '1 day left'
    : `${tier.daysLeft} days left`;

  return (
    <div
      className="alert-row"
      style={{ gap: 14, padding: '13px var(--card-pad)', alignItems: 'center', flexWrap: 'wrap' }}
    >
      {/* Product info */}
      <div className="alert-row__main" style={{ minWidth: 160 }}>
        <b>{item.name}</b>
        <span className="mono">{item.sku} · {item.qty} {item.unit}</span>
      </div>

      {/* Expiry date + countdown */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, minWidth: 110 }}>
        <span className="cell-strong" style={{ fontSize: 13 }}>{fmtDate(item.expiry)}</span>
        <span
          style={{
            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
            background: tier.expired ? 'var(--accent-soft, #fef2f2)' : `var(--${tier.tone}-soft, var(--surface-2))`,
            color: tier.expired ? 'var(--accent)' : `var(--${tier.tone})`,
          }}
        >
          {daysLabel}
        </span>
      </div>

      {/* Discount recommendation */}
      {showTag && item.price > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0, minWidth: 120 }}>
          <span className="cell-sub" style={{ fontSize: 12 }}>{tier.discount}% off</span>
          <span className="num" style={{ fontSize: 13.5, fontWeight: 700 }}>
            {euro(item.price)} <Icon name="chevright" size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {euro(discounted)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="row gap8" style={{ flexShrink: 0, marginLeft: 'auto' }}>
        {showTag && !tier.expired && (
          <Button size="sm" variant="ghost" icon="tag" onClick={onGoToTag}>
            Print tag
          </Button>
        )}
        <Button size="sm" variant="ghost" icon="trash" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
