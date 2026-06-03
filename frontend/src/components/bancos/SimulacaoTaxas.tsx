import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calculator, CheckCircle } from 'lucide-react'

const LINHAS = [
  { id: 'pronaf_b',  label: 'PRONAF B / Agroamigo',      taxa: 0.005,  carencia: 12, prazo_max: 36 },
  { id: 'pronaf',    label: 'PRONAF Custeio (demais)',    taxa: 0.04,   carencia: 12, prazo_max: 24 },
  { id: 'pronaf_m',  label: 'PRONAF Médio / Pequeno+',   taxa: 0.055,  carencia: 18, prazo_max: 36 },
  { id: 'fne_rural', label: 'FNE Rural / Demais Prod.',  taxa: 0.075,  carencia: 18, prazo_max: 60 },
  { id: 'fne_medio', label: 'FNE Rural Médio Empr.',     taxa: 0.085,  carencia: 24, prazo_max: 84 },
]

function pmt(pv: number, rAA: number, n: number): number {
  if (!pv || !n) return 0
  if (rAA === 0) return pv / n
  const r = rAA / 12
  return (pv * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  concluida: boolean
  onToggle: (v: boolean) => void
}

export function SimulacaoTaxas({ concluida, onToggle }: Props) {
  const [valor, setValor] = useState('50000')
  const [prazo, setPrazo] = useState('24')

  const pv = parseFloat(valor.replace(/\D/g, '')) || 0
  const n  = parseInt(prazo) || 0

  const results = useMemo(() => LINHAS.map(l => {
    const parcela = pmt(pv, l.taxa, n)
    const total   = parcela * n
    const juros   = total - pv
    return { ...l, parcela, total, juros, viavel: n <= l.prazo_max }
  }), [pv, n])

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
        <Calculator className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Simulação estimada com base nas taxas nominais vigentes. Consulte o BNB para condições exatas e atualizadas.</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Valor financiado (R$)</Label>
          <Input
            type="number"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="50000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Prazo de reembolso (meses)</Label>
          <Input
            type="number"
            value={prazo}
            onChange={e => setPrazo(e.target.value)}
            placeholder="24"
          />
        </div>
      </div>

      {pv > 0 && n > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-100">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {['Linha de Crédito','Taxa a.a.','Parcela Mensal','Total Pago','Juros Totais','Carência'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className={`border-t border-zinc-50 ${!r.viavel ? 'opacity-40' : 'hover:bg-zinc-50/50'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{r.label}</p>
                    {!r.viavel && <p className="text-[10px] text-red-400">Prazo máx: {r.prazo_max} meses</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">
                    {(r.taxa * 100).toFixed(2).replace('.', ',')}%
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900 tabular-nums">
                    {r.viavel ? fmt(r.parcela) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">
                    {r.viavel ? fmt(r.total) : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={r.viavel ? 'text-red-500' : ''}>
                      {r.viavel ? fmt(r.juros) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 tabular-nums">{r.carencia} meses</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(!pv || !n) && (
        <div className="flex items-center justify-center py-6 text-sm text-zinc-300">
          Preencha o valor e prazo para simular
        </div>
      )}

      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${concluida ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="flex items-center gap-2">
          <CheckCircle className={`h-4 w-4 ${concluida ? 'text-emerald-500' : 'text-zinc-300'}`} />
          <span className={`text-sm font-medium ${concluida ? 'text-emerald-700' : 'text-zinc-500'}`}>
            {concluida ? 'Simulação marcada como concluída' : 'Marcar simulação como concluída'}
          </span>
        </div>
        <Button
          size="sm"
          variant={concluida ? 'outline' : 'default'}
          onClick={() => onToggle(!concluida)}
        >
          {concluida ? 'Desfazer' : 'Marcar concluída'}
        </Button>
      </div>
    </div>
  )
}
