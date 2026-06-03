import { NavLink } from 'react-router-dom'
import { Users, UserCircle, Sprout, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Visão Geral', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/minhas-informacoes', label: 'Minhas Informações', icon: UserCircle },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-zinc-100 flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-zinc-100">
        <Sprout className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-semibold text-zinc-900 leading-tight">Agro Projetos</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
