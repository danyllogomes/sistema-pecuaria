import { create } from 'zustand'
import type { Cliente, MinhaInfo, WizardFormData, CronogramaItem } from '@/types'

const CRON_KEYS = ['milho','torta','soja','vacinas','racao_conc','sal_mineral',
  'livre_1','livre_2','livre_3','livre_4','livre_5','mao_obra','assessoria']

const emptyCron = (): Record<string, CronogramaItem> =>
  Object.fromEntries(CRON_KEYS.map(k => [k, { p1: '', p2: '', p3: '', p4: '' }]))

export const emptyFormData = (): WizardFormData => ({
  nome_cliente: '', cpf_cnpj_cliente: '', telefone_cliente: '', municipio_uf: '',
  endereco: '', numero: '', bairro: '', complemento: '',
  cliente_elaborador: '', data_elaboracao: '', empresa_elaborador: '',
  cpf_cnpj_elaborador: '', tecnico_responsavel: '', cpf_tecnico: '', crea: '', telefone_elaborador: '',
  categ_produtor: '', agencia: '', municipio_decreto: '', grupo: '', base_agroecologica: '',
  programa_credito: '', planos_territoriais: '', finalidade_credito: '', custeio_rotativo: '',
  atividade_principal: '', benef_politica_pub: '', valor_emergencial: '',
  reprod_bovinos: '', matrizes_bovinos: '', novilhos: '', novilhas_engorda: '',
  garrotes: '', garrotas: '', bezerros: '',
  reprod_ovinos: '', matrizes_ovinos: '', femeas_1_2_anos: '', machos_1_2_anos: '',
  femeas_0_1_anos: '', machos_0_1_anos: '', necessidade_racao_meses: '',
  preco_milho: '', rec_prop_milho: '', preco_torta: '', rec_prop_torta: '',
  preco_soja: '', rec_prop_soja: '', preco_vacinas: '', rec_prop_vacinas: '',
  preco_racao_conc: '', rec_prop_racao_conc: '', preco_sal_mineral: '', rec_prop_sal_mineral: '',
  free_items: Array.from({ length: 5 }, () => ({ discriminacao:'',area:'',insumo:'',quantidade:'',unidade:'',uso:'',preco:'',rec_prop:'' })),
  preco_mao_obra: '', rec_prop_mao_obra: '', assessoria_pct: '',
  data_parcela_1: '', data_parcela_2: '', data_parcela_3: '', data_parcela_4: '',
  cronograma: emptyCron(),
  receitas_bov: ['','','','',''], receitas_ovi: ['','','','',''],
  prazo_meses: '', carencia_meses: '', encargos_ao_ano: '', periodicidade_reembolso: '',
  periodo_lactacao: '', producao_leite: '', comentarios: '',
})

interface WizardState {
  open: boolean
  currentStep: number
  currentCliente: Cliente | null
  currentProjetoId: string | null
  formData: WizardFormData
  patch: (p: Partial<WizardFormData>) => void
  setStep: (n: number) => void
  openNew: (cliente: Cliente, minhaInfo: MinhaInfo | null) => void
  openExisting: (cliente: Cliente, projetoId: string, dados: WizardFormData) => void
  close: () => void
}

export const useWizardStore = create<WizardState>((set, get) => ({
  open: false,
  currentStep: 1,
  currentCliente: null,
  currentProjetoId: null,
  formData: emptyFormData(),

  patch: (p) => set(s => ({ formData: { ...s.formData, ...p } })),

  setStep: (n) => set({ currentStep: n }),

  openNew: (cliente, minhaInfo) => {
    const base = emptyFormData()
    // Pre-fill step 1 from cliente
    base.nome_cliente     = cliente.nome
    base.cpf_cnpj_cliente = cliente.cpf_cnpj
    base.telefone_cliente = cliente.telefone ?? ''
    base.municipio_uf     = cliente.municipio_uf ?? ''
    base.endereco         = cliente.endereco ?? ''
    base.numero           = cliente.numero ?? ''
    base.bairro           = cliente.bairro ?? ''
    base.complemento      = cliente.complemento ?? ''
    // Pre-fill step 2 from minhaInfo
    if (minhaInfo) {
      base.cliente_elaborador  = minhaInfo.cliente_elaborador ?? ''
      base.empresa_elaborador  = minhaInfo.empresa ?? ''
      base.cpf_cnpj_elaborador = minhaInfo.cpf_cnpj ?? ''
      base.tecnico_responsavel = minhaInfo.tecnico_responsavel ?? ''
      base.cpf_tecnico         = minhaInfo.cpf_tecnico ?? ''
      base.crea                = minhaInfo.crea ?? ''
      base.telefone_elaborador = minhaInfo.telefone ?? ''
    }
    set({ open: true, currentStep: 1, currentCliente: cliente, currentProjetoId: null, formData: base })
  },

  openExisting: (cliente, projetoId, dados) => {
    const step = dados._step ?? 1
    set({ open: true, currentStep: step, currentCliente: cliente, currentProjetoId: projetoId, formData: dados })
  },

  close: () => set({ open: false, currentCliente: null, currentProjetoId: null }),
}))
