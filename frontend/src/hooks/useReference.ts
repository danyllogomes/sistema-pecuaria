import { useEffect, useState } from 'react'
import type { ReferenceData } from '@/types'

let cached: ReferenceData | null = null

export function useReference() {
  const [data, setData] = useState<ReferenceData | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    fetch('/api/reference')
      .then(r => r.json())
      .then((d: ReferenceData) => { cached = d; setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { ref: data, loading }
}
