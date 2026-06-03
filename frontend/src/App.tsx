import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { OverviewPage } from '@/pages/OverviewPage'
import { ClientesPage } from '@/pages/ClientesPage'
import { ClienteViewPage } from '@/pages/ClienteViewPage'
import { MinhasInformacoesPage } from '@/pages/MinhasInformacoesPage'
import { WizardModal } from '@/components/wizard/WizardModal'
import { Toaster } from '@/components/ui/toast'
import { useWizardStore } from '@/store/wizardStore'
import { useReference } from '@/hooks/useReference'
import type { MinhaInfo } from '@/types'

function Inner() {
  const [minhaInfo, setMinhaInfo] = useState<MinhaInfo | null>(null)
  const { open } = useWizardStore()
  const { ref } = useReference()

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="clientes" element={<ClientesPage minhaInfo={minhaInfo} />} />
          <Route path="clientes/:id" element={<ClienteViewPage minhaInfo={minhaInfo} />} />
          <Route path="minhas-informacoes" element={<MinhasInformacoesPage onSaved={setMinhaInfo} />} />
        </Route>
      </Routes>
      {open && <WizardModal refData={ref} />}
      <Toaster />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Inner />
    </BrowserRouter>
  )
}
