import { Input } from '@/components/ui/input'
import { StepCard, Field, Grid, SectionDivider } from './shared'
import { Beef } from 'lucide-react'
import type { WizardFormData, ReferenceData } from '@/types'

interface Props { data: WizardFormData; set: (p: Partial<WizardFormData>) => void; errors: string[]; ref: ReferenceData | null }

const BOV = [['reprod_bovinos','Reprodutores'],['matrizes_bovinos','Matrizes'],['novilhos','Novilhos(as)'],['novilhas_engorda','Novilhas (engorda)'],['garrotes','Garrotes'],['garrotas','Garrotas'],['bezerros','Bezerros(as)']] as const
const OVI = [['reprod_ovinos','Reprodutores'],['matrizes_ovinos','Matrizes'],['femeas_1_2_anos','Fêmeas 1–2 anos'],['machos_1_2_anos','Machos 1–2 anos'],['femeas_0_1_anos','Fêmeas 0–1 ano'],['machos_0_1_anos','Machos 0–1 ano']] as const

export function Step4({ data, set }: Props) {
  const f = (k: keyof WizardFormData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value })
  return (
    <StepCard icon={<Beef className="h-4 w-4" />} title="Atividades / Animais">
      <Grid>
        <SectionDivider label="Bovinocultura" />
        {BOV.map(([key, label]) => (
          <Field key={key} label={label} span={3}>
            <Input type="number" value={data[key]} onChange={f(key)} min={0} placeholder="0" />
          </Field>
        ))}
        <SectionDivider label="Ovino / Caprinocultura" />
        {OVI.map(([key, label]) => (
          <Field key={key} label={label} span={3}>
            <Input type="number" value={data[key]} onChange={f(key)} min={0} placeholder="0" />
          </Field>
        ))}
        <SectionDivider label="Ração" />
        <Field label="Necessidade de Ração (meses)" span={4}>
          <Input type="number" value={data.necessidade_racao_meses} onChange={f('necessidade_racao_meses')} min={0} max={12} placeholder="0" />
        </Field>
      </Grid>
    </StepCard>
  )
}
