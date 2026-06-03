import { cn } from '@/lib/utils'

const STEPS = ['Dados do Cliente','Elaborador','Proposta','Animais','Itens Financ.','Desembolso','Receitas','Revisão']

interface Props { current: number; onGo: (n: number) => void }

export function WizardProgress({ current, onGo }: Props) {
  return (
    <div className="flex border-b border-zinc-100 overflow-x-auto bg-white shrink-0">
      {STEPS.map((label, i) => {
        const num = i + 1
        const active = num === current
        const done = num < current
        return (
          <button
            key={num}
            onClick={() => onGo(num)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-3 flex-1 min-w-[80px] border-b-2 transition-colors text-center',
              active ? 'border-zinc-900 text-zinc-900' : done ? 'border-transparent text-zinc-400' : 'border-transparent text-zinc-300'
            )}
          >
            <span className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
              active ? 'bg-zinc-900 text-white' : done ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-100 text-zinc-300'
            )}>{num}</span>
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
