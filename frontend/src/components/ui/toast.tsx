import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitive.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn('fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 p-4', className)}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: 'default' | 'destructive' }
>(({ className, variant = 'default', ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-lg border px-4 py-3 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full text-sm font-medium',
      variant === 'default' && 'bg-zinc-900 text-white border-zinc-800',
      variant === 'destructive' && 'bg-red-600 text-white border-red-700',
      className
    )}
    {...props}
  />
))
Toast.displayName = ToastPrimitive.Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close ref={ref} className={cn('opacity-50 hover:opacity-100', className)} {...props}>
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
))
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-sm font-medium', className)} {...props} />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

export { ToastProvider, ToastViewport, Toast, ToastClose, ToastTitle }

// Toaster + hook
type ToastData = { id: string; message: string; variant?: 'default' | 'destructive' }
const listeners: ((t: ToastData) => void)[] = []
export function toast(message: string, variant: 'default' | 'destructive' = 'default') {
  const data: ToastData = { id: Date.now().toString(), message, variant }
  listeners.forEach(l => l(data))
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([])
  React.useEffect(() => {
    const add = (t: ToastData) => { setToasts(p => [...p, t]); setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3500) }
    listeners.push(add)
    return () => { const i = listeners.indexOf(add); if (i > -1) listeners.splice(i, 1) }
  }, [])
  return (
    <ToastProvider>
      {toasts.map(t => (
        <Toast key={t.id} variant={t.variant} open>
          <ToastTitle>{t.message}</ToastTitle>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
