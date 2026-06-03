import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { StepCard, Field, Grid, SectionDivider, InfoBox } from './shared'
import { TrendingUp } from 'lucide-react'
import type { WizardFormData, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

export function Step7({ data, set, ref: refData }: Props) {
  const f = (k: keyof WizardFormData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value })

  const updateRec = (type: 'receitas_bov' | 'receitas_ovi', i: number, v: string) => {
    const arr = [...data[type]]; arr[i] = v; set({ [type]: arr })
  }

  const TH = 'text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400 py-2 px-2'
  const TD = 'px-2 py-1.5 border-b border-zinc-50'

  return (
    <StepCard icon={<TrendingUp className="h-4 w-4" />} title="Receitas e Contrato">
      <SectionDivider label="Receitas Projetadas (R$)" />
      <InfoBox>Informe a receita bruta estimada por atividade para cada ano.</InfoBox>
      <div className="overflow-x-auto rounded-lg border border-zinc-100 mb-5">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50"><tr>
            <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 w-36">Atividade</th>
            {[1,2,3,4,5].map(n => <th key={n} className={TH}>Ano {n}</th>)}
          </tr></thead>
          <tbody>
            {(['receitas_bov','receitas_ovi'] as const).map((key, ri) => (
              <tr key={key} className="hover:bg-zinc-50/50">
                <td className={`${TD} text-zinc-600`}>{ri === 0 ? 'Bovinocultura' : 'Ovino/Caprinocultura'}</td>
                {[0,1,2,3,4].map(i => (
                  <td key={i} className={TD}>
                    <Input type="number" value={data[key][i]} onChange={e => updateRec(key, i, e.target.value)} className="text-right h-7" placeholder="0,00" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Grid>
        <SectionDivider label="Informações do Contrato" />
        <Field label="Prazo (meses)" span={3}><Input type="number" value={data.prazo_meses} onChange={f('prazo_meses')} placeholder="ex: 24" /></Field>
        <Field label="Carência (meses)" span={3}><Input type="number" value={data.carencia_meses} onChange={f('carencia_meses')} placeholder="ex: 12" /></Field>
        <Field label="Encargos (% a.a.)" span={3}><Input type="number" value={data.encargos_ao_ano} onChange={f('encargos_ao_ano')} placeholder="ex: 7.65" /></Field>
        <Field label="Periodicidade Reembolso" span={3}>
          <Select value={data.periodicidade_reembolso} onValueChange={v => set({ periodicidade_reembolso: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{refData?.periodicidades.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <SectionDivider label="Lactação (opcional)" />
        <Field label="Período de Lactação (dias)" span={4}><Input type="number" value={data.periodo_lactacao} onChange={f('periodo_lactacao')} placeholder="ex: 180" /></Field>
        <Field label="Produção Leite (Cab./dia)" span={4}><Input type="number" value={data.producao_leite} onChange={f('producao_leite')} placeholder="ex: 5.0" /></Field>
        <SectionDivider label="Comentários / Objetivos" />
        <div className="col-span-12 flex flex-col gap-1.5">
          <Textarea value={data.comentarios} onChange={e => set({ comentarios: e.target.value })} rows={4} placeholder="Objetivos do crédito, histórico da propriedade, justificativas…" />
        </div>
      </Grid>
    </StepCard>
  )
}
