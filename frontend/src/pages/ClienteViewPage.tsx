import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, MapPin, Phone, Building2, Clock,
  CheckCircle, FolderOpen, Landmark, X, Pencil, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreProjetos } from '@/components/bancos/PreProjetos'
import { SimulacaoTaxas } from '@/components/bancos/SimulacaoTaxas'
import { EnvioProjetos } from '@/components/bancos/EnvioProjetos'
import { WizardModal } from '@/components/wizard/WizardModal'
import { useWizardStore } from '@/store/wizardStore'
import { useReference } from '@/hooks/useReference'
import { sbH } from '@/lib/supabaseInternal'
import { getProjetos, updateProjetoBancos, updateProjetoNome, getProjeto } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Cliente, MinhaInfo, Projeto, BancoProgress } from '@/types'

type StageId = 'pre' | 'sim' | 'envio'

const STAGES: {
  id: StageId
  num: number
  label: string
  key: 'pre_projeto_completo' | 'simulacao_completa' | 'proposta_enviada'
}[] = [
  { id: 'pre',   num: 1, label: 'Pré-Projeto',       key: 'pre_projeto_completo' },
  { id: 'sim',   num: 2, label: 'Simulação de Taxas', key: 'simulacao_completa' },
  { id: 'envio', num: 3, label: 'Envio dos Projetos', key: 'proposta_enviada' },
]

const BANK_CONFIG: Record<string, { name: string; color: string; initial: string; available: boolean }> = {
  BNB:      { name: 'BNB',            color: 'bg-emerald-600', initial: 'B', available: true },
  Bradesco: { name: 'Bradesco',        color: 'bg-red-500',     initial: 'B', available: false },
  Caixa:    { name: 'Caixa',           color: 'bg-blue-700',    initial: 'C', available: false },
  BB:       { name: 'Banco do Brasil', color: 'bg-yellow-500',  initial: 'B', available: false },
  Sicredi:  { name: 'Sicredi',         color: 'bg-green-700',   initial: 'S', available: false },
}

const ALL_BANKS = ['BNB', 'Bradesco', 'Caixa', 'BB', 'Sicredi']

function calcProgresso(s: BancoProgress): number {
  const flags = [s.pre_projeto_completo, s.simulacao_completa, s.proposta_enviada]
  return Math.round((flags.filter(Boolean).length / flags.length) * 100)
}

function ProgressBar({ pct, inverted = false }: { pct: number; inverted?: boolean }) {
  return (
    <div className={`h-1.5 rounded-full overflow-hidden ${inverted ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
      <div
        className={cn('h-1.5 rounded-full transition-all duration-500', inverted ? 'bg-white' : 'bg-emerald-500')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

const SUPABASE_URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co'

interface Props { minhaInfo: MinhaInfo | null }

export function ClienteViewPage({ minhaInfo }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [selectedProjetoId, setSelectedProjetoId] = useState<string | null>(null)
  const [selectedBancoId, setSelectedBancoId] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<StageId>('pre')
  const [loading, setLoading] = useState(true)
  const [showAddBanco, setShowAddBanco] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingNomeId, setEditingNomeId] = useState<string | null>(null)
  const [editingNomeValue, setEditingNomeValue] = useState('')
  const { open, openNew } = useWizardStore()
  const { ref } = useReference()

  const selectedProjeto = projetos.find(p => p.id === selectedProjetoId) ?? null
  const activeBancoStatus = selectedBancoId && selectedProjeto
    ? (selectedProjeto.bancos_status?.[selectedBancoId] ?? null)
    : null

  const loadProjetos = useCallback(async (clienteId: string) => {
    const ps = await getProjetos(clienteId)
    setProjetos(ps)
    return ps
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${id}&select=*`, { headers: sbH })
      .then(r => r.json())
      .then(async data => {
        const cli = data[0] ?? null
        setCliente(cli)
        if (cli) {
          const ps = await loadProjetos(cli.id)
          if (ps.length > 0) setSelectedProjetoId(ps[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, loadProjetos])

  useEffect(() => {
    if (!open && cliente) {
      loadProjetos(cliente.id).then(ps => {
        setSelectedProjetoId(prev => {
          if (ps.length === 0) return null
          if (!prev || !ps.find(p => p.id === prev)) return ps[0].id
          return prev
        })
      })
    }
  }, [open, cliente, loadProjetos])

  const handleAddBanco = async (bancoId: string) => {
    if (!selectedProjeto || !cliente) return
    setSaving(true)
    try {
      const current = selectedProjeto.bancos_status ?? {}
      const updated = {
        ...current,
        [bancoId]: {
          pre_projeto_completo: false,
          simulacao_completa: false,
          proposta_enviada: false,
          checklist: {},
          adicionado_em: new Date().toISOString(),
        } as BancoProgress,
      }
      await updateProjetoBancos(selectedProjeto.id, updated)
      await loadProjetos(cliente.id)
      setSelectedBancoId(bancoId)
      setActiveStage('pre')
    } finally {
      setSaving(false)
      setShowAddBanco(false)
    }
  }

  const startEditNome = (projeto: Projeto, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingNomeId(projeto.id)
    setEditingNomeValue(projeto.nome)
  }

  const saveNome = async (projetoId: string) => {
    const nome = editingNomeValue.trim()
    if (!nome || !cliente) { setEditingNomeId(null); return }
    setSaving(true)
    try {
      await updateProjetoNome(projetoId, nome)
      await loadProjetos(cliente.id)
    } finally {
      setSaving(false)
      setEditingNomeId(null)
    }
  }

  const handleBancoUpdate = async (updates: Partial<BancoProgress>) => {
    if (!selectedProjeto || !selectedBancoId || !cliente) return
    setSaving(true)
    try {
      const current = selectedProjeto.bancos_status ?? {}
      const updated = {
        ...current,
        [selectedBancoId]: { ...current[selectedBancoId], ...updates },
      }
      await updateProjetoBancos(selectedProjeto.id, updated)
      await loadProjetos(cliente.id)
    } finally {
      setSaving(false)
    }
  }

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

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Project list */}
        <aside className="w-72 shrink-0 bg-zinc-50 border-r border-zinc-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Propostas ({projetos.length})
            </p>
            <Button size="sm" variant="outline" onClick={() => openNew(cliente, minhaInfo)}>
              <Plus className="h-3.5 w-3.5" />
              Nova
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {projetos.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
                <FolderOpen className="h-7 w-7 text-zinc-200" />
                <p className="text-xs text-zinc-400">Nenhuma proposta ainda.</p>
                <p className="text-[10px] text-zinc-300">Clique em "Nova" para iniciar.</p>
              </div>
            )}

            {projetos.map(projeto => {
              const bancosEntries = Object.entries(projeto.bancos_status ?? {})
              const isSelected = selectedProjetoId === projeto.id
              const isEditingNome = editingNomeId === projeto.id
              return (
                <div
                  key={projeto.id}
                  onClick={() => { if (!isEditingNome) { setSelectedProjetoId(projeto.id); setSelectedBancoId(null) } }}
                  className={cn(
                    'w-full text-left rounded-xl border px-3 py-3 transition-all cursor-pointer',
                    isSelected
                      ? 'bg-white border-zinc-300 shadow-sm'
                      : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
                  )}
                >
                  {/* Nome editável */}
                  <div className="flex items-center gap-1 group/nome">
                    {isEditingNome ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingNomeValue}
                          onChange={e => setEditingNomeValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveNome(projeto.id)
                            if (e.key === 'Escape') setEditingNomeId(null)
                          }}
                          onBlur={() => saveNome(projeto.id)}
                          className="flex-1 min-w-0 text-sm font-semibold text-zinc-800 bg-zinc-50 border border-zinc-300 rounded-md px-2 py-0.5 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-300"
                        />
                        <button
                          onMouseDown={e => { e.preventDefault(); saveNome(projeto.id) }}
                          className="shrink-0 p-0.5 rounded text-emerald-500 hover:bg-emerald-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onMouseDown={e => { e.preventDefault(); setEditingNomeId(null) }}
                          className="shrink-0 p-0.5 rounded text-zinc-400 hover:bg-zinc-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-zinc-800 truncate flex-1">{projeto.nome}</p>
                        <button
                          onClick={e => startEditNome(projeto, e)}
                          className="shrink-0 p-0.5 rounded text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 opacity-0 group-hover/nome:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(projeto.atualizado_em)}</p>

                  {bancosEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {bancosEntries.map(([bancoId, status]) => {
                        const pct = calcProgresso(status)
                        return (
                          <span
                            key={bancoId}
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                              pct === 100 ? 'bg-emerald-50 text-emerald-700' :
                              pct >= 50  ? 'bg-amber-50 text-amber-700' :
                                           'bg-zinc-100 text-zinc-500'
                            )}
                          >
                            {BANK_CONFIG[bancoId]?.name ?? bancoId}
                            <span className="opacity-70">{pct}%</span>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-300 mt-1.5 flex items-center gap-1">
                      <Building2 className="h-2.5 w-2.5" />
                      Nenhum banco vinculado
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* Right: Project detail */}
        <main className="flex-1 overflow-y-auto">
          {!selectedProjeto ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <Landmark className="h-10 w-10 text-zinc-200" />
              <p className="text-sm text-zinc-400">Selecione uma proposta para gerenciar os financiamentos</p>
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-5">
              {/* Project header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">{selectedProjeto.nome}</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedProjeto.dados
                      ? `Atualizado em ${formatDate(selectedProjeto.atualizado_em)}`
                      : 'Proposta técnica não preenchida'}
                  </p>
                </div>
                {saving && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-zinc-200 border-t-zinc-600 animate-spin" />
                    Salvando…
                  </div>
                )}
              </div>

              {/* Bank cards */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Instituições Financeiras
                </p>

                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {Object.entries(selectedProjeto.bancos_status ?? {}).map(([bancoId, status]) => {
                    const cfg = BANK_CONFIG[bancoId]
                    const pct = calcProgresso(status)
                    const isSelected = selectedBancoId === bancoId
                    return (
                      <button
                        key={bancoId}
                        onClick={() => {
                          setSelectedBancoId(isSelected ? null : bancoId)
                          setActiveStage('pre')
                        }}
                        className={cn(
                          'text-left rounded-xl border-2 p-4 transition-all',
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 shadow-md'
                            : 'border-zinc-100 bg-zinc-50 hover:border-zinc-300 hover:bg-white'
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0', cfg?.color ?? 'bg-zinc-500')}>
                            {cfg?.initial ?? bancoId[0]}
                          </div>
                          <span className={cn('text-sm font-bold tabular-nums', isSelected ? 'text-white' : 'text-zinc-700')}>
                            {pct}%
                          </span>
                        </div>
                        <p className={cn('text-sm font-semibold mb-2.5', isSelected ? 'text-white' : 'text-zinc-800')}>
                          {cfg?.name ?? bancoId}
                        </p>
                        <ProgressBar pct={pct} inverted={isSelected} />
                        <div className="flex flex-col gap-1.5 mt-3">
                          {STAGES.map(stage => (
                            <div key={stage.id} className="flex items-center gap-1.5">
                              {status[stage.key]
                                ? <CheckCircle className={cn('h-3 w-3 shrink-0', isSelected ? 'text-emerald-400' : 'text-emerald-500')} />
                                : <div className={cn('h-3 w-3 rounded-full border shrink-0', isSelected ? 'border-zinc-600' : 'border-zinc-300')} />}
                              <span className={cn('text-[10px]', isSelected ? 'text-zinc-400' : 'text-zinc-500')}>
                                {stage.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </button>
                    )
                  })}

                  {/* Add banco card */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAddBanco(v => !v)}
                      className="w-full min-h-[148px] h-full text-left rounded-xl border-2 border-dashed border-zinc-200 p-4 flex flex-col items-center justify-center gap-2 hover:border-zinc-400 hover:bg-zinc-50 transition-all"
                    >
                      <Plus className="h-5 w-5 text-zinc-300" />
                      <p className="text-xs text-zinc-400">Adicionar Banco</p>
                    </button>

                    {showAddBanco && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowAddBanco(false)} />
                        <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-zinc-100 py-1.5 w-56">
                          <div className="flex items-center justify-between px-3 pb-1.5 mb-0.5 border-b border-zinc-50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Selecionar banco</p>
                            <button onClick={() => setShowAddBanco(false)}>
                              <X className="h-3 w-3 text-zinc-400" />
                            </button>
                          </div>
                          {ALL_BANKS
                            .filter(b => !selectedProjeto.bancos_status?.[b])
                            .map(bancoId => {
                              const cfg = BANK_CONFIG[bancoId]
                              return (
                                <button
                                  key={bancoId}
                                  onClick={() => cfg?.available && handleAddBanco(bancoId)}
                                  disabled={!cfg?.available}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors',
                                    cfg?.available
                                      ? 'hover:bg-zinc-50 text-zinc-800'
                                      : 'text-zinc-300 cursor-default'
                                  )}
                                >
                                  <div className={cn('h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0', cfg?.available ? cfg.color : 'bg-zinc-200')}>
                                    {cfg?.initial ?? bancoId[0]}
                                  </div>
                                  <span className="flex-1 font-medium">{cfg?.name ?? bancoId}</span>
                                  {!cfg?.available && (
                                    <span className="flex items-center gap-1 text-[10px] text-zinc-300">
                                      <Clock className="h-2.5 w-2.5" />Em breve
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          {ALL_BANKS.filter(b => !selectedProjeto.bancos_status?.[b]).length === 0 && (
                            <p className="px-3 py-2 text-xs text-zinc-400">Todos os bancos já adicionados.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage panel */}
              {selectedBancoId && activeBancoStatus && (
                <div className="bg-white rounded-xl border border-zinc-100 shadow-sm">
                  {/* Stage tabs */}
                  <div className="flex border-b border-zinc-100 overflow-x-auto">
                    {STAGES.map(stage => (
                      <button
                        key={stage.id}
                        onClick={() => setActiveStage(stage.id)}
                        className={cn(
                          'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0',
                          activeStage === stage.id
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-400 hover:text-zinc-700'
                        )}
                      >
                        {activeBancoStatus[stage.key]
                          ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          : <span className="h-3.5 w-3.5 rounded-full border border-zinc-300 inline-block shrink-0" />}
                        {stage.num}. {stage.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {activeStage === 'pre' && (
                      <PreProjetos
                        checklist={activeBancoStatus.checklist ?? {}}
                        onChange={(checklist, completo) =>
                          handleBancoUpdate({ checklist, pre_projeto_completo: completo })
                        }
                      />
                    )}
                    {activeStage === 'sim' && (
                      <SimulacaoTaxas
                        concluida={activeBancoStatus.simulacao_completa}
                        onToggle={v => handleBancoUpdate({ simulacao_completa: v })}
                      />
                    )}
                    {activeStage === 'envio' && (
                      <EnvioProjetos
                        projeto={selectedProjeto}
                        cliente={cliente}
                        minhaInfo={minhaInfo}
                        enviada={activeBancoStatus.proposta_enviada}
                        onToggleEnviada={v => handleBancoUpdate({ proposta_enviada: v })}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* No bank selected hint */}
              {!selectedBancoId && Object.keys(selectedProjeto.bancos_status ?? {}).length > 0 && (
                <p className="text-xs text-zinc-400">
                  Selecione uma instituição acima para gerenciar as etapas do processo.
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {open && <WizardModal refData={ref} />}
    </div>
  )
}
