import { useEffect, useState } from 'react'
import { Save, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { RadioGroup } from '@/components/wizard/steps/shared'
import { getMinhaInfo, saveMinhaInfo } from '@/lib/supabase'
import type { MinhaInfo } from '@/types'

interface Props { onSaved: (info: MinhaInfo) => void }

const empty = { cliente_elaborador: 'Não', empresa: '', cpf_cnpj: '', tecnico_responsavel: '', cpf_tecnico: '', crea: '', telefone: '' }

export function MinhasInformacoesPage({ onSaved }: Props) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMinhaInfo().then(info => {
      if (info) setForm({ cliente_elaborador: info.cliente_elaborador ?? 'Não', empresa: info.empresa ?? '', cpf_cnpj: info.cpf_cnpj ?? '', tecnico_responsavel: info.tecnico_responsavel ?? '', cpf_tecnico: info.cpf_tecnico ?? '', crea: info.crea ?? '', telefone: info.telefone ?? '' })
    }).finally(() => setLoading(false))
  }, [])

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      const saved = await saveMinhaInfo({ cliente_elaborador: form.cliente_elaborador, empresa: form.empresa || null, cpf_cnpj: form.cpf_cnpj || null, tecnico_responsavel: form.tecnico_responsavel || null, cpf_tecnico: form.cpf_tecnico || null, crea: form.crea || null, telefone: form.telefone || null })
      toast('Informações salvas!')
      onSaved(saved)
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Minhas Informações</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Dados do elaborador usados automaticamente em novos projetos</p>
        </div>
        <Button size="sm" onClick={save} disabled={saving || loading}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-zinc-400">Carregando…</div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-50">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <UserCircle className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">Dados do Elaborador</h3>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Cliente também é Elaborador?</Label>
              <RadioGroup name="mi_cliente_elaborador" value={form.cliente_elaborador} onChange={v => setForm(p => ({ ...p, cliente_elaborador: v }))} options={['Sim','Não']} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Empresa / Elaborador</Label>
                <Input value={form.empresa} onChange={f('empresa')} placeholder="Nome da empresa ou do elaborador" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>CPF / CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={f('cpf_cnpj')} placeholder="00.000.000/0001-00" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Técnico Responsável</Label>
                <Input value={form.tecnico_responsavel} onChange={f('tecnico_responsavel')} placeholder="Nome completo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>CPF do Técnico</Label>
                <Input value={form.cpf_tecnico} onChange={f('cpf_tecnico')} placeholder="000.000.000-00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>CREA / CRBio / CFT</Label>
                <Input value={form.crea} onChange={f('crea')} placeholder="00000-D/UF" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={f('telefone')} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, span, children }: { label: string; span: number; children: React.ReactNode }) {
  return (
    <div className={`col-span-${span} max-sm:col-span-12 flex flex-col gap-1.5`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
