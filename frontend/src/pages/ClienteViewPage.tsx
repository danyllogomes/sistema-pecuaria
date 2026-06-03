import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, MapPin, Phone, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreProjetos } from '@/components/bancos/PreProjetos'
import { SimulacaoTaxas } from '@/components/bancos/SimulacaoTaxas'
import { EnvioProjetos } from '@/components/bancos/EnvioProjetos'
import { WizardModal } from '@/components/wizard/WizardModal'
import { useWizardStore } from '@/store/wizardStore'
import { useReference } from '@/hooks/useReference'
import { sbH } from '@/lib/supabaseInternal'
import type { Cliente, MinhaInfo } from '@/types'
import { cn } from '@/lib/utils'

const URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co'

type StageId = 'pre' | 'sim' | 'envio'

const STAGES: { id: StageId; num: number; label: string; sublabel: string }[] = [
  { id: 'pre',   num: 1, label: 'Pré Projetos',       sublabel: 'Documentação e elegibilidade' },
  { id: 'sim',   num: 2, label: 'Simulação de Taxas', sublabel: 'Comparativo de linhas de crédito' },
  { id: 'envio', num: 3, label: 'Envio dos Projetos', sublabel: 'Geração e histórico de propostas' },
]

const BANKS = [
  { id: 'bnb',     name: 'BNB',            full: 'Banco do Nordeste do Brasil', available: true,  color: 'bg-emerald-600', initial: 'B' },
  { id: 'brad',    name: 'Bradesco',        full: 'Banco Bradesco S.A.',         available: false, color: 'bg-red-600',     initial: 'B' },
  { id: 'caixa',   name: 'Caixa Econômica', full: 'Caixa Econômica Federal',     available: false, color: 'bg-blue-700',    initial: 'C' },
  { id: 'bb',      name: 'Banco do Brasil', full: 'Banco do Brasil S.A.',        available: false, color: 'bg-yellow-500',  initial: 'B' },
  { id: 'sicredi', name: 'Sicredi',         full: 'Cooperativa Sicredi',         available: false, color: 'bg-green-700',   initial: 'S' },
]

interface Props { minhaInfo: MinhaInfo | null }

export function ClienteViewPage({ minhaInfo }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeBank, setActiveBank] = useState<string | null>('bnb')
  const [activeStage, setActiveStage] = useState<StageId>('pre')
  const { open } = useWizardStore()
  const { ref } = useReference()

  useEffect(() => {
    if (!id) return
    fetch(`${URL}/rest/v1/clientes?id=eq.${id}&select=*`, { headers: sbH })
      .then(r => r.json())
      .then(data => { setCliente(data[0] ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-sm text-zinc-400">
      <div className="h-5 w-5 rounded-full border-2 border-zinc-200 border-t-zinc-700 animate-spin mr-3" />
      Carregando…
    </div>
  )

  if (!cliente) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-sm text-zinc-500">Cliente não encontrado.</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/clientes')}>← Voltar</Button>
    </div>
  )

  const activeBankData = BANKS.find(b => b.id === activeBank)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-8 py-5 shrink-0">
        <button
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Clientes
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{cliente.nome}</h1>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-xs text-zinc-400 tabular-nums">{cliente.cpf_cnpj}</span>
              {cliente.municipio_uf && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="h-3 w-3" />{cliente.municipio_uf}
                </span>
              )}
              {cliente.telefone && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Phone className="h-3 w-3" />{cliente.telefone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: banks */}
        <aside className="w-64 shrink-0 bg-zinc-50 border-r border-zinc-100 flex flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b border-zinc-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Instituições Financeiras</p>
          </div>
          <nav className="p-3 flex flex-col gap-1.5">
            {BANKS.map(bank => (
              <button
                key={bank.id}
                onClick={() => bank.available && setActiveBank(bank.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  bank.available ? 'cursor-pointer' : 'cursor-default opacity-60',
                  activeBank === bank.id && bank.available
                    ? 'bg-white shadow-sm border border-zinc-200'
                    : bank.available ? 'hover:bg-white hover:shadow-sm' : ''
                )}
              >
                <div className={`h-8 w-8 rounded-lg ${bank.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {bank.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 truncate">{bank.name}</p>
                  {bank.available
                    ? <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" />Disponível</p>
                    : <p className="text-[10px] text-zinc-400 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Em construção</p>}
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {activeBank === 'bnb' && (
            <div className="p-8 flex flex-col gap-6">
              {/* Bank header */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg font-bold shrink-0">B</div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900">BNB — Banco do Nordeste do Brasil</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Selecione uma etapa do processo de financiamento</p>
                </div>
              </div>

              {/* Stage tabs */}
              <div className="grid grid-cols-3 gap-3">
                {STAGES.map(stage => (
                  <button
                    key={stage.id}
                    onClick={() => setActiveStage(stage.id)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 rounded-xl border-2 px-4 py-4 text-left transition-all',
                      activeStage === stage.id
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                        : 'border-zinc-100 bg-white hover:border-zinc-300 text-zinc-700'
                    )}
                  >
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      activeStage === stage.id ? 'bg-white text-zinc-900' : 'bg-zinc-100 text-zinc-600'
                    )}>
                      {stage.num}
                    </span>
                    <span className="text-sm font-semibold leading-tight">{stage.label}</span>
                    <span className={cn('text-[11px] leading-tight', activeStage === stage.id ? 'text-zinc-400' : 'text-zinc-400')}>
                      {stage.sublabel}
                    </span>
                  </button>
                ))}
              </div>

              {/* Stage content */}
              <div className="bg-white rounded-xl border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {STAGES.find(s => s.id === activeStage)?.label}
                    </p>
                    <p className="text-xs text-zinc-400">{STAGES.find(s => s.id === activeStage)?.sublabel}</p>
                  </div>
                </div>
                <div className="p-6">
                  {activeStage === 'pre'   && <PreProjetos clienteId={cliente.id} />}
                  {activeStage === 'sim'   && <SimulacaoTaxas />}
                  {activeStage === 'envio' && <EnvioProjetos cliente={cliente} minhaInfo={minhaInfo} />}
                </div>
              </div>
            </div>
          )}

          {/* Em construção (other banks) */}
          {activeBank && activeBank !== 'bnb' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className={`h-16 w-16 rounded-2xl ${activeBankData?.color} flex items-center justify-center text-white text-2xl font-bold`}>
                {activeBankData?.initial}
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-800">{activeBankData?.name}</h2>
                <p className="text-sm text-zinc-500 mt-1">{activeBankData?.full}</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-amber-700 text-sm">
                <Clock className="h-4 w-4" />
                Integração em construção — disponível em breve
              </div>
              <p className="text-xs text-zinc-400 max-w-xs">
                Estamos trabalhando para integrar esta instituição ao sistema. Em breve você poderá gerenciar projetos de financiamento {activeBankData?.name} aqui.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Wizard modal */}
      {open && <WizardModal refData={ref} />}
    </div>
  )
}
