
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Package,
  ReceiptText,
  ScanBarcode,
} from 'lucide-react'

const actions = [
  {
    title: 'Manage Items',
    description: 'Add products, update prices and manage barcodes.',
    to: '/items',
    icon: Package,
  },
  {
    title: 'Create Invoice',
    description: 'Scan products and prepare a customer invoice.',
    to: '/invoices/new',
    icon: ScanBarcode,
  },
  {
    title: 'Invoice History',
    description: 'Find previous invoices and reprint receipts.',
    to: '/invoices',
    icon: ReceiptText,
  },
]

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section>
        <p className="text-sm font-medium text-emerald-700">
          BUSINESS OVERVIEW
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Welcome to Aradhana Distributors
        </h2>
        <p className="mt-2 text-slate-500">
          Manage your products and create invoices from one place.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ title, description, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon size={24} />
            </div>

            <h3 className="mt-5 flex items-center justify-between font-semibold text-slate-900">
              {title}
              <ArrowRight
                size={18}
                className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600"
              />
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <h3 className="font-semibold text-slate-900">
          Your billing workspace
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Start by adding your products and barcodes. Once your item
          catalogue is ready, you can use it to create invoices and
          print receipts.
        </p>
        <Link
          to="/items"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Package size={17} />
          Add your first item
        </Link>
      </section>
    </div>
  )
}
