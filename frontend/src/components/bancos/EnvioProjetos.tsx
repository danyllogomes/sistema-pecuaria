import { useEffect, useState } from 'react'
import { Plus, ChevronRight, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProjetos, getProjeto } from '@/lib/supabase'
import { useWizardStore } from '@/store/wizardStore'
import { formatDate } from '@/lib/utils'
import type { Cliente, MinhaInfo, Projeto } from '@/types'

interface Props {
  cliente: Cliente
  minhaInfo: MinhaInfo | null
}

export function EnvioProjetos({ cliente, minhaInfo }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const { openNew, openExisting } = useWizardStore()

  const load = () => {
    setLoading(true)
    getProjetos(cliente.id).then(p => { setProjetos(p); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [cliente.id])

  const handleNew = () => openNew(cliente, minhaInfo)

  const handleOpen = async (p: Projeto) => {
    const proj = await getProjeto(p.id)
    if (proj?.dados) openExisting(cliente, p.id, proj.dados)
    else openNew(cliente, minhaInfo)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {loading ? 'Carregando…' : `${projetos.length} proposta${projetos.length !== 1 ? 's' : ''} para este cliente`}
        </p>
        <Button size="sm" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      {!loading && projetos.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <FolderOpen className="h-8 w-8 text-zinc-200" />
          <p className="text-sm text-zinc-400">Nenhuma proposta gerada ainda.</p>
          <p className="text-xs text-zinc-300">Clique em "Nova Proposta" para iniciar o preenchimento.</p>
        </div>
      )}

      {!loading && projetos.length > 0 && (
        <div className="divide-y divide-zinc-50 rounded-lg border border-zinc-100 overflow-hidden">
          {projetos.map(p => (
            <button
              key={p.id}
              onClick={() => handleOpen(p)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors text-left group"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-800">{p.nome}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atualizado em {formatDate(p.atualizado_em)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
