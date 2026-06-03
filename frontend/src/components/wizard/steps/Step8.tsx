import { StepCard } from './shared'
import { CheckCircle } from 'lucide-react'
import type { WizardFormData } from '@/types'

interface Props { data: WizardFormData }

const sections = [
  { title: 'Cliente', fields: [['nome_cliente','Nome'],['cpf_cnpj_cliente','CPF/CNPJ'],['telefone_cliente','Telefone'],['municipio_uf','Município-UF'],['endereco','Endereço']] },
  { title: 'Elaborador', fields: [['empresa_elaborador','Empresa'],['tecnico_responsavel','Técnico'],['crea','CREA'],['data_elaboracao','Data']] },
  { title: 'Proposta', fields: [['agencia','Agência'],['grupo','Grupo'],['programa_credito','Programa'],['finalidade_credito','Finalidade'],['atividade_principal','Atividade']] },
  { title: 'Contrato', fields: [['prazo_meses','Prazo (m)'],['carencia_meses','Carência (m)'],['encargos_ao_ano','Encargos (%)'],['periodicidade_reembolso','Periodicidade']] },
] as const

export function Step8({ data }: Props) {
  return (
    <StepCard icon={<CheckCircle className="h-4 w-4" />} title="Revisão da Proposta">
      <p className="text-xs text-zinc-400 mb-5">Verifique os dados abaixo antes de gerar a planilha. Clique nos passos acima para corrigir qualquer informação.</p>
      <div className="space-y-5">
        {sections.map(sec => (
          <div key={sec.title}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">{sec.title}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sec.fields.map(([k, label]) => (
                <div key={k} className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-zinc-800 truncate">{(data as unknown as Record<string, string>)[k] || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center text-sm text-emerald-700">
        Clique em <strong>Baixar .xlsm</strong> no rodapé para gerar a planilha com todos os dados preenchidos.
      </div>
    </StepCard>
  )
}
