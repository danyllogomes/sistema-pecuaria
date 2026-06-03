import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StepCard, Field, Grid } from './shared'
import { User } from 'lucide-react'
import type { WizardFormData, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

export function Step1({ data, set, errors, ref }: Props) {
  const f = (k: keyof WizardFormData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value })
  const err = (k: string) => errors.includes(k)

  return (
    <StepCard icon={<User className="h-4 w-4" />} title="Dados do Cliente">
      <Grid>
        <Field label="Nome / Razão Social *" span={8} error={err('nome_cliente')}>
          <Input value={data.nome_cliente} onChange={f('nome_cliente')} placeholder="Nome completo ou razão social" className={err('nome_cliente') ? 'border-red-400' : ''} />
        </Field>
        <Field label="CPF / CNPJ *" span={4} error={err('cpf_cnpj_cliente')}>
          <Input value={data.cpf_cnpj_cliente} onChange={f('cpf_cnpj_cliente')} placeholder="000.000.000-00" className={err('cpf_cnpj_cliente') ? 'border-red-400' : ''} />
        </Field>
        <Field label="Telefone" span={4}>
          <Input value={data.telefone_cliente} onChange={f('telefone_cliente')} placeholder="(00) 00000-0000" />
        </Field>
        <Field label="Município-UF *" span={8} error={err('municipio_uf')}>
          <Input value={data.municipio_uf} onChange={f('municipio_uf')} list="wiz-municipios" placeholder="FORTALEZA CENTRO-CE" className={err('municipio_uf') ? 'border-red-400' : ''} />
          <datalist id="wiz-municipios">{ref?.municipios.slice(0,3000).map(m => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Endereço" span={8}>
          <Input value={data.endereco} onChange={f('endereco')} placeholder="Rua / Avenida / Sítio" />
        </Field>
        <Field label="Número" span={2}>
          <Input value={data.numero} onChange={f('numero')} placeholder="S/N" />
        </Field>
        <Field label="Bairro" span={2}>
          <Input value={data.bairro} onChange={f('bairro')} />
        </Field>
        <Field label="Complemento" span={4}>
          <Input value={data.complemento} onChange={f('complemento')} placeholder="Apto, sala…" />
        </Field>
      </Grid>
    </StepCard>
  )
}
