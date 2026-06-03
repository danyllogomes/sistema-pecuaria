import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { WizardProgress } from './WizardProgress'
import { Step1 } from './steps/Step1'
import { Step2 } from './steps/Step2'
import { Step3 } from './steps/Step3'
import { Step4 } from './steps/Step4'
import { Step5 } from './steps/Step5'
import { Step6 } from './steps/Step6'
import { Step7 } from './steps/Step7'
import { Step8 } from './steps/Step8'
import { useWizardStore } from '@/store/wizardStore'
import { createProjeto, updateProjetoDados, getProjetos } from '@/lib/supabase'
import type { ReferenceData } from '@/types'

const REQUIRED: Record<number, string[]> = {
  1: ['nome_cliente', 'cpf_cnpj_cliente', 'municipio_uf'],
  2: ['empresa_elaborador', 'tecnico_responsavel'],
  3: ['agencia', 'programa_credito', 'finalidade_credito', 'atividade_principal'],
}

export function WizardModal({ refData }: { refData: ReferenceData | null }) {
  const { open, currentStep, currentCliente, currentProjetoId, formData, setStep, patch, close } = useWizardStore()
  const [errors, setErrors] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [currentProjetoIdLocal, setCurrentProjetoIdLocal] = useState<string | null>(null)

  const projetoId = currentProjetoId ?? currentProjetoIdLocal

  const validate = (step: number) => {
    const required = REQUIRED[step] ?? []
    const fd = formData as unknown as Record<string, string>
    const missing = required.filter(k => !String(fd[k] ?? '').trim())
    setErrors(missing as string[])
    if (missing.length) toast('Preencha os campos obrigatórios.', 'destructive')
    return !missing.length
  }

  const next = () => { if (validate(currentStep)) setStep(Math.min(8, currentStep + 1)) }
  const prev = () => { setErrors([]); setStep(Math.max(1, currentStep - 1)) }
  const goTo = (n: number) => { setErrors([]); setStep(n) }

  const generate = async () => {
    setGenerating(true)
    try {
      const dados = { ...formData, _step: currentStep }
      const res = await fetch('/api/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      a.download = m ? m[1].replace(/['"]/g, '') : 'proposta.xlsm'
      a.href = url; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      // Save project
      if (currentCliente) {
        if (projetoId) {
          await updateProjetoDados(projetoId, dados)
        } else {
          const existing = await getProjetos(currentCliente.id)
          const proj = await createProjeto(currentCliente.id, `Proposta #${existing.length + 1}`, dados)
          setCurrentProjetoIdLocal(proj.id)
        }
      }
      toast('Planilha gerada com sucesso!')
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setGenerating(false)
    }
  }

  if (!open) return null

  const stepProps = { data: formData, set: patch, errors, ref: refData }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-50 rounded-2xl w-full max-w-4xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-100 shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Projeto BNB</p>
            <p className="text-sm font-semibold text-zinc-900">{currentCliente?.nome}</p>
          </div>
          <button onClick={close} className="rounded-lg p-1.5 hover:bg-zinc-100 transition-colors"><X className="h-4 w-4 text-zinc-500" /></button>
        </div>

        {/* Progress */}
        <WizardProgress current={currentStep} onGo={goTo} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && <Step1 {...stepProps} />}
          {currentStep === 2 && <Step2 {...stepProps} />}
          {currentStep === 3 && <Step3 {...stepProps} />}
          {currentStep === 4 && <Step4 {...stepProps} />}
          {currentStep === 5 && <Step5 {...stepProps} />}
          {currentStep === 6 && <Step6 {...stepProps} />}
          {currentStep === 7 && <Step7 {...stepProps} />}
          {currentStep === 8 && <Step8 data={formData} />}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-zinc-100 shrink-0">
          <span className="text-xs text-zinc-400 font-medium">Passo {currentStep} de 8</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prev} disabled={currentStep === 1}>← Anterior</Button>
            {currentStep < 8
              ? <Button size="sm" onClick={next}>Próximo →</Button>
              : <Button size="sm" variant="success" onClick={generate} disabled={generating}>
                  <Download className="h-4 w-4" />
                  {generating ? 'Gerando…' : 'Baixar .xlsm'}
                </Button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
