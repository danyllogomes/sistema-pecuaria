import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function StepCard({ icon, title, badge, children }: { icon: ReactNode; title: string; badge?: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-50">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">{icon}</div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {badge && <span className="ml-auto text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="col-span-12 flex items-center gap-3 my-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  )
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-3">{children}</div>
}

export function Field({ label, span, children, error }: { label: string; span: number; children: ReactNode; error?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1.5', `col-span-${span}`, 'max-sm:col-span-12')}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">Campo obrigatório</p>}
    </div>
  )
}

export function RadioGroup({ name, value, onChange, options }: { name: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <label key={opt} className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors',
          value === opt ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
        )}>
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
          {opt}
        </label>
      ))}
    </div>
  )
}

export function InfoBox({ children }: { children: ReactNode }) {
  return <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">{children}</div>
}
