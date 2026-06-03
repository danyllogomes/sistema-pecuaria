import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import { Users, FolderOpen, MapPin, TrendingUp, RefreshCw, Building2, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sbH } from '@/lib/supabaseInternal'
import {
  deriveKPIs, byCategoriaData, byGrupoData, byAgenciaData,
  byAtividadeData, byMunicipioData, monthlyData, byBancoData, stageFunnelData,
  type DashboardData, type ChartEntry,
} from '@/lib/dashboard'
import { formatDate } from '@/lib/utils'
import type { Cliente, Projeto } from '@/types'

const SUPABASE_URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co'

const PIE_COLORS = ['#18181b','#52525b','#a1a1aa','#d4d4d8','#e4e4e7']
const BAR_COLOR = '#18181b'
const AREA_COLOR = '#10b981'
const BANK_COLORS: Record<string, string> = {
  BNB: '#10b981', Bradesco: '#ef4444', Caixa: '#3b82f6',
  BB: '#eab308', Sicredi: '#16a34a',
}

async function fetchDashboard(): Promise<DashboardData> {
  const [c, p] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/clientes?select=id,municipio_uf,criado_em`, { headers: sbH }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/projetos?select=id,cliente_id,nome,dados,bancos_status,criado_em,atualizado_em&order=atualizado_em.desc`, { headers: sbH }).then(r => r.json()),
  ])
  return { clientes: c as Cliente[], projetos: p as Projeto[] }
}

async function fetchRecentProjects() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/projetos?select=id,nome,criado_em,atualizado_em,dados,bancos_status,clientes(nome)&order=atualizado_em.desc&limit=8`,
    { headers: { ...sbH, Accept: 'application/json' } }
  )
  return res.json()
}

// ── Shared components ──────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-zinc-100 shadow-sm ${className}`}>{children}</div>
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4 border-b border-zinc-50">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function Empty() {
  return <div className="flex items-center justify-center h-40 text-xs text-zinc-300">Sem dados</div>
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-medium">{label}</p>
      <p>{payload[0].value}</p>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color: string
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
        <p className="text-xs font-medium text-zinc-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-zinc-300 mt-0.5">{sub}</p>}
      </div>
    </Card>
  )
}

function HBar({ data, color = BAR_COLOR }: { data: ChartEntry[]; color?: string }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} width={130} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Donut({ data }: { data: ChartEntry[] }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v}`, '']} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-zinc-600">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function AreaTimeline({ data }: { data: ChartEntry[] }) {
  const hasAny = data.some(d => d.value > 0)
  if (!hasAny) return <div className="flex items-center justify-center h-48 text-xs text-zinc-300">Nenhum projeto registrado ainda</div>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={AREA_COLOR} stopOpacity={0.15} />
            <stop offset="95%" stopColor={AREA_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="value" stroke={AREA_COLOR} strokeWidth={2} fill="url(#areaGrad)" dot={{ r: 3, fill: AREA_COLOR, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function BancoBarChart({ data }: { data: ChartEntry[] }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 120)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#52525b' }} tickLine={false} axisLine={false} width={100} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry, i) => (
            <Cell key={i} fill={BANK_COLORS[entry.name] ?? '#a1a1aa'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function StageFunnelChart({ data }: { data: ChartEntry[] }) {
  if (!data.every(d => d.value === 0) && data.length) {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  return <Empty />
}

type RecentProject = {
  id: string
  nome: string
  criado_em: string
  atualizado_em: string
  dados: { agencia?: string; atividade_principal?: string; categ_produtor?: string } | null
  bancos_status: Record<string, { pre_projeto_completo: boolean; simulacao_completa: boolean; proposta_enviada: boolean }> | null
  clientes: { nome: string }
}

function ProgressPill({ pct }: { pct: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums
      ${pct === 100 ? 'bg-emerald-50 text-emerald-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-zinc-300'}`} />
      {pct}%
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recent, setRecent] = useState<RecentProject[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [d, r] = await Promise.all([fetchDashboard(), fetchRecentProjects()])
      setData(d)
      setRecent(r)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
          Carregando dashboard…
        </div>
      </div>
    )
  }

  if (!data) return null

  const kpis     = deriveKPIs(data)
  const categoria = byCategoriaData(data)
  const grupo     = byGrupoData(data)
  const agencia   = byAgenciaData(data)
  const atividade = byAtividadeData(data)
  const municipio = byMunicipioData(data)
  const timeline  = monthlyData(data)
  const bancos    = byBancoData(data)
  const funnel    = stageFunnelData(data)

  return (
    <div className="p-8 flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Visão Geral</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Panorama operacional da plataforma</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* KPIs row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={Users}      label="Clientes cadastrados"  value={kpis.totalClientes}  color="bg-zinc-100 text-zinc-600" />
        <KPICard icon={FolderOpen} label="Propostas geradas"      value={kpis.totalProjetos}  color="bg-emerald-50 text-emerald-600" />
        <KPICard icon={MapPin}     label="Municípios atendidos"   value={kpis.municipios}     color="bg-blue-50 text-blue-600" />
        <KPICard icon={TrendingUp} label="Propostas este mês"     value={kpis.projetosMes}    sub="mês corrente" color="bg-violet-50 text-violet-600" />
      </div>

      {/* KPIs row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <KPICard
          icon={Building2}
          label="Financiamentos ativos"
          value={kpis.totalEnvios}
          sub="vínculos projeto × banco"
          color="bg-amber-50 text-amber-600"
        />
        <KPICard
          icon={Activity}
          label="Progresso médio"
          value={kpis.totalEnvios > 0 ? `${kpis.progressoMedio}%` : '—'}
          sub="média das etapas concluídas"
          color="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader title="Propostas por Mês" subtitle="Últimos 12 meses" />
        <div className="px-5 py-4">
          <AreaTimeline data={timeline} />
        </div>
      </Card>

      {/* Jornada de Financiamento */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Jornada de Financiamento
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Propostas por Banco" subtitle="Vínculos projeto × instituição" />
            <div className="px-4 py-4">
              {bancos.length === 0
                ? <Empty />
                : <BancoBarChart data={bancos} />}
            </div>
          </Card>
          <Card>
            <CardHeader title="Etapas Concluídas" subtitle="Total de financiamentos por estágio" />
            <div className="px-4 py-4">
              <StageFunnelChart data={funnel} />
              {kpis.totalEnvios > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {funnel.map(f => (
                    <div key={f.name} className="text-center">
                      <p className="text-lg font-bold text-zinc-900 tabular-nums">{f.value}</p>
                      <p className="text-[10px] text-zinc-400">{f.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Categoria do Produtor" subtitle="Distribuição das propostas" />
          <div className="px-4 py-3"><Donut data={categoria} /></div>
        </Card>
        <Card>
          <CardHeader title="Grupo / Linha de Crédito" />
          <div className="px-4 py-4"><HBar data={grupo} color="#6366f1" /></div>
        </Card>
        <Card>
          <CardHeader title="Atividade Principal" subtitle="Top 6 atividades" />
          <div className="px-4 py-4"><HBar data={atividade} color="#10b981" /></div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Agências BNB" subtitle="Propostas por agência" />
          <div className="px-4 py-4"><HBar data={agencia} /></div>
        </Card>
        <Card>
          <CardHeader title="Municípios" subtitle="Distribuição de clientes" />
          <div className="px-4 py-4"><HBar data={municipio} color="#f59e0b" /></div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader title="Propostas Recentes" subtitle="Últimas propostas trabalhadas" />
        <div className="divide-y divide-zinc-50">
          {recent.length === 0 && <Empty />}
          {recent.map(p => {
            const bancosEntries = Object.entries(p.bancos_status ?? {})
            return (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{p.clientes?.nome ?? '—'}</p>
                  <p className="text-xs text-zinc-400">{p.nome}</p>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  {bancosEntries.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {bancosEntries.map(([bancoId, status]) => {
                        const flags = [status.pre_projeto_completo, status.simulacao_completa, status.proposta_enviada]
                        const pct = Math.round((flags.filter(Boolean).length / flags.length) * 100)
                        return (
                          <span key={bancoId} className="flex items-center gap-1">
                            <span className="text-[10px] font-medium text-zinc-500">{bancoId}</span>
                            <ProgressPill pct={pct} />
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {p.dados?.agencia && (
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full hidden sm:inline">{p.dados.agencia}</span>
                  )}
                  <p className="text-xs text-zinc-300 tabular-nums">{formatDate(p.atualizado_em)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
