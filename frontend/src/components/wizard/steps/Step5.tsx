import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { StepCard, InfoBox } from './shared'
import { DollarSign } from 'lucide-react'
import type { WizardFormData, FreeItem, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

const PRE = [
  ['preco_milho','rec_prop_milho','Milho (saco 60 kg)'],
  ['preco_torta','rec_prop_torta','Torta de algodão (saco 50 kg)'],
  ['preco_soja','rec_prop_soja','Soja (saco 50 kg)'],
  ['preco_vacinas','rec_prop_vacinas','Vacinas e Medicamentos'],
  ['preco_racao_conc','rec_prop_racao_conc','Ração Concentrada'],
  ['preco_sal_mineral','rec_prop_sal_mineral','Sal Mineral'],
] as const

const TH = 'text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 py-2 px-2'
const TD = 'px-2 py-1.5 text-sm text-zinc-600 border-b border-zinc-50'

export function Step5({ data, set, ref: refData }: Props) {
  const f = (k: keyof WizardFormData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value })

  const updateFree = (i: number, field: keyof FreeItem, value: string) => {
    const items = [...data.free_items]
    items[i] = { ...items[i], [field]: value }
    set({ free_items: items })
  }

  return (
    <StepCard icon={<DollarSign className="h-4 w-4" />} title="Itens Financiados" badge="Valores unitários">
      <InfoBox>As quantidades são calculadas pela planilha. Informe apenas <strong>Valor Unitário</strong> e <strong>Recurso Próprio</strong>.</InfoBox>

      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Itens Pré-definidos</p>
      <div className="overflow-x-auto mb-5 rounded-lg border border-zinc-100">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50"><tr>
            <th className={`${TH} w-1/2`}>Item</th>
            <th className={`${TH} text-right`}>Vr. Unitário (R$)</th>
            <th className={`${TH} text-right`}>Rec. Próprio (R$)</th>
          </tr></thead>
          <tbody>
            {PRE.map(([pk, rk, label]) => (
              <tr key={pk} className="hover:bg-zinc-50/50">
                <td className={`${TD} text-zinc-500 italic`}>{label}</td>
                <td className={TD}><Input type="number" value={data[pk]} onChange={f(pk)} className="text-right h-7" placeholder="0,00" /></td>
                <td className={TD}><Input type="number" value={data[rk]} onChange={f(rk)} className="text-right h-7" placeholder="0,00" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Itens Adicionais (até 5)</p>
      <div className="overflow-x-auto mb-5 rounded-lg border border-zinc-100">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50"><tr>
            <th className={TH}>Discriminação</th><th className={TH}>Área</th><th className={TH}>Insumo</th>
            <th className={TH}>Qtde</th><th className={TH}>Unid.</th><th className={TH}>Uso</th>
            <th className={`${TH} text-right`}>Preço</th><th className={`${TH} text-right`}>Rec. Pr.</th>
          </tr></thead>
          <tbody>
            {data.free_items.map((item, i) => (
              <tr key={i} className="hover:bg-zinc-50/50">
                <td className={TD}><Input value={item.discriminacao} onChange={e => updateFree(i,'discriminacao',e.target.value)} className="h-7 min-w-28" placeholder="Descrição" /></td>
                <td className={TD}><Input type="number" value={item.area} onChange={e => updateFree(i,'area',e.target.value)} className="h-7 w-16" /></td>
                <td className={TD}>
                  <Select value={item.insumo} onValueChange={v => updateFree(i,'insumo',v)}>
                    <SelectTrigger className="h-7 w-16"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                  </Select>
                </td>
                <td className={TD}><Input type="number" value={item.quantidade} onChange={e => updateFree(i,'quantidade',e.target.value)} className="h-7 w-16" /></td>
                <td className={TD}>
                  <Input value={item.unidade} onChange={e => updateFree(i,'unidade',e.target.value)} list="wiz-unidades" className="h-7 w-16" />
                  <datalist id="wiz-unidades">{refData?.unidades.map(u => <option key={u.sigla} value={u.sigla}>{u.desc}</option>)}</datalist>
                </td>
                <td className={TD}>
                  <Select value={item.uso} onValueChange={v => updateFree(i,'uso',v)}>
                    <SelectTrigger className="h-7 min-w-28"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{refData?.usos.map(u => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className={TD}><Input type="number" value={item.preco} onChange={e => updateFree(i,'preco',e.target.value)} className="h-7 w-20 text-right" /></td>
                <td className={TD}><Input type="number" value={item.rec_prop} onChange={e => updateFree(i,'rec_prop',e.target.value)} className="h-7 w-20 text-right" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Mão de Obra e Assessoria</p>
      <div className="overflow-x-auto rounded-lg border border-zinc-100">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50"><tr>
            <th className={`${TH} w-1/2`}>Item</th>
            <th className={`${TH} text-right`}>Vr. Unitário (R$)</th>
            <th className={`${TH} text-right`}>Rec. Próprio (R$)</th>
          </tr></thead>
          <tbody>
            <tr><td className={TD}>Mão de Obra</td>
              <td className={TD}><Input type="number" value={data.preco_mao_obra} onChange={f('preco_mao_obra')} className="text-right h-7" /></td>
              <td className={TD}><Input type="number" value={data.rec_prop_mao_obra} onChange={f('rec_prop_mao_obra')} className="text-right h-7" /></td>
            </tr>
            <tr><td className={TD}>Assessoria Empresarial</td>
              <td className={TD}><div className="flex items-center gap-1"><Input type="number" value={data.assessoria_pct} onChange={f('assessoria_pct')} className="text-right h-7" placeholder="%" /><span className="text-xs text-zinc-400">%</span></div></td>
              <td className={TD}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </StepCard>
  )
}
