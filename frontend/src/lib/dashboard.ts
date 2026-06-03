import type { Cliente, Projeto } from '@/types'

export interface DashboardData {
  clientes: Pick<Cliente, 'id' | 'municipio_uf' | 'criado_em'>[]
  projetos: Pick<Projeto, 'id' | 'cliente_id' | 'nome' | 'dados' | 'bancos_status' | 'criado_em' | 'atualizado_em'>[]
}

export interface KPIs {
  totalClientes: number
  totalProjetos: number
  municipios: number
  projetosMes: number
  totalEnvios: number
  progressoMedio: number
}

export interface ChartEntry { name: string; value: number }

function isThisMonth(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function groupCount(items: string[]): ChartEntry[] {
  const map = new Map<string, number>()
  items.forEach(k => { if (k) map.set(k, (map.get(k) ?? 0) + 1) })
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function deriveKPIs(d: DashboardData): KPIs {
  const municipios = new Set(d.clientes.map(c => c.municipio_uf).filter(Boolean))

  let totalEnvios = 0
  let progressoTotal = 0
  let progressoCount = 0

  d.projetos.forEach(p => {
    const bancos = Object.values(p.bancos_status ?? {})
    totalEnvios += bancos.length
    bancos.forEach(s => {
      const flags = [s.pre_projeto_completo, s.simulacao_completa, s.proposta_enviada]
      progressoTotal += Math.round((flags.filter(Boolean).length / flags.length) * 100)
      progressoCount++
    })
  })

  return {
    totalClientes: d.clientes.length,
    totalProjetos: d.projetos.length,
    municipios: municipios.size,
    projetosMes: d.projetos.filter(p => isThisMonth(p.criado_em)).length,
    totalEnvios,
    progressoMedio: progressoCount > 0 ? Math.round(progressoTotal / progressoCount) : 0,
  }
}

export function byCategoriaData(d: DashboardData): ChartEntry[] {
  return groupCount(d.projetos.map(p => p.dados?.categ_produtor ?? '').filter(Boolean))
}

export function byGrupoData(d: DashboardData): ChartEntry[] {
  return groupCount(d.projetos.map(p => {
    const g = p.dados?.grupo ?? ''
    return g.startsWith('PRONAF') ? g.split('-')[0].trim() || g : g
  }).filter(Boolean))
}

export function byAgenciaData(d: DashboardData): ChartEntry[] {
  return groupCount(d.projetos.map(p => p.dados?.agencia ?? '').filter(Boolean)).slice(0, 8)
}

export function byAtividadeData(d: DashboardData): ChartEntry[] {
  const raw = d.projetos.map(p => {
    const a = p.dados?.atividade_principal ?? ''
    return a.split(' ').slice(0, 2).join(' ')
  }).filter(Boolean)
  return groupCount(raw).slice(0, 6)
}

export function byMunicipioData(d: DashboardData): ChartEntry[] {
  return groupCount(d.clientes.map(c => {
    const m = c.municipio_uf ?? ''
    return m.split('-')[0].trim()
  }).filter(Boolean)).slice(0, 8)
}

export function byBancoData(d: DashboardData): ChartEntry[] {
  const counts: Record<string, number> = {}
  d.projetos.forEach(p => {
    Object.keys(p.bancos_status ?? {}).forEach(banco => {
      counts[banco] = (counts[banco] ?? 0) + 1
    })
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function stageFunnelData(d: DashboardData): ChartEntry[] {
  let pre = 0, sim = 0, env = 0
  d.projetos.forEach(p => {
    Object.values(p.bancos_status ?? {}).forEach(s => {
      if (s.pre_projeto_completo) pre++
      if (s.simulacao_completa) sim++
      if (s.proposta_enviada) env++
    })
  })
  return [
    { name: 'Pré-Projeto', value: pre },
    { name: 'Simulação', value: sim },
    { name: 'Enviada', value: env },
  ]
}

export function monthlyData(d: DashboardData): ChartEntry[] {
  const months: Record<string, number> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    months[key] = 0
  }
  d.projetos.forEach(p => {
    const dt = new Date(p.criado_em)
    const key = dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    if (key in months) months[key]++
  })
  return Object.entries(months).map(([name, value]) => ({ name, value }))
}
