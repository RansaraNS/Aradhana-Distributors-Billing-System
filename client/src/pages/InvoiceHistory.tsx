
import { useEffect, useMemo, useState } from 'react'
import { Printer, Search, RefreshCw } from 'lucide-react'
import { getInvoices } from '../services/invoiceService'
import { syncPendingInvoices } from '../services/invoiceSyncService'
import type { InvoiceRecord } from '../types/invoice'
import { printInvoice } from '../utils/printInvoice'

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  async function loadInvoices() {
    setError('')
    try {
      setInvoices(await getInvoices())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load invoices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return invoices

    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query)
    )
  }, [invoices, search])

  async function handleSync() {
    setSyncing(true)
    setError('')

    try {
      if (!navigator.onLine) {
        throw new Error('Connect to the internet before synchronizing invoices.')
      }

      await syncPendingInvoices()
      await loadInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invoice sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <p className="p-6 text-slate-500">Loading invoice history...</p>
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoice History</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search invoices saved on this device and check their sync status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing || !navigator.onLine}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={16} />
          {syncing ? 'Syncing...' : 'Sync invoices'}
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-3 text-slate-400"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search invoice number or customer"
          className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3"
        />
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Sync status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filtered.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-4 py-4 font-medium text-slate-900">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-4 py-4">
                  {invoice.customerName || 'Walk-in customer'}
                </td>
                <td className="px-4 py-4">
                  {new Date(invoice.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right font-semibold">
                  Rs. {invoice.total.toFixed(2)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={
                      invoice.syncStatus === 'synced'
                        ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700'
                        : 'rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700'
                    }
                  >
                    {invoice.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => printInvoice(invoice)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium"
                  >
                    <Printer size={14} /> Print
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
