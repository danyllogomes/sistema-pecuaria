import type { Cliente, MinhaInfo, Projeto, WizardFormData } from '@/types'
import { sbH as h } from './supabaseInternal'

const URL = 'https://gzgiyhmvicyjdzwevvzp.supabase.co'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: h, ...init })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { message?: string }).message || r.statusText) }
  if (r.status === 204) return [] as unknown as T
  return r.json()
}

// ── Clientes ──────────────────────────────────────────────────────────────
export const getClientes = () => request<Cliente[]>('clientes?order=nome.asc&select=*')

export const createCliente = (data: Omit<Cliente, 'id' | 'criado_em' | 'atualizado_em'>) =>
  request<Cliente[]>('clientes', { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(data) })
    .then(r => r[0])

export const updateCliente = (id: string, data: Partial<Cliente>) =>
  request<Cliente[]>(`clientes?id=eq.${id}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(data) })
    .then(r => r[0])

export const deleteCliente = (id: string) =>
  request<void>(`clientes?id=eq.${id}`, { method: 'DELETE' })

// ── Minha Info ────────────────────────────────────────────────────────────
export const getMinhaInfo = () =>
  request<MinhaInfo[]>('minha_info?id=eq.1&select=*').then(r => r[0] ?? null)

export const saveMinhaInfo = (data: Omit<MinhaInfo, 'id' | 'atualizado_em'>) =>
  request<MinhaInfo[]>('minha_info', {
    method: 'POST',
    headers: { ...h, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: 1, ...data }),
  }).then(r => r[0])

// ── Projetos ──────────────────────────────────────────────────────────────
export const getProjetos = (clienteId: string) =>
  request<Projeto[]>(`projetos?cliente_id=eq.${clienteId}&order=atualizado_em.desc&select=*`)

export const getProjeto = (id: string) =>
  request<Projeto[]>(`projetos?id=eq.${id}&select=*`).then(r => r[0])

export const createProjeto = (clienteId: string, nome: string, dados: WizardFormData) =>
  request<Projeto[]>('projetos', {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ cliente_id: clienteId, nome, dados }),
  }).then(r => r[0])

export const updateProjetoDados = (id: string, dados: WizardFormData) =>
  request<void>(`projetos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ dados }) })
