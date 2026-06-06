import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, Search, X, ArrowUpDown, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ClienteModal } from '@/components/clientes/ClienteModal'
import { DeleteModal } from '@/components/clientes/DeleteModal'
import { getClientes } from '@/lib/supabase'
import { sbH } from '@/lib/supabaseInternal'
import { useReference } from '@/hooks/useReference'
import type { Cliente, MinhaInfo } from '@/types'

const SUPABASE_URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co'

interface Props { minhaInfo: MinhaInfo | null }

type SortKey = 'nome_asc' | 'nome_desc' | 'recente' | 'antigo'
type ProjetoFilter = 'todos' | 'com' | 'sem'

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
    >
      {children}
    </select>
  )
}

export function ClientesPage({ minhaInfo }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editCliente, setEditCliente] = useState<Cliente | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null)
  const navigate = useNavigate()

  // Filter state
  const [search, setSearch] = useState('')
  const [filterUF, setFilterUF] = useState('')
  const [filterProjetos, setFilterProjetos] = useState<ProjetoFilter>('todos')
  const [sortBy, setSortBy] = useState<SortKey>('nome_asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { ref } = useReference()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cls, projs] = await Promise.all([
        getClientes(),
        fetch(`${SUPABASE_URL}/rest/v1/projetos?select=cliente_id`, { headers: sbH }).then(r => r.json()),
      ])
      const counts: Record<string, number> = {}
      ;(projs as { cliente_id: string }[]).forEach(p => {
        counts[p.cliente_id] = (counts[p.cliente_id] ?? 0) + 1
      })
      setClientes(cls)
      setProjectCounts(counts)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Derived UFs list
  const ufsDisponiveis = useMemo(() => {
    const ufs = new Set(
      clientes.map(c => c.municipio_uf?.split('-').pop()?.trim()).filter(Boolean) as string[]
    )
    return Array.from(ufs).sort()
  }, [clientes])

  // Filtered + sorted clients
  const filtered = useMemo(() => {
    let result = [...clientes]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        c.cpf_cnpj.toLowerCase().includes(q) ||
        (c.municipio_uf ?? '').toLowerCase().includes(q) ||
        (c.telefone ?? '').includes(q)
      )
    }

    if (filterUF) {
      result = result.filter(c => (c.municipio_uf ?? '').endsWith(`-${filterUF}`))
    }

    if (filterProjetos === 'com') {
      result = result.filter(c => (projectCounts[c.id] ?? 0) > 0)
    } else if (filterProjetos === 'sem') {
      result = result.filter(c => (projectCounts[c.id] ?? 0) === 0)
    }

    switch (sortBy) {
      case 'nome_asc':  result.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); break
      case 'nome_desc': result.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR')); break
      case 'recente':   result.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()); break
      case 'antigo':    result.sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()); break
    }

    return result
  }, [clientes, search, filterUF, filterProjetos, sortBy, projectCounts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const hasFilters = search || filterUF || filterProjetos !== 'todos' || sortBy !== 'nome_asc'

  const clearFilters = () => {
    setSearch('')
    setFilterUF('')
    setFilterProjetos('todos')
    setSortBy('nome_asc')
    setPage(1)
  }

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, filterUF, filterProjetos, sortBy])

  const openNew = () => { setEditCliente(null); setModalOpen(true) }
  const openEdit = (c: Cliente) => { setEditCliente(c); setModalOpen(true) }

  return (
    <div className="p-8 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {loading ? 'Carregando…' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} cadastrado${clientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, município…"
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* UF filter */}
        <Sel value={filterUF} onChange={setFilterUF}>
          <option value="">Todos os estados</option>
          {ufsDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </Sel>

        {/* Propostas filter */}
        <Sel value={filterProjetos} onChange={v => setFilterProjetos(v as ProjetoFilter)}>
          <option value="todos">Todas as propostas</option>
          <option value="com">Com propostas</option>
          <option value="sem">Sem propostas</option>
        </Sel>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <Sel value={sortBy} onChange={v => setSortBy(v as SortKey)}>
            <option value="nome_asc">Nome A → Z</option>
            <option value="nome_desc">Nome Z → A</option>
            <option value="recente">Mais recente</option>
            <option value="antigo">Mais antigo</option>
          </Sel>
        </div>

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-zinc-400 hover:text-zinc-700 h-9">
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}

        {/* Result count badge */}
        {!loading && (search || filterUF || filterProjetos !== 'todos') && (
          <span className="text-xs text-zinc-400 ml-1">
            {filtered.length} de {clientes.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-zinc-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-zinc-200 border-t-zinc-700 animate-spin" />
            Carregando clientes…
          </div>
        </div>
      )}

      {/* Empty state (no clients at all) */}
      {!loading && !clientes.length && (
        <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <FolderOpen className="h-7 w-7 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-700 mb-1">Nenhum cliente cadastrado</p>
          <p className="text-xs text-zinc-400 mb-4">Clique em "Novo Cliente" para começar.</p>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Novo Cliente</Button>
        </div>
      )}

      {/* No results from filter */}
      {!loading && clientes.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
          <Search className="h-8 w-8 text-zinc-300 mb-3" />
          <p className="text-sm font-semibold text-zinc-600 mb-1">Nenhum resultado encontrado</p>
          <p className="text-xs text-zinc-400 mb-4">Tente ajustar os filtros ou a busca.</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Nome / Razão Social','CPF / CNPJ','Município-UF','Telefone','Propostas','Ações '].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => {
                const count = projectCounts[c.id] ?? 0
                return (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">{c.nome}</td>
                    <td className="px-5 py-3.5 text-zinc-400 tabular-nums text-xs">{c.cpf_cnpj}</td>
                    <td className="px-5 py-3.5">
                      {c.municipio_uf
                        ? <Badge variant="outline">{c.municipio_uf}</Badge>
                        : <span className="text-zinc-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs tabular-nums">
                      {c.telefone || <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                        count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400'
                      }`}>
                        {count > 0 ? `${count} proposta${count !== 1 ? 's' : ''}` : 'Sem propostas'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => navigate(`/clientes/${c.id}`)}>
                          <Eye className="h-3 w-3" />
                          Visualizar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteCliente(c)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100">
              <p className="text-xs text-zinc-400 tabular-nums">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0"
                  disabled={safePage === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                      n === safePage
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:bg-zinc-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ClienteModal
        open={modalOpen}
        cliente={editCliente}
        municipios={ref?.municipios ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load() }}
      />
      <DeleteModal
        cliente={deleteCliente}
        onClose={() => setDeleteCliente(null)}
        onDeleted={() => { setDeleteCliente(null); load() }}
      />
    </div>
  )
}
