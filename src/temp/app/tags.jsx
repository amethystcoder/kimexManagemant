import React, { useState, useEffect } from 'react';
import { Icon, Button, Field, Input, Segmented, Card } from './ui.jsx';
import { useStore } from './data.jsx';
import { useHeader } from './shell.jsx';

function barcodeSrc(code) {
  return code
    ? `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&translate-esc=on&dpi=96`
    : '';
}

function TagPreview({ mode, f }) {
  const price = f.price    ? '€' + (parseFloat(f.price)    || 0).toFixed(2) : '€0.00';
  const oldP  = f.oldPrice ? '€' + (parseFloat(f.oldPrice) || 0).toFixed(2) : '€0.00';
  const newP  = f.newPrice ? '€' + (parseFloat(f.newPrice) || 0).toFixed(2) : '€0.00';
  const pct   = (f.oldPrice && f.newPrice)
    ? Math.round(((parseFloat(f.oldPrice) - parseFloat(f.newPrice)) / parseFloat(f.oldPrice)) * 100)
    : 0;

  return (
    <div
      className="kx-tag"
      style={{
        background: '#fff', border: '3px solid #111', borderRadius: 14,
        padding: '22px 26px', width: 460, position: 'relative',
        display: 'flex', justifyContent: 'space-between', gap: 16,
        fontFamily: 'var(--font)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <img
          src="/static/logo.svg"
          alt="Kimex"
          style={{ height: 30, width: 'auto', alignSelf: 'flex-start', marginBottom: 14 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-.02em', lineHeight: .98, color: '#111', textTransform: 'uppercase', wordBreak: 'break-word' }}>
          {f.name || 'Product Name'}
        </div>
        {f.info   && <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6,  color: '#111' }}>{f.info}</div>}
        {f.weight && <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3,  color: '#111' }}>{f.weight}</div>}
        {mode === 'promo' && f.promo && <div style={{ fontSize: 17, fontWeight: 800, marginTop: 8, color: 'var(--accent)' }}>{f.promo}</div>}
        <div style={{ marginTop: 'auto', paddingTop: 14, fontSize: 13, color: '#111', fontWeight: 600 }}>
          Kimex Super Store Ireland
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0, gap: 4 }}>
        {mode === 'label' && (
          <div style={{ fontSize: 44, fontWeight: 900, color: '#111', letterSpacing: '-.02em' }}>{price}</div>
        )}
        {mode !== 'label' && (
          <>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', textDecoration: 'line-through' }}>{oldP}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#111', letterSpacing: '-.02em' }}>{newP}</div>
          </>
        )}
        {f.barcode && (
          <img
            alt=""
            src={barcodeSrc(f.barcode)}
            onError={e => { e.target.style.display = 'none'; }}
            style={{ width: 130, height: 52, marginTop: 8, objectFit: 'contain' }}
          />
        )}
      </div>

      {mode === 'discount' && pct > 0 && (
        <div style={{ position: 'absolute', top: -34, right: -26, width: 132, height: 132, display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 399 403" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M60.7787 53.4049L139.868 74.6961L174.074 0.275916L225.544 63.9882L296.96 23.8868L301.151 105.684L382.499 115.219L337.81 183.858L398.017 239.387L321.518 268.649L337.588 348.962L258.499 327.671L224.293 402.091L172.823 338.379L101.407 378.48L97.2161 296.683L15.8681 287.148L60.5571 218.509L0.349502 162.98L76.8486 133.718L60.7787 53.4049Z" fill="var(--accent)" />
          </svg>
          <span style={{ position: 'relative', color: '#fff', fontWeight: 800, fontSize: 14, textAlign: 'center', lineHeight: 1.1, width: '64%' }}>
            {pct}% off<br />while stocks last
          </span>
        </div>
      )}
    </div>
  );
}

const TAG_FIELDS = {
  label:    [['name', 'Product name', 'e.g. CERELAC'], ['info', 'Product type / info', 'e.g. Honey and Wheat'], ['weight', 'Weight / size', 'e.g. 2.5kg'], ['price', 'Price (€)', 'e.g. 14.20'], ['barcode', 'Barcode (optional)', 'e.g. 5391520943027']],
  discount: [['name', 'Product name', 'e.g. HEINEKEN'], ['info', 'Product type / info', 'e.g. Lager 24-pack'], ['weight', 'Weight / size', 'e.g. 24×330ml'], ['oldPrice', 'Old price (€)', 'e.g. 26.50'], ['newPrice', 'New price (€)', 'e.g. 22.50'], ['barcode', 'Barcode (optional)', 'e.g. 5391520943027']],
  promo:    [['name', 'Product name', 'e.g. INDOMIE'], ['info', 'Product type / info', 'e.g. Chicken Noodles'], ['weight', 'Weight / size', 'e.g. 40-pack'], ['oldPrice', 'Old price (€)', 'e.g. 13.40'], ['newPrice', 'New price (€)', 'e.g. 11.50'], ['promo', 'Promotion text', 'e.g. Buy 4 Get 1 Free'], ['barcode', 'Barcode (optional)', 'e.g. 5391520943027']],
};

const TAG_DEFAULTS = {
  label:    { name: 'Cerelac', info: 'Honey and Wheat', weight: '2.5kg', price: '14.20', barcode: '5391520943027' },
  discount: { name: 'Heineken', info: 'Lager 24-pack', weight: '24×330ml', oldPrice: '26.50', newPrice: '22.50', barcode: '5391520943027' },
  promo:    { name: 'Indomie', info: 'Chicken Noodles', weight: '40-pack carton', oldPrice: '13.40', newPrice: '11.50', promo: 'Buy 4 Get 1 Free', barcode: '5391520943027' },
};

export function Tags() {
  const { toast, log } = useStore();
  const [mode, setMode] = useState('label');
  const [data, setData] = useState(TAG_DEFAULTS);

  useEffect(() => {
    const qIdx = location.hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(location.hash.slice(qIdx + 1));
    const m        = params.get('mode');
    const name     = params.get('name');
    const oldPrice = params.get('oldPrice');
    const newPrice = params.get('newPrice');
    const targetMode = (m && TAG_FIELDS[m]) ? m : 'discount';
    if (m && TAG_FIELDS[m]) setMode(m);
    if (name || oldPrice || newPrice) {
      setData(d => ({
        ...d,
        [targetMode]: {
          ...d[targetMode],
          ...(name     ? { name }     : {}),
          ...(oldPrice ? { oldPrice } : {}),
          ...(newPrice ? { newPrice } : {}),
        },
      }));
    }
  }, []);
  const f   = data[mode];
  const set = (k, v) => setData(d => ({ ...d, [mode]: { ...d[mode], [k]: v } }));

  const doPrint = () => {
    log();
    toast('Opening print dialog…');
    setTimeout(() => window.print(), 120);
  };

  useHeader({
    actions: (
      <>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'label',    label: 'Label',     icon: 'tag'     },
            { value: 'discount', label: 'Discount',  icon: 'percent' },
            { value: 'promo',    label: 'Promotion', icon: 'spark'   },
          ]}
        />
        <Button variant="primary" icon="print" onClick={doPrint}>Print tag</Button>
      </>
    ),
  }, [mode]);

  return (
    <div className="page">
      <div
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,360px) minmax(0,1fr)', gap: 24, alignItems: 'start' }}
        className="dash-cols"
      >
        <Card
          title={mode === 'label' ? 'Shelf label' : mode === 'discount' ? 'Discount tag' : 'Promotion tag'}
          sub="Fields update the preview live"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TAG_FIELDS[mode].map(([k, label, ph]) => (
              <Field key={k} label={label}>
                <Input
                  value={f[k] || ''}
                  onChange={e => set(k, e.target.value)}
                  placeholder={ph}
                  className={k === 'barcode' ? 'mono' : ''}
                  type={['price', 'oldPrice', 'newPrice'].includes(k) ? 'number' : 'text'}
                  step="0.01"
                />
              </Field>
            ))}
          </div>
        </Card>

        <div className="col" style={{ alignItems: 'center', gap: 16 }}>
          <div className="cell-sub" style={{ alignSelf: 'flex-start' }}>Preview</div>
          <div
            className="kx-tag-stage"
            style={{
              display: 'grid', placeItems: 'center', width: '100%',
              padding: '32px 16px', background: 'var(--surface-2)',
              border: '1px dashed var(--border-2)', borderRadius: 'var(--r-lg)',
            }}
          >
            <TagPreview mode={mode} f={f} />
          </div>
          <div className="row gap8" style={{ alignSelf: 'flex-end' }}>
            <Button variant="ghost" icon="print" onClick={doPrint}>Print tag</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
