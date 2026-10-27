
import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  X,
} from 'lucide-react'
import { deleteItem, getItems, saveItem } from '../services/itemService'
import type { Item, ItemFormData } from '../types/item'

const emptyForm: ItemFormData = {
  itemName: '',
  itemCode: '',
  sellingPrice: 0,
  buyingPrice: 0,
  piecesPerUnit: 1,
}

const money = (value: number) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(value)

export default function Items() {
  const [items, setItems] = useState<Item[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<ItemFormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadItems() {
    setLoading(true)
    try {
      setItems(await getItems())
    } catch {
      setError('Unable to load items from local storage.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items

    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(query) ||
        item.itemCode.toLowerCase().includes(query),
    )
  }, [items, search])

  const calculatedUnitPrice =
    Math.round(form.buyingPrice * form.piecesPerUnit * 100) / 100

  function openAddModal() {
    setEditingId(undefined)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(item: Item) {
    setEditingId(item.id)
    setForm({
      itemName: item.itemName,
      itemCode: item.itemCode,
      sellingPrice: item.sellingPrice,
      buyingPrice: item.buyingPrice,
      piecesPerUnit: item.piecesPerUnit,
    })
    setError('')
    setModalOpen(true)
  }

  function updateField<K extends keyof ItemFormData>(
    field: K,
    value: ItemFormData[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      await saveItem(form, editingId)
      await loadItems()
      setModalOpen(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save this item.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Item) {
    const confirmed = window.confirm(
      `Delete "${item.itemName}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      await deleteItem(item.id)
      await loadItems()
    } catch {
      setError('Unable to delete this item.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Item Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your product catalogue, barcodes and prices.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          Add New Item
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Items</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {items.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Unique Barcodes</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {new Set(items.map((item) => item.itemCode)).size}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Catalogue Status</p>
          <p className="mt-2 text-lg font-semibold text-emerald-700">
            {items.length ? 'Ready to use' : 'Add your first item'}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item name or barcode..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {error && !modalOpen && (
          <p className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Item</th>
                <th className="px-5 py-4">Barcode</th>
                <th className="px-5 py-4">Selling Price</th>
                <th className="px-5 py-4">Buying Price</th>
                <th className="px-5 py-4">Pieces / Unit</th>
                <th className="px-5 py-4">Unit Price</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Loading items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Package className="mx-auto mb-3 text-slate-300" size={32} />
                    <p className="font-medium text-slate-700">
                      {search ? 'No matching items found' : 'No items yet'}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Add an item to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600">
                      {item.itemCode}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {money(item.sellingPrice)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {money(item.buyingPrice)}
                    </td>
                    <td className="px-5 py-4">
                      {item.piecesPerUnit}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-medium">
                      {money(item.unitPrice)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          aria-label={`Edit ${item.itemName}`}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => void handleDelete(item)}
                          aria-label={`Delete ${item.itemName}`}
                          className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {filteredItems.length} of {items.length} items · Stored on this device
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-modal-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 id="item-modal-title" className="text-lg font-bold">
                  {editingId ? 'Edit Item' : 'Add New Item'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the product details below.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label htmlFor="itemName" className="mb-1.5 block text-sm font-medium">
                  Item Name *
                </label>
                <input
                  id="itemName"
                  required
                  maxLength={150}
                  value={form.itemName}
                  onChange={(e) => updateField('itemName', e.target.value)}
                  placeholder="e.g. Milk Powder 400g"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="itemCode" className="mb-1.5 block text-sm font-medium">
                  Item Code / Barcode *
                </label>
                <input
                  id="itemCode"
                  required
                  maxLength={100}
                  value={form.itemCode}
                  onChange={(e) => updateField('itemCode', e.target.value)}
                  placeholder="Scan barcode or type it"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono outline-none focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Click this field before scanning a barcode.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="buyingPrice" className="mb-1.5 block text-sm font-medium">
                    Buying Price (LKR) *
                  </label>
                  <input
                    id="buyingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.buyingPrice}
                    onChange={(e) => updateField('buyingPrice', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="sellingPrice" className="mb-1.5 block text-sm font-medium">
                    Selling Price (LKR) *
                  </label>
                  <input
                    id="sellingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.sellingPrice}
                    onChange={(e) => updateField('sellingPrice', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="piecesPerUnit" className="mb-1.5 block text-sm font-medium">
                  Pieces per Unit *
                </label>
                <input
                  id="piecesPerUnit"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.piecesPerUnit}
                  onChange={(e) => updateField('piecesPerUnit', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">
                  Calculated Unit Price
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {money(calculatedUnitPrice)}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Buying Price × Pieces per Unit
                </p>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
