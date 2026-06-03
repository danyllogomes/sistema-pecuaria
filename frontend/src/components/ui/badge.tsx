import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'success'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      variant === 'default' && 'bg-zinc-100 text-zinc-700',
      variant === 'outline' && 'border border-zinc-200 text-zinc-600',
      variant === 'success' && 'bg-emerald-50 text-emerald-700',
      className
    )} {...props} />
  )
}
