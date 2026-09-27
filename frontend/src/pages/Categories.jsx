import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MoreHorizontal, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { number } from '@/lib/format';
import CategoryForm from './CategoryForm';

export default function Categories() {
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApi(() => api.categories.list(), []);
  const [form, setForm] = useState({ open: false, category: null });
  const [menu, setMenu] = useState(null);

  const remove = async (c) => {
    setMenu(null);
    const ok = await confirm({
      title: `Delete “${c.name}”?`,
      body: c.productCount ? `${c.productCount} product${c.productCount === 1 ? '' : 's'} will stay, but become uncategorised.` : 'No products use this category.',
      action: 'Delete category',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.categories.remove(c._id);
      toast.success('Category deleted.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Stock"
        title="Categories"
        description="Group products so the shelf is easier to search and report on."
        actions={
          <Button icon={Plus} onClick={() => setForm({ open: true, category: null })}>
            Add category
          </Button>
        }
      />

      {error ? (
        <div className="card">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[132px] rounded-[14px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Tags}
            title="No categories yet"
            body="Try Shirts, Trousers, Accessories — whatever you would call the shelves."
            action={
              <Button icon={Plus} onClick={() => setForm({ open: true, category: null })}>
                Add category
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <div key={c._id} className="card group relative flex flex-col p-5 transition hover:border-rule-strong hover:shadow-[var(--shadow-slip)]">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/products?category=${c._id}`} className="min-w-0 after:absolute after:inset-0">
                  <h3 className="truncate text-[18px] font-semibold">{c.name}</h3>
                </Link>
                <div className="relative z-10">
                  <button type="button" aria-label={`Options for ${c.name}`} onClick={() => setMenu(menu === c._id ? null : c._id)} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-paper hover:text-ink">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menu === c._id && (
                    <div className="absolute right-0 top-9 z-20 w-40 rounded-[12px] border border-rule bg-surface p-1 shadow-xl" onMouseLeave={() => setMenu(null)}>
                      <button type="button" className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium hover:bg-paper" onClick={() => (setMenu(null), setForm({ open: true, category: c }))}>
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </button>
                      <button type="button" className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium text-debit hover:bg-debit-soft" onClick={() => remove(c)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-1 line-clamp-2 min-h-[2.6em] text-[13px] text-quiet">{c.description || 'No description'}</p>
              <div className="mt-4 flex gap-5 border-t border-dashed border-rule-strong pt-3">
                <p className="text-[12.5px] text-quiet">
                  <span className="figure text-[15px] font-semibold text-ink">{number(c.productCount)}</span> products
                </p>
                <p className="text-[12.5px] text-quiet">
                  <span className="figure text-[15px] font-semibold text-ink">{number(c.units)}</span> units on hand
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryForm open={form.open} category={form.category} onClose={() => setForm({ open: false, category: null })} onSaved={reload} />
    </div>
  );
}
