import { useEffect, useState } from 'react'
import { ChevronRight, Plus, FolderOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getProjetos, getProjeto } from '@/lib/supabase'
import { useWizardStore } from '@/store/wizardStore'
import { formatDate } from '@/lib/utils'
import type { Cliente, MinhaInfo, Projeto } from '@/types'

interface Props {
  cliente: Cliente | null
  minhaInfo: MinhaInfo | null
  onClose: () => void
}

export function ProjetosModal({ cliente, minhaInfo, onClose }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(false)
  const { openNew, openExisting } = useWizardStore()

  useEffect(() => {
    if (!cliente) return
    setLoading(true)
    getProjetos(cliente.id).then(p => { setProjetos(p); setLoading(false) }).catch(() => setLoading(false))
  }, [cliente])

  const handleNew = () => {
    if (!cliente) return
    onClose()
    openNew(cliente, minhaInfo)
  }

  const handleOpen = async (p: Projeto) => {
    if (!cliente) return
    onClose()
    const proj = await getProjeto(p.id)
    if (proj?.dados) openExisting(cliente, p.id, proj.dados)
    else openNew(cliente, minhaInfo)
  }

  return (
    <Dialog open={!!cliente} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-full max-w-md p-0" hideClose>
        <DialogHeader className="px-6 pt-5 pb-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-0.5">Projetos BNB</p>
          <DialogTitle className="text-base">{cliente?.nome}</DialogTitle>
        </DialogHeader>

        <div className="min-h-[160px] max-h-80 overflow-y-auto divide-y divide-zinc-50">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">Carregando…</div>
          )}
          {!loading && projetos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FolderOpen className="h-8 w-8 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-500">Nenhum projeto ainda</p>
              <p className="text-xs text-zinc-400">Clique em "+ Novo Projeto" para começar.</p>
            </div>
          )}
          {!loading && projetos.map(p => (
            <button
              key={p.id}
              onClick={() => handleOpen(p)}
              className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-zinc-50 transition-colors text-left group"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-800">{p.nome}</p>
                <p className="text-xs text-zinc-400 mt-0.5">Atualizado em {formatDate(p.atualizado_em)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
            </button>
          ))}
        </div>

        <DialogFooter className="justify-start">
          <Button onClick={handleNew} size="sm">
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
