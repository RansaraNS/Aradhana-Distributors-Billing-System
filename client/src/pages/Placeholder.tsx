
import { Construction } from 'lucide-react'

interface PlaceholderProps {
  title: string
  description: string
}

export default function Placeholder({
  title,
  description,
}: PlaceholderProps) {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <Construction className="mx-auto text-emerald-600" size={36} />
      <h2 className="mt-4 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {description}
      </p>
      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-400">
        Planned feature
      </p>
    </section>
  )
}
