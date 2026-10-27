
import { useEffect, useMemo, useRef, useState } from 'react'
import { Barcode, Plus, Search, Trash2, Save } from 'lucide-react'
import { getItems, getItemByBarcode } from '../services/itemService'
import { createInvoice } from '../services/invoiceService'
import type { Item } from '../types/item'
import type { InvoiceLine, QuantityType, InvoiceRecord } from '../types/invoice'
import {
  calculateInvoiceTotal,
  calculateLineTotal,
  calculateSubtotal,
  roundMoney,
} from '../types/invoice'

export default function CreateInvoice() {
  const [items, setItems] = useState<Item[]>([])
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [barcode, setBarcode] = useState('')
  const [search, setSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [discountInput, setDiscountInput] = useState('0')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedInvoice, setSavedInvoice] = useState<InvoiceRecord | null>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Unable to load items.')
      )
      .finally(() => setLoading(false))
  }, [])

  const discount = Number(discountInput)
  const subtotal = useMemo(() => calculateSubtotal(lines), [lines])
  const validDiscount = Number.isFinite(discount) && discount >= 0
  const total = validDiscount
    ? calculateInvoiceTotal(lines, discount)
    : subtotal

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items.slice(0, 8)

    return items
      .filter(
        (item) =>
          item.itemName.toLowerCase().includes(query) ||
          item.itemCode.toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [items, search])

  function addItem(item: Item) {
    setError('')
    setMessage('')
    setSavedInvoice(null)

    const line: InvoiceLine = {
      id: crypto.randomUUID(),
      itemId: item.id,
      itemName: item.itemName,
      itemCode: item.itemCode,
      quantityType: 'piece',
      quantity: 1,
      unitPrice: item.buyingPrice,
      sellingPrice: item.sellingPrice,
      piecesPerUnit: item.piecesPerUnit,
      lineTotal: item.buyingPrice,
    }

    setLines((current) => [...current, line])
    setSearch('')
    setBarcode('')
    barcodeRef.current?.focus()
  }

  async function addByBarcode() {
    const code = barcode.trim()
    if (!code) return

    setError('')
    setMessage('')

    try {
      const item = await getItemByBarcode(code)

      if (!item) {
        setError(`No item found for barcode: ${code}`)
        return
      }

      addItem(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Barcode lookup failed.')
    }
  }

  function updateLine(
    id: string,
    changes: Partial<Pick<InvoiceLine, 'quantity' | 'quantityType'>>
  ) {
    setSavedInvoice(null)

    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) return line

        const updated = { ...line, ...changes }
        return { ...updated, lineTotal: calculateLineTotal(updated) }
      })
    )
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id))
    setSavedInvoice(null)
  }

  async function handleSave() {
    setError('')
    setMessage('')

    if (!validDiscount) {
      setError('Enter a valid non-negative discount.')
      return
    }

    if (discount > subtotal) {
      setError('Discount cannot exceed the subtotal.')
      return
    }

    if (!lines.length) {
      setError('Add at least one item before saving.')
      return
    }

    if (
      lines.some(
        (line) => !Number.isFinite(line.quantity) || line.quantity <= 0
      )
    ) {
      setError('Every item must have a quantity greater than zero.')
      return
    }

    setSaving(true)

    try {
      const invoice = await createInvoice({
        customerName,
        discount: roundMoney(discount),
        lines,
      })

      setSavedInvoice(invoice)
      setMessage(`Invoice ${invoice.invoiceNumber} saved on this device.`)
      setLines([])
      setCustomerName('')
      setDiscountInput('0')
      setItems(await getItems())
      barcodeRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save invoice.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-6 text-slate-500">Loading products...</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Invoice</h1>
        <p className="mt-1 text-sm text-slate-500">
          Scan a barcode or search for a product to start a sale.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {savedInvoice && (
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="font-semibold text-slate-900">
            {savedInvoice.invoiceNumber}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Saved locally · Total: Rs. {savedInvoice.total.toFixed(2)}
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            Print page
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label htmlFor="barcode" className="mb-2 block text-sm font-semibold">
              Scan barcode
            </label>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void addByBarcode()
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Barcode className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  ref={barcodeRef}
                  id="barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Scan or enter barcode"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white"
              >
                Add
              </button>
            </form>

            <label htmlFor="productSearch" className="mb-2 mt-5 block text-sm font-semibold">
              Or search products
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                id="productSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Product name or barcode"
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3"
              />
            </div>

            {filteredItems.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {item.itemName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.itemCode} · Rs. {item.buyingPrice.toFixed(2)} buying price per piece
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addItem(item)}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">
                Invoice Items ({lines.length})
              </h2>
            </div>

            {lines.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                No products added yet. Scan a barcode or search above.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <div key={line.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{line.itemName}</p>
                        <p className="text-xs text-slate-500">{line.itemCode}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Rs. {line.unitPrice.toFixed(2)} buying price per piece
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${line.itemName}`}
                        onClick={() => removeLine(line.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">
                          Quantity type
                        </label>
                        <select
                          value={line.quantityType}
                          onChange={(event) =>
                            updateLine(line.id, {
                              quantityType: event.target.value as QuantityType,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 p-2"
                        >
                          <option value="piece">Pieces</option>
                          <option value="unit">Full units</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-500">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="1"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.id, {
                              quantity: Number(event.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 p-2"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="mb-1 block text-xs text-slate-500">
                          Line total
                        </span>
                        <p className="rounded-lg bg-slate-50 p-2 font-semibold text-slate-900">
                          Rs. {line.lineTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                        {line.quantityType === 'unit'
                            ? `${line.quantity} unit(s) × ${line.piecesPerUnit} pieces × Rs. ${line.unitPrice.toFixed(2)}`
                            : `${line.quantity} piece(s) × Rs. ${line.unitPrice.toFixed(2)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Payment Summary</h2>

          <label htmlFor="customerName" className="mb-2 mt-5 block text-sm font-medium">
            Customer name (optional)
          </label>
          <input
            id="customerName"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Walk-in customer"
            className="w-full rounded-lg border border-slate-300 p-3"
          />

          <label htmlFor="discount" className="mb-2 mt-4 block text-sm font-medium">
            Discount (LKR)
          </label>
          <input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            value={discountInput}
            onChange={(event) => setDiscountInput(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3"
          />

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Subtotal</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Discount</span>
              <span>- Rs. {validDiscount ? discount.toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-lg font-bold">
              <span>Total</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !lines.length || !validDiscount || discount > subtotal}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving invoice...' : 'Save Invoice'}
          </button>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Invoices are saved to this device for now. Cloud backup and cross-device invoice history are the next step.
          </p>
        </aside>
      </div>
    </div>
  )
}
