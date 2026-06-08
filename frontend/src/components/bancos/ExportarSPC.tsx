import { useState } from 'react'
import {
  Download, CheckCircle, FileCode2, ChevronDown, ChevronUp,
  User, MapPin, Briefcase, Package, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import type { Cliente, Projeto } from '@/types'

interface Props {
  projeto: Projeto
  cliente: Cliente
  gerado: boolean
  onToggleGerado: (v: boolean) => void
}

interface SpcExtra {
  nome_fazenda: string
  area_total: string
  area_aproveitavel: string
  car: string
  nirf: string
  matricula: string
  cartorio: string
  objetivo_projeto: string
  memoria_tecnica: string
  localizacao: string
  data_inicio: string
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
      <span className="text-sm text-zinc-700">{value}</span>
    </div>
  )
}

function Section({
  icon: Icon, title, children, defaultOpen = false,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-zinc-100 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <Icon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span className="text-xs font-semibold text-zinc-600 flex-1">{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

function Textarea({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-300 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </div>
  )
}

function Input({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </div>
  )
}

const EMPTY: SpcExtra = {
  nome_fazenda: '', area_total: '', area_aproveitavel: '',
  car: '', nirf: '', matricula: '', cartorio: '',
  objetivo_projeto: '', memoria_tecnica: '', localizacao: '',
  data_inicio: '',
}

export function ExportarSPC({ projeto, cliente, gerado, onToggleGerado }: Props) {
  const [extra, setExtra] = useState<SpcExtra>(EMPTY)
  const [downloading, setDownloading] = useState(false)
  const d = projeto.dados

  const set = (k: keyof SpcExtra) => (v: string) => setExtra(prev => ({ ...prev, [k]: v }))

  const handleDownload = async () => {
    if (!d) return
    setDownloading(true)
    try {
      const payload = {
        ...d,
        ...extra,
        items: [
          ...(d.free_items ?? []).map((it, idx) => ({
            sq_ivs: idx + 1,
            discriminacao: it.discriminacao,
            quantidade: it.quantidade || '1',
            unidade: it.unidade || 'und',
            preco: it.preco || '0',
            rec_prop: it.rec_prop || '0',
          })),
        ],
      }
      const res = await fetch('/api/gerar-spc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      a.download = m ? m[1].replace(/['"]/g, '') : 'proposta.SPC'
      a.href = url
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast('Arquivo SPC gerado com sucesso!')
      if (!gerado) onToggleGerado(true)
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setDownloading(false)
    }
  }

  if (!d) {
    return (
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-8 text-center">
        <FileCode2 className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-sm text-zinc-500 font-medium">Proposta técnica não preenchida</p>
        <p className="text-xs text-zinc-400 mt-1">Preencha a proposta nas etapas anteriores para gerar o SPC.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Pre-filled: Beneficiário */}
      <Section icon={User} title="Dados do Beneficiário" defaultOpen>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Nome" value={d.nome_cliente} />
          <Field label="CPF / CNPJ" value={d.cpf_cnpj_cliente} />
          <Field label="Telefone" value={d.telefone_cliente} />
          <Field label="Município / UF" value={d.municipio_uf} />
          <Field label="Endereço" value={[d.endereco, d.numero, d.bairro].filter(Boolean).join(', ')} />
          {d.complemento && <Field label="Complemento" value={d.complemento} />}
        </div>
      </Section>

      {/* Pre-filled: Elaborador */}
      <Section icon={Briefcase} title="Dados do Elaborador">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Elaborador" value={d.cliente_elaborador} />
          <Field label="CPF / CNPJ" value={d.cpf_cnpj_elaborador} />
          <Field label="Empresa" value={d.empresa_elaborador} />
          <Field label="Técnico Responsável" value={d.tecnico_responsavel} />
          <Field label="CREA" value={d.crea} />
          <Field label="Telefone" value={d.telefone_elaborador} />
        </div>
      </Section>

      {/* Pre-filled: Contrato */}
      <Section icon={FileText} title="Dados do Contrato">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Agência" value={d.agencia} />
          <Field label="Programa" value={d.programa_credito} />
          <Field label="Finalidade" value={d.finalidade_credito} />
          <Field label="Atividade Principal" value={d.atividade_principal} />
          <Field label="Prazo" value={d.prazo_meses ? `${d.prazo_meses} meses` : undefined} />
          <Field label="Carência" value={d.carencia_meses ? `${d.carencia_meses} meses` : undefined} />
          <Field label="Encargos a.a." value={d.encargos_ao_ano ? `${d.encargos_ao_ano}%` : undefined} />
          <Field label="Periodicidade" value={d.periodicidade_reembolso} />
        </div>
      </Section>

      {/* Pre-filled: Itens */}
      {(d.free_items ?? []).length > 0 && (
        <Section icon={Package} title={`Itens Financiados (${d.free_items!.length})`}>
          <div className="space-y-1">
            {d.free_items!.map((it, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-zinc-50 last:border-0">
                <span className="text-[10px] font-bold text-zinc-300 w-4 shrink-0">{i + 1}</span>
                <span className="text-sm text-zinc-700 flex-1">{it.discriminacao}</span>
                <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                  {it.quantidade} {it.unidade} × R$ {it.preco}
                </span>
                <span className="text-[10px] text-zinc-400 shrink-0">
                  {it.rec_prop ? `${it.rec_prop}% próprio` : ''}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* New: Imóvel Rural */}
      <Section icon={MapPin} title="Dados do Imóvel Rural" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Nome da Fazenda / Imóvel" value={extra.nome_fazenda} onChange={set('nome_fazenda')} placeholder="Ex: Fazenda Boa Vista" />
          </div>
          <Input label="Área Total (ha)" value={extra.area_total} onChange={set('area_total')} type="number" placeholder="0,00" />
          <Input label="Área Aproveitável (ha)" value={extra.area_aproveitavel} onChange={set('area_aproveitavel')} type="number" placeholder="0,00" />
          <Input label="CAR" value={extra.car} onChange={set('car')} placeholder="Cód. Ambiental Rural" />
          <Input label="NIRF" value={extra.nirf} onChange={set('nirf')} placeholder="Nº Imóvel Receita Federal" />
          <Input label="Matrícula" value={extra.matricula} onChange={set('matricula')} placeholder="Nº de matrícula" />
          <Input label="Cartório" value={extra.cartorio} onChange={set('cartorio')} placeholder="Nome do cartório" />
          <Input label="Data de Início do Investimento" value={extra.data_inicio} onChange={set('data_inicio')} type="date" />
        </div>
      </Section>

      {/* New: Textos do Projeto */}
      <Section icon={FileText} title="Textos do Projeto" defaultOpen>
        <div className="space-y-3">
          <Textarea
            label="Objetivo do Projeto"
            value={extra.objetivo_projeto}
            onChange={set('objetivo_projeto')}
            placeholder="Descreva o objetivo principal do projeto…"
            rows={4}
          />
          <Textarea
            label="Memória de Cálculo / Tecnologia Adotada"
            value={extra.memoria_tecnica}
            onChange={set('memoria_tecnica')}
            placeholder="Descreva a tecnologia e metodologia adotada…"
            rows={4}
          />
          <Textarea
            label="Localização e Descrição do Imóvel"
            value={extra.localizacao}
            onChange={set('localizacao')}
            placeholder="Descreva a localização e características do imóvel…"
            rows={3}
          />
        </div>
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 gap-3">
        <div className="flex items-center gap-2">
          {gerado
            ? <CheckCircle className="h-4 w-4 text-emerald-500" />
            : <FileCode2 className="h-4 w-4 text-zinc-400" />}
          <div>
            <p className={`text-sm font-medium ${gerado ? 'text-emerald-700' : 'text-zinc-600'}`}>
              {gerado ? 'SPC gerado anteriormente' : 'SPC ainda não gerado'}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Preencha os campos acima e clique em Gerar SPC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {gerado && (
            <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => onToggleGerado(false)}>
              Desfazer
            </Button>
          )}
          <Button size="sm" onClick={handleDownload} disabled={downloading || !d}>
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Gerando…' : 'Gerar SPC'}
          </Button>
        </div>
      </div>

    </div>
  )
}
