export interface Cliente {
  id: string
  nome: string
  cpf_cnpj: string
  telefone: string | null
  municipio_uf: string | null
  endereco: string | null
  numero: string | null
  bairro: string | null
  complemento: string | null
  criado_em: string
  atualizado_em: string
}

export interface Projeto {
  id: string
  cliente_id: string
  nome: string
  dados: WizardFormData | null
  criado_em: string
  atualizado_em: string
}

export interface MinhaInfo {
  id: number
  cliente_elaborador: string
  empresa: string | null
  cpf_cnpj: string | null
  tecnico_responsavel: string | null
  cpf_tecnico: string | null
  crea: string | null
  telefone: string | null
  atualizado_em: string
}

export interface FreeItem {
  discriminacao: string
  area: string
  insumo: string
  quantidade: string
  unidade: string
  uso: string
  preco: string
  rec_prop: string
}

export type CronogramaItem = { p1: string; p2: string; p3: string; p4: string }
export type CronogramaData = Record<string, CronogramaItem>

export interface WizardFormData {
  // Step 1
  nome_cliente: string
  cpf_cnpj_cliente: string
  telefone_cliente: string
  municipio_uf: string
  endereco: string
  numero: string
  bairro: string
  complemento: string
  // Step 2
  cliente_elaborador: string
  data_elaboracao: string
  empresa_elaborador: string
  cpf_cnpj_elaborador: string
  tecnico_responsavel: string
  cpf_tecnico: string
  crea: string
  telefone_elaborador: string
  // Step 3
  categ_produtor: string
  agencia: string
  municipio_decreto: string
  grupo: string
  base_agroecologica: string
  programa_credito: string
  planos_territoriais: string
  finalidade_credito: string
  custeio_rotativo: string
  atividade_principal: string
  benef_politica_pub: string
  valor_emergencial: string
  // Step 4
  reprod_bovinos: string
  matrizes_bovinos: string
  novilhos: string
  novilhas_engorda: string
  garrotes: string
  garrotas: string
  bezerros: string
  reprod_ovinos: string
  matrizes_ovinos: string
  femeas_1_2_anos: string
  machos_1_2_anos: string
  femeas_0_1_anos: string
  machos_0_1_anos: string
  necessidade_racao_meses: string
  // Step 5
  preco_milho: string; rec_prop_milho: string
  preco_torta: string; rec_prop_torta: string
  preco_soja: string; rec_prop_soja: string
  preco_vacinas: string; rec_prop_vacinas: string
  preco_racao_conc: string; rec_prop_racao_conc: string
  preco_sal_mineral: string; rec_prop_sal_mineral: string
  free_items: FreeItem[]
  preco_mao_obra: string; rec_prop_mao_obra: string
  assessoria_pct: string
  // Step 6
  data_parcela_1: string; data_parcela_2: string
  data_parcela_3: string; data_parcela_4: string
  cronograma: CronogramaData
  // Step 7
  receitas_bov: string[]
  receitas_ovi: string[]
  prazo_meses: string
  carencia_meses: string
  encargos_ao_ano: string
  periodicidade_reembolso: string
  periodo_lactacao: string
  producao_leite: string
  comentarios: string
  _step?: number
}

export interface ReferenceData {
  agencies: { name: string; code: string }[]
  programs: { name: string; group: string }[]
  municipios: string[]
  finalidades: { name: string; code: string }[]
  beneficiarios: { name: string; code: string }[]
  atividades: { name: string; code: string }[]
  usos: { name: string }[]
  unidades: { sigla: string; desc: string }[]
  grupos: string[]
  categorias: string[]
  periodicidades: string[]
}
