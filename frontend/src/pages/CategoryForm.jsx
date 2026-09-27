import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Field';
import { api } from '@/lib/api';

/** Add or rename a category. `initialName` prefills a new one, e.g. the name typed in the product form. */
export default function CategoryForm({ open, category, initialName = '', onClose, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastOpen, setLastOpen] = useState(false);

  /* Reset the fields each time the dialog opens. */
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(category?.name || initialName);
      setDescription(category?.description || '');
      setError('');
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = category ? await api.categories.update(category._id, { name, description }) : await api.categories.create({ name, description });
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
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Rename category' : 'Add a category'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={busy}>
            {category ? 'Save category' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Shirts" error={error} />
        <Textarea label="Description" optional value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </form>
    </Modal>
  );
}
