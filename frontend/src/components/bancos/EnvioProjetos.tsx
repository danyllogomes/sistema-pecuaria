import { useState } from 'react'
import { Download, Edit, FileCheck, FileX, CheckCircle, Send } from 'lucide-react'
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
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Proposal status */}
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

      {/* Proposal summary (if dados exist) */}
      {projeto.dados && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Categoria', value: projeto.dados.categ_produtor },
            { label: 'Programa', value: projeto.dados.programa_credito?.split(' ').slice(0, 3).join(' ') },
            { label: 'Finalidade', value: projeto.dados.finalidade_credito },
            { label: 'Atividade Principal', value: projeto.dados.atividade_principal?.split(' ').slice(0, 3).join(' ') },
            { label: 'Prazo', value: projeto.dados.prazo_meses ? `${projeto.dados.prazo_meses} meses` : null },
            { label: 'Encargos a.a.', value: projeto.dados.encargos_ao_ano ? `${projeto.dados.encargos_ao_ano}%` : null },
          ].filter(item => item.value).map(item => (
            <div key={item.label} className="bg-zinc-50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{item.label}</p>
              <p className="text-sm text-zinc-700 mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sent to bank toggle */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${enviada ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="flex items-center gap-2">
          {enviada
            ? <CheckCircle className="h-4 w-4 text-emerald-500" />
            : <Send className="h-4 w-4 text-zinc-400" />}
          <div>
            <p className={`text-sm font-medium ${enviada ? 'text-emerald-700' : 'text-zinc-600'}`}>
              {enviada ? 'Proposta entregue ao banco' : 'Proposta ainda não entregue ao banco'}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Marque quando os documentos forem fisicamente entregues</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={enviada ? 'outline' : 'default'}
          onClick={() => onToggleEnviada(!enviada)}
        >
          {enviada ? 'Desfazer' : 'Marcar como entregue'}
        </Button>
      </div>
    </div>
  )
}
