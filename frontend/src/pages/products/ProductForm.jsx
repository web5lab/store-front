import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import Combobox from '@/components/ui/Combobox';
import FileDrop from '@/components/ui/FileDrop';
import { api } from '@/lib/api';
import PartyForm, { partySeed } from '@/pages/parties/PartyForm';
import CategoryForm from '@/pages/CategoryForm';
import { Plus, UserPlus } from 'lucide-react';

const UNITS = ['Piece', 'Box', 'Pack', 'Dozen', 'Kg', 'Gram', 'Litre', 'Metre', 'Pair', 'Set'];

const blank = { name: '', code: '', category: '', supplier: '', purchasePrice: '', sellingPrice: '', quantity: '', minimumStock: '5', unit: 'Piece', description: '' };

/**
 * `onCategoryAdded` / `onSupplierAdded` let the page add a record made here to its own list.
 * `initial` prefills a new product; `openingStock={false}` hides that field when
 * the stock will arrive on the purchase being written.
 */
export default function ProductForm({ open, onClose, product, categories, suppliers, onSaved, onCategoryAdded, onSupplierAdded, initial, openingStock = true }) {
  const editing = Boolean(product);
  const [form, setForm] = useState(blank);
  const [newSupplier, setNewSupplier] = useState(null); // prefill for the add-supplier dialog, or null when closed
  const [newCategory, setNewCategory] = useState(null); // name typed for the add-category dialog, or null when closed
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /* Refill the fields each time the dialog opens. */
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setError('');
      setFile(null);
      setRemoveFile(false);
      setForm(
        product
          ? {
              name: product.name,
              code: product.code,
              category: product.category?._id || '',
              supplier: product.supplier?._id || '',
              purchasePrice: String(product.purchasePrice ?? ''),
              sellingPrice: String(product.sellingPrice ?? ''),
              quantity: String(product.quantity),
              minimumStock: String(product.minimumStock),
              unit: product.unit,
              description: product.description || '',
            }
          : { ...blank, ...initial }
      );
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  /* A category or supplier added here joins its list and is chosen straight away. */
  const categoryAdded = (c) => {
    onCategoryAdded?.(c);
    setForm((f) => ({ ...f, category: c._id }));
  };
  const supplierAdded = (s) => {
    onSupplierAdded?.(s);
    setForm((f) => ({ ...f, supplier: s._id }));
  };
  const cost = Number(form.purchasePrice) || 0;
  const price = Number(form.sellingPrice) || 0;
  const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { quantity, ...rest } = form;
      const values = { ...rest, ...(editing ? {} : { quantity }), file: file || undefined, removeFile: removeFile && !file ? 'true' : undefined };
      if (!values.code) delete values.code;
      const res = editing ? await api.products.update(product._id, values) : await api.products.create(values);
      toast.success(res.message);
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${product.name}` : 'Add a product'}
      description={
        editing
          ? 'Stock is changed with “Adjust stock”, so every change is recorded.'
          : openingStock
            ? 'Only the name is required. Everything else can be filled in later.'
            : 'Only the name is required. Stock comes in with this purchase.'
      }
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={busy}>
            {editing ? 'Save product' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-6">
        <Input className="sm:col-span-4" label="Name" value={form.name} onChange={set('name')} required placeholder="e.g. Cotton shirt, blue, M" />
        <Input className="sm:col-span-2" label="Code" optional value={form.code} onChange={set('code')} placeholder="Auto" hint={editing ? undefined : 'Left blank: PRD-000…'} />

        <div className="sm:col-span-3">
          <Combobox
            label="Category"
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            placeholder="No category"
            onCreate={(q) => setNewCategory(q)}
            createLabel="Add new category"
            labelAction={
              <button type="button" onClick={() => setNewCategory('')} className="-my-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-stamp hover:bg-stamp-soft">
                <Plus className="h-3.5 w-3.5" /> New category
              </button>
            }
          />
        </div>
        <div className="sm:col-span-3">
          <Combobox
            label="Usual supplier"
            options={suppliers.map((s) => ({ value: s._id, label: s.name, sub: [s.code, s.phone].filter(Boolean).join(' · ') }))}
            value={form.supplier}
            onChange={(v) => setForm((f) => ({ ...f, supplier: v }))}
            placeholder="None"
            onCreate={(q) => setNewSupplier(partySeed(q))}
            createLabel="Add new supplier"
            labelAction={
              <button type="button" onClick={() => setNewSupplier({})} className="-my-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-stamp hover:bg-stamp-soft">
                <UserPlus className="h-3.5 w-3.5" /> New supplier
              </button>
            }
          />
        </div>

        <Input className="sm:col-span-2" label="Cost price" prefix="₹" type="number" min="0" step="0.01" inputMode="decimal" value={form.purchasePrice} onChange={set('purchasePrice')} />
        <Input
          className="sm:col-span-2"
          label="Selling price"
          prefix="₹"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={form.sellingPrice}
          onChange={set('sellingPrice')}
          hint={margin !== null ? `${margin.toFixed(1)}% margin` : undefined}
          error={price > 0 && cost > price ? 'Selling below cost' : undefined}
        />
        <Select className="sm:col-span-2" label="Unit" value={form.unit} onChange={set('unit')}>
          {[...new Set([...UNITS, form.unit])].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>

        {!editing && openingStock && <Input className="sm:col-span-3" label="Opening stock" type="number" min="0" step="1" inputMode="numeric" value={form.quantity} onChange={set('quantity')} placeholder="0" />}
        <Input
          className={editing || !openingStock ? 'sm:col-span-6' : 'sm:col-span-3'}
          label="Reorder at"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={form.minimumStock}
          onChange={set('minimumStock')}
          hint="Flagged as low stock at or below this"
        />

        <Textarea className="sm:col-span-6" label="Notes" optional value={form.description} onChange={set('description')} rows={2} />

        <div className="sm:col-span-6">
          <FileDrop
            label="Photo or spec sheet"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            value={file}
            onChange={setFile}
            existingUrl={!removeFile ? product?.file?.url : ''}
            existingName={product?.file?.name}
            onRemoveExisting={() => setRemoveFile(true)}
            hint="JPG, PNG, PDF, Word or Excel up to 10 MB"
          />
        </div>

        {error && <p className="rounded-[10px] bg-debit-soft px-3 py-2.5 text-[13px] font-medium text-debit sm:col-span-6" role="alert">{error}</p>}
      </form>
    </Modal>

    {/* Outside the product dialog, so its submit never reaches the product form. */}
    <CategoryForm open={newCategory !== null} initialName={newCategory || ''} onClose={() => setNewCategory(null)} onSaved={categoryAdded} />
    <PartyForm type="supplier" open={Boolean(newSupplier)} initial={newSupplier || undefined} onClose={() => setNewSupplier(null)} onSaved={supplierAdded} />
    </>
  );
}
