import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import StockGauge from '@/components/ui/StockGauge';
import { Skeleton } from '@/components/ui/Bits';
import { useConfirm } from '@/components/ui/Confirm';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { dateTime, money, number } from '@/lib/format';
import { fileUrl } from '@/lib/platform';

const MOVE_LABEL = { OPENING: 'Opening stock', IN: 'Purchased', OUT: 'Sold', ADJUST: 'Adjusted' };

function AdjustForm({ product, onDone }) {
  const [direction, setDirection] = useState('add');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const n = Math.abs(parseInt(qty, 10) || 0);
  const after = product.quantity + (direction === 'add' ? n : -n);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.products.adjust(product._id, { change: direction === 'add' ? n : -n, reason });
      toast.success('Stock updated.');
      setQty('');
      setReason('');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-[14px] border border-rule bg-paper/50 p-4">
      <p className="text-[14px] font-semibold">Adjust stock</p>
      <p className="text-[12.5px] text-quiet">For counts, damage, returns or samples — not for sales and purchases.</p>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
        <div className="inline-flex rounded-[10px] border border-rule bg-surface p-[3px]">
          {[
            ['add', Plus, 'Add'],
            ['remove', Minus, 'Remove'],
          ].map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-label={label}
              aria-pressed={direction === v}
              onClick={() => setDirection(v)}
              className={`grid h-8 w-9 place-items-center rounded-[8px] transition ${direction === v ? (v === 'add' ? 'bg-credit text-white' : 'bg-debit text-white') : 'text-quiet'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <Input type="number" min="1" step="1" inputMode="numeric" placeholder="Units" value={qty} onChange={(e) => setQty(e.target.value)} required aria-label="Units" />
      </div>
      <Input className="mt-2" placeholder="Reason, e.g. Stock count, Damaged" value={reason} onChange={(e) => setReason(e.target.value)} required aria-label="Reason" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-quiet">
          {n > 0 && (
            <>
              After: <span className={`figure font-semibold ${after < 0 ? 'text-debit' : 'text-ink'}`}>{after}</span> {product.unit}
            </>
          )}
        </p>
        <Button type="submit" size="sm" variant="ink" loading={busy} disabled={!n || after < 0}>
          Record change
        </Button>
      </div>
      {error && <p className="mt-2 text-[12.5px] font-medium text-debit">{error}</p>}
    </form>
  );
}

export default function ProductDrawer({ id, onClose, onEdit, onChanged }) {
  const confirm = useConfirm();
  const { data, loading, reload } = useApi(() => (id ? api.products.get(id) : Promise.resolve(null)), [id]);
  const product = data?.product;

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${product.name}?`,
      body: 'The product and its stock history will be removed. Products that appear on bills cannot be deleted.',
      action: 'Delete product',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.products.remove(product._id);
      toast.success('Product deleted.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isImage = product?.file?.mimeType?.startsWith('image/');

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={product?.name || 'Product'}>
      {loading && !product ? (
        <div className="space-y-4 p-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : product ? (
        <div className="pb-8">
          {isImage ? (
            <img src={fileUrl(product.file.url)} alt="" className="h-56 w-full border-b border-rule bg-paper object-contain" />
          ) : (
            <div className="h-6" />
          )}
          <div className="px-6 pt-5">
            <p className="font-mono text-[12px] text-faint">{product.code}</p>
            <h2 className="mt-0.5 pr-10 text-[24px] font-semibold leading-tight">{product.name}</h2>
            <p className="mt-1 text-[13.5px] text-quiet">
              {product.category?.name || 'No category'}
              {product.supplier && (
                <>
                  {' · from '}
                  <Link className="font-semibold text-stamp hover:underline" to={`/suppliers/${product.supplier._id}`}>
                    {product.supplier.name}
                  </Link>
                </>
              )}
            </p>

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-[14px] border border-rule">
              <div className="p-3.5">
                <p className="eyebrow">In stock</p>
                <div className="mt-2">
                  <StockGauge quantity={product.quantity} minimum={product.minimumStock} unit={product.unit} compact />
                </div>
                <p className="mt-1 text-[11.5px] text-faint">
                  {product.unit} · reorder at {product.minimumStock}
                </p>
              </div>
              <div className="border-l border-rule p-3.5">
                <p className="eyebrow">Cost</p>
                <p className="figure mt-2 text-[15px] font-semibold">{money(product.purchasePrice)}</p>
              </div>
              <div className="border-l border-rule p-3.5">
                <p className="eyebrow">Price</p>
                <p className="figure mt-2 text-[15px] font-semibold">{money(product.sellingPrice)}</p>
                {product.sellingPrice > 0 && (
                  <p className="mt-1 text-[11.5px] text-faint">{(((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100).toFixed(0)}% margin</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={Pencil} onClick={() => onEdit(product)}>
                Edit
              </Button>
              {product.file?.url && !isImage && (
                <a href={fileUrl(product.file.url)} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" icon={FileText}>
                    Open {product.file.name || 'file'}
                  </Button>
                </a>
              )}
              <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={remove} className="ml-auto">
                Delete
              </Button>
            </div>

            {product.description && <p className="mt-4 whitespace-pre-line text-[13.5px] text-quiet">{product.description}</p>}

            <div className="mt-6">
              <AdjustForm
                product={product}
                onDone={() => {
                  reload();
                  onChanged();
                }}
              />
            </div>

            <h3 className="mt-7 text-[15px] font-semibold">Stock history</h3>
            {data.movements.length === 0 ? (
              <p className="mt-2 text-[13.5px] text-quiet">No stock has moved yet.</p>
            ) : (
              <ol className="mt-3 border-l-2 border-rule pl-4">
                {data.movements.map((m) => (
                  <li key={m._id} className="relative pb-4 last:pb-0">
                    <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${m.quantity > 0 ? 'bg-credit' : 'bg-debit'}`} />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13.5px] font-semibold">
                        {MOVE_LABEL[m.type]}
                        {m.reference?.id && (
                          <Link to={`/${m.reference.kind === 'sale' ? 'sales' : 'purchases'}/${m.reference.id}`} className="ml-1.5 font-mono text-[12px] font-medium text-stamp hover:underline">
                            {m.reference.label}
                          </Link>
                        )}
                      </p>
                      <span className={`figure text-[13.5px] font-semibold ${m.quantity > 0 ? 'text-credit' : 'text-debit'}`}>
                        {m.quantity > 0 ? '+' : ''}
                        {number(m.quantity)}
                      </span>
                    </div>
                    <p className="text-[12px] text-faint">
                      {dateTime(m.date)}
                      {m.notes && m.type === 'ADJUST' ? ` · ${m.notes}` : ''}
                      {m.balanceAfter !== null && m.balanceAfter !== undefined ? ` · ${m.balanceAfter} left` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
