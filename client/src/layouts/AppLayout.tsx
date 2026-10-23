
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  History,
  Settings,
  Store,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useItemSync } from '../hooks/useItemSync'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/items', label: 'Item Management', icon: Package },
  { to: '/invoices/new', label: 'Create Invoice', icon: ReceiptText },
  { to: '/invoices', label: 'Invoice History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout() {
  const isOnline = navigator.onLine
  const { pendingCount, syncing, syncError, syncNow } = useItemSync()

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="flex w-full shrink-0 flex-col bg-slate-950 text-white md:fixed md:inset-y-0 md:w-64">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500">
            <Store size={23} />
          </div>
          <div>
            <h1 className="font-bold">Aradhana</h1>
            <p className="text-xs text-slate-400">Distributors</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  isActive
                    ? 'bg-emerald-500 font-semibold text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        

        <div className="hidden border-t border-white/10 p-4 text-xs text-slate-400 md:block">
          Billing & Inventory System
          <br />
          Version 1.0
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div>
            <p className="text-xs text-slate-500">ARADHANA DISTRIBUTORS</p>
            <p className="font-semibold text-slate-800">
              Billing & Inventory
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </header>

        <main className="p-4 md:p-8">
          <Outlet />
          
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                Data synchronization
                </span>

                <span className="text-xs text-slate-500">
                {syncing ? 'Syncing...' : navigator.onLine ? 'Online' : 'Offline'}
                </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
                {pendingCount} pending change{pendingCount === 1 ? '' : 's'}
            </p>

            {syncError && (
                <p role="alert" className="mt-2 break-words text-xs text-red-600">
                Sync failed: {syncError}
                </p>
            )}

            {navigator.onLine && pendingCount > 0 && (
                <button
                type="button"
                onClick={() => void syncNow()}
                disabled={syncing}
                className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                {syncing ? 'Synchronizing...' : 'Sync Now'}
                </button>
            )}
            </div>
        </main>
        
      </div>
    </div>
  )
}
