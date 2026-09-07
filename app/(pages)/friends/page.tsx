'use client'
// Ancienne route des Messages — redirige vers /messages (deep links, favoris
// navigateur, vieilles versions de l'app installées).
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FriendsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/messages')
  }, [router])
  return null
}
