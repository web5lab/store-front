import { stockState } from '@/lib/stock';

/**
 * How full the shelf is, against the reorder level. Ten cells: the reorder
 * level sits at the third, so "low" is visibly the bottom of the shelf.
 */
export default function StockGauge({ quantity, minimum, unit = '', compact = false }) {
  const state = stockState(quantity, minimum);
  const ceiling = Math.max(minimum * 3.3, quantity, 1);
  const filled = quantity <= 0 ? 0 : Math.max(1, Math.round((quantity / ceiling) * 10));
  const color = state === 'out' ? 'bg-debit' : state === 'low' ? 'bg-kraft' : 'bg-credit';
  const text = state === 'out' ? 'text-debit' : state === 'low' ? 'text-kraft-deep' : 'text-ink';

  return (
    <div className="flex items-center gap-2.5" title={`${quantity} ${unit} in stock · reorder at ${minimum}`}>
      <span className={`figure min-w-[2.5ch] text-right text-[13.5px] font-semibold ${text}`}>{quantity}</span>
      {!compact && (
        <div className="flex gap-[2px]" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`h-3.5 w-[5px] rounded-[1.5px] ${i < filled ? color : 'bg-rule'}`} />
          ))}
        </div>
      )}
      {state !== 'ok' && (
        <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${text}`}>{state === 'out' ? 'Out' : 'Low'}</span>
      )}
    </div>
  );
}
