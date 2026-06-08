import { useState } from 'react'
import { Download, Edit, FileCheck, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWizardStore } from '@/store/wizardStore'
import { getProjeto } from '@/lib/supabase'
import { toast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import type { Cliente, MinhaInfo, Projeto } from '@/types'

interface Props {
  projeto: Projeto
  cliente: Cliente
  minhaInfo: MinhaInfo | null
  enviada: boolean
  onToggleEnviada: (v: boolean) => void
}

export function EnvioProjetos({ projeto, cliente, minhaInfo, enviada, onToggleEnviada }: Props) {
  const { openNew, openExisting } = useWizardStore()
  const [downloading, setDownloading] = useState(false)

  const handleEdit = async () => {
    if (projeto.dados) {
      const proj = await getProjeto(projeto.id)
      if (proj?.dados) openExisting(cliente, projeto.id, proj.dados)
    } else {
      openNew(cliente, minhaInfo)
    }
  }

  const handleDownload = async () => {
    if (!projeto.dados) return
    setDownloading(true)
    try {
      const res = await fetch('/api/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projeto.dados),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      a.download = m ? m[1].replace(/['"]/g, '') : 'proposta.xlsm'
      a.href = url
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast('Planilha gerada com sucesso!')
      if (!enviada) onToggleEnviada(true)
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 ${projeto.dados ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="flex items-start gap-3">
          {projeto.dados
            ? <FileCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            : <FileX className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${projeto.dados ? 'text-emerald-800' : 'text-zinc-600'}`}>
              {projeto.dados ? 'Proposta técnica preenchida' : 'Proposta técnica não preenchida'}
            </p>
            {projeto.dados && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Atualizada em {formatDate(projeto.atualizado_em)}
                {projeto.dados.agencia && ` · Agência ${projeto.dados.agencia}`}
              </p>
            )}
            {!projeto.dados && (
              <p className="text-xs text-zinc-400 mt-0.5">
                Preencha a proposta técnica para gerar o arquivo de custeio.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {projeto.dados && (
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
                <Download className="h-3.5 w-3.5" />
                {downloading ? 'Gerando…' : 'Baixar .xlsm'}
              </Button>
            )}
            <Button size="sm" variant={projeto.dados ? 'outline' : 'default'} onClick={handleEdit}>
              <Edit className="h-3.5 w-3.5" />
              {projeto.dados ? 'Editar' : 'Preencher'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
