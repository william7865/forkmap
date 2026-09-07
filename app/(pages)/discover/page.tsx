'use client'
// Découvrir — le fil social en première classe : l'activité des amis et des
// tastemakers, avec les Messages à un tap (pattern DM d'un réseau social).
// App-only, même chaîne de gardes que /friends.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft, ChevronRight, MessageCircle, UserPlus } from 'lucide-react'
import { lightTap } from '@/lib/native/haptics'
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages'
import { useUnreadNotifications } from '@/lib/hooks/useUnreadNotifications'
import AppGate from '@/components/app/AppGate'
import FriendsView from '@/components/social/FriendsView'
import ActivityFeed from '@/components/social/ActivityFeed'
import SuggestionsRail from '@/components/social/SuggestionsRail'
import NotificationsSheet from '@/components/social/NotificationsSheet'
import PullToRefresh from '@/components/ui/PullToRefresh'
import { iconButtonStyle } from '@/lib/ui-styles'

export default function DiscoverPage() {
  const router = useRouter()
  const unread = useUnreadMessages()
  // Compteur de notifications non lues (même source que le masthead Messages).
  const { unread: unreadNotifs, markSeen } = useUnreadNotifications()
  const [addFriends, setAddFriends] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <AppGate>
      <main
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          paddingBottom: 'calc(var(--safe-bottom) + 96px)',
        }}
      >
        {/* En-tête éditorial — titre serif + Messages / Trouver des amis */}
        <div style={{ padding: 'calc(var(--safe-top) + var(--sp-4)) var(--gutter) 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              {/* Découvrir n'est plus un onglet : on y entre depuis le Carnet,
                 il lui faut donc un retour explicite. */}
              <button
                type="button"
                onClick={() => router.push('/')}
                aria-label="Retour au carnet"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  marginBottom: 6,
                  marginLeft: -4,
                  color: 'var(--text-3)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={17} strokeWidth={2.2} />
                Carnet
              </button>
              <h1
                className="anim-fade-up"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 34,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  color: 'var(--text)',
                }}
              >
                Découvrir
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                aria-label="Trouver des amis"
                onClick={() => setAddFriends(true)}
                style={iconButtonStyle()}
              >
                <UserPlus size={19} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label={
                  unreadNotifs > 0 ? `Notifications — ${unreadNotifs} non lues` : 'Notifications'
                }
                onClick={() => {
                  setShowNotifs(true)
                  markSeen()
                }}
                style={iconButtonStyle()}
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadNotifs > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 15,
                      height: 15,
                      padding: '0 4px',
                      borderRadius: 999,
                      background: '#e5484d',
                      color: '#fff',
                      fontSize: 9.5,
                      fontWeight: 700,
                      lineHeight: '15px',
                      textAlign: 'center',
                      border: '2px solid var(--surface)',
                    }}
                  >
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Entrée Messages — première classe : le chat à un tap, badge non-lus.
          (Remplace l'icône avion du header, trop discrète.) */}
        <button
          type="button"
          className="tap-press"
          onClick={() => {
            lightTap()
            router.push('/messages')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            width: '100%',
            minHeight: 60,
            padding: '0 20px',
            border: 'none',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageCircle size={18} strokeWidth={2} />
          </span>
          <span
            style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}
          >
            Messages
          </span>
          {unread > 0 && (
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 999,
                background: '#e5484d',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: '20px',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <ChevronRight
            size={17}
            strokeWidth={2}
            style={{ color: 'var(--text-4)', flexShrink: 0 }}
          />
        </button>

        {/* Pull-to-refresh : remonte le rail + le fil (les fetchs repartent). */}
        <PullToRefresh
          onRefresh={async () => {
            setRefreshKey((k) => k + 1)
            await new Promise((r) => setTimeout(r, 400))
          }}
        >
          <SuggestionsRail key={`s${refreshKey}`} onOpenAll={() => setAddFriends(true)} />
          <ActivityFeed key={`f${refreshKey}`} asPage onAddFriends={() => setAddFriends(true)} />
        </PullToRefresh>

        {addFriends && <FriendsView onClose={() => setAddFriends(false)} />}
        {showNotifs && <NotificationsSheet onClose={() => setShowNotifs(false)} />}
      </main>
    </AppGate>
  )
}
