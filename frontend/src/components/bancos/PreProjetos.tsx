import { CheckCircle2, Circle, FileText, AlertCircle } from 'lucide-react'

export const DOCS = [
  { id: 'rg_cpf',       label: 'RG e CPF do produtor (e cônjuge)', required: true },
  { id: 'residencia',   label: 'Comprovante de residência', required: true },
  { id: 'dap',          label: 'DAP/CAF – Declaração de Aptidão ao PRONAF', required: true },
  { id: 'ccir',         label: 'CCIR – Certificado de Cadastro de Imóvel Rural', required: true },
  { id: 'itr',          label: 'ITR – Imposto Territorial Rural (últimos 5 anos)', required: true },
  { id: 'matricula',    label: 'Matrícula do imóvel ou contrato de arrendamento', required: true },
  { id: 'cnd_federal',  label: 'Certidão Negativa de Débitos Federais', required: true },
  { id: 'cnd_trabalho', label: 'Certidão Negativa de Débitos Trabalhistas', required: true },
  { id: 'projeto',      label: 'Projeto técnico assinado pelo responsável (CREA/CRBio)', required: true },
  { id: 'fotos',        label: 'Fotos da propriedade e do plantel atual', required: false },
  { id: 'extratos',     label: 'Extratos bancários (últimos 3 meses)', required: false },
  { id: 'notas',        label: 'Notas fiscais de compras/vendas recentes', required: false },
]

const ELIGIBILITY = [
  'Ser produtor rural, individual ou coletivo',
  'Estar enquadrado em categoria PRONAF (Mini, Pequeno) ou Demais Produtores',
  'Possuir DAP/CAF válida (para PRONAF)',
  'Não ter débitos em aberto com o BNB ou SFN',
  'Atividade financiável dentro da área de atuação do BNB',
  'Imóvel rural regularizado ou contrato de arrendamento válido',
]

const REQUIRED_IDS = DOCS.filter(d => d.required).map(d => d.id)

interface Props {
  checklist: Record<string, boolean>
  onChange: (checklist: Record<string, boolean>, allRequiredComplete: boolean) => void
}

export function PreProjetos({ checklist, onChange }: Props) {
  const toggle = (id: string) => {
    const next = { ...checklist, [id]: !checklist[id] }
    const allRequired = REQUIRED_IDS.every(rid => next[rid])
    onChange(next, allRequired)
  }

  const done = DOCS.filter(d => checklist[d.id]).length
  const total = DOCS.length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-2 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-zinc-500 tabular-nums whitespace-nowrap">{done}/{total} documentos</span>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
          <FileText className="inline h-3 w-3 mr-1" />
          Documentação Necessária
        </p>
        <div className="space-y-1.5">
          {DOCS.map(doc => (
            <button
              key={doc.id}
              onClick={() => toggle(doc.id)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-50 transition-colors text-left group"
            >
              {checklist[doc.id]
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                : <Circle className="h-4 w-4 text-zinc-300 shrink-0 group-hover:text-zinc-400 transition-colors" />}
              <span className={`text-sm flex-1 ${checklist[doc.id] ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                {doc.label}
              </span>
              {doc.required
                ? <span className="text-[10px] font-semibold text-zinc-400 shrink-0">Obrigatório</span>
                : <span className="text-[10px] text-zinc-300 shrink-0">Opcional</span>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
          <AlertCircle className="inline h-3 w-3 mr-1" />
          Requisitos de Elegibilidade
        </p>
        <ul className="space-y-1.5">
          {ELIGIBILITY.map((req, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
              <span className="text-zinc-300 shrink-0 mt-0.5">•</span>
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
