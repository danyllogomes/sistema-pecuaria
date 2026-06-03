import { Input } from '@/components/ui/input'
import { StepCard, InfoBox } from './shared'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardFormData, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

const ITEMS = [
  ['milho','Milho (60 kg)'],['torta','Torta de algodão'],['soja','Soja (50 kg)'],
  ['vacinas','Vacinas e Med.'],['racao_conc','Ração Concentrada'],['sal_mineral','Sal Mineral'],
  ['livre_1','Item adicional 1'],['livre_2','Item adicional 2'],['livre_3','Item adicional 3'],
  ['livre_4','Item adicional 4'],['livre_5','Item adicional 5'],['mao_obra','Mão de Obra'],['assessoria','Assessoria'],
] as const

export function Step6({ data, set }: Props) {
  const updateCron = (item: string, p: string, v: string) =>
    set({ cronograma: { ...data.cronograma, [item]: { ...data.cronograma[item], [p]: v } } })

  const total = (p: string) => ITEMS.reduce((acc, [key]) => acc + parseFloat(data.cronograma[key]?.[p as keyof typeof data.cronograma[string]] || '0'), 0)

  const TH = 'text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400 py-2 px-3'

  return (
    <StepCard icon={<Calendar className="h-4 w-4" />} title="Cronograma de Desembolsos">
      <InfoBox>Informe as datas (MM/AAAA) e distribua os percentuais por parcela. A soma por item deve ser 100%.</InfoBox>
      <div className="overflow-x-auto rounded-lg border border-zinc-100">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 py-2 px-3 w-40">Item</th>
              {['1','2','3','4'].map(p => <th key={p} className={TH}>Parcela {p}</th>)}
            </tr>
            <tr className="bg-emerald-50/50">
              <td className="px-3 py-1.5 text-xs text-zinc-500">Data (MM/AAAA)</td>
              {['1','2','3','4'].map(p => (
                <td key={p} className="px-2 py-1.5 text-center">
                  <Input value={(data as unknown as Record<string, string>)[`data_parcela_${p}`]} onChange={e => set({ [`data_parcela_${p}`]: e.target.value } as Partial<WizardFormData>)} placeholder="MM/AAAA" maxLength={7} className="h-7 w-24 mx-auto text-center text-xs" />
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {ITEMS.map(([key, label]) => (
              <tr key={key} className="hover:bg-zinc-50/50 border-b border-zinc-50">
                <td className="px-3 py-1.5 text-zinc-500 truncate max-w-[10rem]">{label}</td>
                {['p1','p2','p3','p4'].map(p => (
                  <td key={p} className="px-2 py-1.5 text-center">
                    <Input type="number" value={data.cronograma[key]?.[p as keyof typeof data.cronograma[string]] || ''} onChange={e => updateCron(key, p, e.target.value)} className="h-7 w-16 mx-auto text-center text-xs" placeholder="0" />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-zinc-50 font-semibold">
              <td className="px-3 py-2 text-xs text-zinc-600">TOTAL (%)</td>
              {['p1','p2','p3','p4'].map(p => {
                const t = total(p)
                return (
                  <td key={p} className="px-2 py-2 text-center">
                    <span className={cn('text-xs font-bold', Math.abs(t - 100) < 0.1 ? 'text-emerald-600' : t > 0 ? 'text-amber-500' : 'text-zinc-300')}>
                      {t > 0 ? `${t.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </StepCard>
  )
}
