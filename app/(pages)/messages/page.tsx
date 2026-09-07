'use client'
// Messages — la boîte de réception DM (pattern réseau social : le fil vit dans
// Découvrir, les messages à un tap derrière). Ex-route /friends, renommée pour
// dire ce qu'elle affiche.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppGate from '@/components/app/AppGate'
import FriendsView from '@/components/social/FriendsView'
import MessagesInbox from '@/components/social/MessagesInbox'

export default function MessagesPage() {
  const router = useRouter()
  const [addFriends, setAddFriends] = useState(false)

  return (
    <AppGate>
      <MessagesInbox
        asPage
        onBack={() => router.push('/discover')}
        onAddFriends={() => setAddFriends(true)}
      />
      {addFriends && <FriendsView onClose={() => setAddFriends(false)} />}
    </AppGate>
  )
}
