import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import { Users, FolderOpen, MapPin, TrendingUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sbH } from '@/lib/supabaseInternal'
import {
  deriveKPIs, byCategoriaData, byGrupoData, byAgenciaData,
  byAtividadeData, byMunicipioData, monthlyData,
  type DashboardData, type ChartEntry,
} from '@/lib/dashboard'
import { formatDate } from '@/lib/utils'
import type { Cliente, Projeto } from '@/types'

const SUPABASE_URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co'

const PIE_COLORS = ['#18181b','#52525b','#a1a1aa','#d4d4d8','#e4e4e7']
const BAR_COLOR = '#18181b'
const AREA_COLOR = '#10b981'

async function fetchDashboard(): Promise<DashboardData> {
  const [c, p] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/clientes?select=id,municipio_uf,criado_em`, { headers: sbH }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/projetos?select=id,cliente_id,nome,dados,criado_em,atualizado_em&order=atualizado_em.desc`, { headers: sbH }).then(r => r.json()),
  ])
  return { clientes: c as Cliente[], projetos: p as Projeto[] }
}

async function fetchRecentProjects() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/projetos?select=id,nome,criado_em,atualizado_em,dados,clientes(nome)&order=atualizado_em.desc&limit=6`,
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
      <p>{payload[0].value} {payload[0].value === 1 ? 'proposta' : 'propostas'}</p>
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: number | string; sub?: string; color: string }) {
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

// ── Horizontal Bar ─────────────────────────────────────────────────────────

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

// ── Donut ──────────────────────────────────────────────────────────────────

function Donut({ data }: { data: ChartEntry[] }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v} proposta${Number(v) !== 1 ? 's' : ''}`, '']} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-zinc-600">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Area chart ─────────────────────────────────────────────────────────────

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

// ── Main page ──────────────────────────────────────────────────────────────

export function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recent, setRecent] = useState<{ id: string; nome: string; criado_em: string; atualizado_em: string; dados: { agencia?: string; atividade_principal?: string }; clientes: { nome: string } }[]>([])
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

  const kpis = deriveKPIs(data)
  const categoria = byCategoriaData(data)
  const grupo = byGrupoData(data)
  const agencia = byAgenciaData(data)
  const atividade = byAtividadeData(data)
  const municipio = byMunicipioData(data)
  const timeline = monthlyData(data)

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

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={Users} label="Clientes cadastrados" value={kpis.totalClientes} color="bg-zinc-100 text-zinc-600" />
        <KPICard icon={FolderOpen} label="Propostas geradas" value={kpis.totalProjetos} color="bg-emerald-50 text-emerald-600" />
        <KPICard icon={MapPin} label="Municípios atendidos" value={kpis.municipios} color="bg-blue-50 text-blue-600" />
        <KPICard icon={TrendingUp} label="Propostas este mês" value={kpis.projetosMes} sub="mês corrente" color="bg-violet-50 text-violet-600" />
      </div>

      {/* Timeline - full width */}
      <Card>
        <CardHeader title="Propostas por Mês" subtitle="Últimos 12 meses" />
        <div className="px-5 py-4">
          <AreaTimeline data={timeline} />
        </div>
      </Card>

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
          {recent.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">{p.clientes?.nome ?? '—'}</p>
                <p className="text-xs text-zinc-400">{p.nome}</p>
              </div>
              <div className="flex items-center gap-6 ml-4 shrink-0">
                {p.dados?.agencia && (
                  <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{p.dados.agencia}</span>
                )}
                {p.dados?.atividade_principal && (
                  <span className="text-xs text-zinc-400 hidden sm:block truncate max-w-48">{p.dados.atividade_principal}</span>
                )}
                <p className="text-xs text-zinc-300 tabular-nums">{formatDate(p.atualizado_em)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
