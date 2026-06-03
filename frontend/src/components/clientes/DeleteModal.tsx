import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { deleteCliente } from '@/lib/supabase'
import type { Cliente } from '@/types'

interface Props {
  cliente: Cliente | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteModal({ cliente, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)

  const confirm = async () => {
    if (!cliente) return
    setDeleting(true)
    try {
      await deleteCliente(cliente.id)
      toast('Cliente excluído.')
      onDeleted()
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!cliente} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong className="text-zinc-900">{cliente?.nome}</strong>?
            Todos os projetos vinculados serão removidos. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
