import { Input } from '@/components/ui/input'
import { StepCard, Field, Grid, RadioGroup } from './shared'
import { Building2 } from 'lucide-react'
import type { WizardFormData, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

export function Step2({ data, set, errors }: Props) {
  const f = (k: keyof WizardFormData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value })
  const err = (k: string) => errors.includes(k)
  return (
    <StepCard icon={<Building2 className="h-4 w-4" />} title="Dados do Elaborador">
      <Grid>
        <Field label="Cliente é Elaborador?" span={6}>
          <RadioGroup name="cliente_elaborador" value={data.cliente_elaborador} onChange={v => set({ cliente_elaborador: v })} options={['Sim','Não']} />
        </Field>
        <Field label="Data da Elaboração" span={6}>
          <Input value={data.data_elaboracao} onChange={f('data_elaboracao')} placeholder="DD/MM/AAAA" />
        </Field>
        <Field label="Empresa / Elaborador *" span={8} error={err('empresa_elaborador')}>
          <Input value={data.empresa_elaborador} onChange={f('empresa_elaborador')} placeholder="Nome da empresa ou elaborador" className={err('empresa_elaborador') ? 'border-red-400' : ''} />
        </Field>
        <Field label="CPF / CNPJ Elaborador" span={4}>
          <Input value={data.cpf_cnpj_elaborador} onChange={f('cpf_cnpj_elaborador')} placeholder="000.000.000-00" />
        </Field>
        <Field label="Técnico Responsável *" span={6} error={err('tecnico_responsavel')}>
          <Input value={data.tecnico_responsavel} onChange={f('tecnico_responsavel')} placeholder="Nome completo" className={err('tecnico_responsavel') ? 'border-red-400' : ''} />
        </Field>
        <Field label="CPF do Técnico" span={3}>
          <Input value={data.cpf_tecnico} onChange={f('cpf_tecnico')} placeholder="000.000.000-00" />
        </Field>
        <Field label="CREA / CRBio" span={3}>
          <Input value={data.crea} onChange={f('crea')} placeholder="00000-D/UF" />
        </Field>
        <Field label="Telefone Elaborador" span={4}>
          <Input value={data.telefone_elaborador} onChange={f('telefone_elaborador')} placeholder="(00) 00000-0000" />
        </Field>
      </Grid>
    </StepCard>
  )
}
