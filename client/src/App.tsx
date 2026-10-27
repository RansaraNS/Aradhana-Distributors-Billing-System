
import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './services/supabase'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Login from './pages/Login'
import Placeholder from './pages/Placeholder'
import CreateInvoice from './pages/CreateInvoice'
import InvoiceHistory from './pages/InvoiceHistory'

function AuthenticatedApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setChecking(false)
      }
    })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setChecking(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Checking your session...
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="items" element={<Items />} />
        <Route path="invoices/new" element={<CreateInvoice />} />
        <Route path="invoices" element={<InvoiceHistory />} />
        <Route
          path="settings"
          element={
            <Placeholder
              title="Settings"
              description="Configure your business and printer."
            />
          }
        />
        <Route
          path="*"
          element={
            <Placeholder
              title="Page Not Found"
              description="The requested page does not exist."
            />
          }
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  )
}