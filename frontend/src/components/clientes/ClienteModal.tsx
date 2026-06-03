import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { createCliente, updateCliente } from '@/lib/supabase'
import type { Cliente } from '@/types'

interface Props {
  open: boolean
  cliente: Cliente | null
  municipios: string[]
  onClose: () => void
  onSaved: () => void
}

const empty = { nome: '', cpf_cnpj: '', telefone: '', municipio_uf: '', endereco: '', numero: '', bairro: '', complemento: '' }

export function ClienteModal({ open, cliente, municipios, onClose, onSaved }: Props) {
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(cliente ? {
        nome: cliente.nome, cpf_cnpj: cliente.cpf_cnpj,
        telefone: cliente.telefone ?? '', municipio_uf: cliente.municipio_uf ?? '',
        endereco: cliente.endereco ?? '', numero: cliente.numero ?? '',
        bairro: cliente.bairro ?? '', complemento: cliente.complemento ?? '',
      } : empty)
      setErrors({})
    }
  }, [open, cliente])

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (!form.cpf_cnpj.trim()) e.cpf_cnpj = 'Obrigatório'
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const data = { nome: form.nome.trim(), cpf_cnpj: form.cpf_cnpj.trim(), telefone: form.telefone || null, municipio_uf: form.municipio_uf || null, endereco: form.endereco || null, numero: form.numero || null, bairro: form.bairro || null, complemento: form.complemento || null }
      cliente ? await updateCliente(cliente.id, data) : await createCliente(data as Parameters<typeof createCliente>[0])
      toast(cliente ? 'Cliente atualizado!' : 'Cliente criado!')
      onSaved()
    } catch (err: unknown) {
      toast((err as Error).message, 'destructive')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 grid grid-cols-12 gap-3">
          <Field label="Nome / Razão Social *" className="col-span-8" error={errors.nome}>
            <Input value={form.nome} onChange={f('nome')} placeholder="Nome completo ou razão social" />
          </Field>
          <Field label="CPF / CNPJ *" className="col-span-4" error={errors.cpf_cnpj}>
            <Input value={form.cpf_cnpj} onChange={f('cpf_cnpj')} placeholder="000.000.000-00" />
          </Field>
          <Field label="Telefone" className="col-span-4">
            <Input value={form.telefone} onChange={f('telefone')} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Município-UF" className="col-span-8">
            <Input value={form.municipio_uf} onChange={f('municipio_uf')} list="mc-municipios" placeholder="FORTALEZA CENTRO-CE" />
            <datalist id="mc-municipios">{municipios.slice(0, 3000).map(m => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Endereço" className="col-span-8">
            <Input value={form.endereco} onChange={f('endereco')} placeholder="Rua / Avenida / Sítio" />
          </Field>
          <Field label="Número" className="col-span-2">
            <Input value={form.numero} onChange={f('numero')} placeholder="S/N" />
          </Field>
          <Field label="Bairro" className="col-span-2">
            <Input value={form.bairro} onChange={f('bairro')} />
          </Field>
          <Field label="Complemento" className="col-span-4">
            <Input value={form.complemento} onChange={f('complemento')} placeholder="Apto, sala…" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, className, error }: { label: string; children: React.ReactNode; className?: string; error?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
