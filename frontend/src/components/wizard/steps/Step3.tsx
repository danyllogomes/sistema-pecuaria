import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { StepCard, Field, Grid, RadioGroup, SectionDivider } from './shared'
import { ClipboardList } from 'lucide-react'
import type { WizardFormData, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

export function Step3({ data, set, errors, ref }: Props) {
  const f = (k: keyof WizardFormData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value })
  const err = (k: string) => errors.includes(k)

  const handlePrograma = (v: string) => {
    set({ programa_credito: v })
    const found = ref?.programs.find(p => p.name === v)
    if (found?.group) set({ grupo: found.group })
  }

  return (
    <StepCard icon={<ClipboardList className="h-4 w-4" />} title="Configuração da Proposta">
      <Grid>
        <SectionDivider label="Agência e Grupo" />
        <Field label="Agência BNB *" span={6} error={err('agencia')}>
          <Input value={data.agencia} onChange={f('agencia')} list="wiz-agencias" placeholder="Comece a digitar…" className={err('agencia') ? 'border-red-400' : ''} />
          <datalist id="wiz-agencias">{ref?.agencies.map(a => <option key={a.name} value={a.name} />)}</datalist>
        </Field>
        <Field label="Categoria do Produtor" span={3}>
          <Select value={data.categ_produtor} onValueChange={v => set({ categ_produtor: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{ref?.categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Grupo" span={3}>
          <Select value={data.grupo} onValueChange={v => set({ grupo: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{ref?.grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <SectionDivider label="Programa e Finalidade" />
        <Field label="Programa de Crédito *" span={8} error={err('programa_credito')}>
          <Input value={data.programa_credito} onChange={e => handlePrograma(e.target.value)} list="wiz-programas" placeholder="Comece a digitar…" className={err('programa_credito') ? 'border-red-400' : ''} />
          <datalist id="wiz-programas">{ref?.programs.map(p => <option key={p.name} value={p.name} />)}</datalist>
        </Field>
        <Field label="Finalidade do Crédito *" span={4} error={err('finalidade_credito')}>
          <Select value={data.finalidade_credito} onValueChange={v => set({ finalidade_credito: v })}>
            <SelectTrigger className={err('finalidade_credito') ? 'border-red-400' : ''}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{ref?.finalidades.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Atividade Principal *" span={8} error={err('atividade_principal')}>
          <Input value={data.atividade_principal} onChange={f('atividade_principal')} list="wiz-atividades" placeholder="Comece a digitar…" className={err('atividade_principal') ? 'border-red-400' : ''} />
          <datalist id="wiz-atividades">{ref?.atividades.map(a => <option key={a.name} value={a.name} />)}</datalist>
        </Field>
        <Field label="Benef. Políticas Públicas" span={4}>
          <Select value={data.benef_politica_pub} onValueChange={v => set({ benef_politica_pub: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{ref?.beneficiarios.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <SectionDivider label="Perguntas Obrigatórias" />
        <Field label="Município em Emergência?" span={6}>
          <RadioGroup name="municipio_decreto" value={data.municipio_decreto} onChange={v => set({ municipio_decreto: v })} options={['Não','Sim']} />
        </Field>
        <Field label="Base Agroecológica?" span={6}>
          <RadioGroup name="base_agroecologica" value={data.base_agroecologica} onChange={v => set({ base_agroecologica: v })} options={['Não','Sim']} />
        </Field>
        <Field label="Planos Territoriais?" span={6}>
          <RadioGroup name="planos_territoriais" value={data.planos_territoriais} onChange={v => set({ planos_territoriais: v })} options={['Não','Sim']} />
        </Field>
        <Field label="Custeio Rotativo?" span={6}>
          <RadioGroup name="custeio_rotativo" value={data.custeio_rotativo} onChange={v => set({ custeio_rotativo: v })} options={['Não','Sim']} />
        </Field>
        <Field label="Valor Emergencial (R$)" span={4}>
          <Input type="number" value={data.valor_emergencial} onChange={f('valor_emergencial')} placeholder="0,00" />
        </Field>
      </Grid>
    </StepCard>
  )
}
