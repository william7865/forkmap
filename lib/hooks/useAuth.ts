// ============================================================
// lib/hooks/useAuth.ts
// Supabase Auth hook — email/password + Google OAuth
// Added: resetPassword() for "Forgot password?" flow
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

let _client: SupabaseClient | null = null
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!_client) _client = getClient()
  return _client
}

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
  /** Send a password reset email. Returns error string or null on success. */
  resetPassword: (email: string) => Promise<string | null>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const sb = getSupabaseBrowserClient()

  useEffect(() => {
    let initialised = false
    sb.auth
      .getSession()
      .then(({ data }) => {
        initialised = true
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      // Only update session state; loading is controlled solely by getSession()
      // to avoid redirecting before the session is restored from storage.
      setSession(session)
      setUser(session?.user ?? null)
      if (initialised) setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [sb])

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    [sb]
  )

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name?: string) => {
      // Where the confirmation-email link should land. /auth/callback
      // exchanges the `code` for a session (same handler as OAuth).
      const emailRedirectTo = Capacitor.isNativePlatform()
        ? 'com.forkmap.app://auth/callback'
        : typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined

      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo },
      })
      return error?.message ?? null
    },
    [sb]
  )

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Capacitor.isNativePlatform()
      ? 'com.forkmap.app://auth/callback'
      : typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined

    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    return error?.message ?? null
  }, [sb])

  const signOut = useCallback(async () => {
    await sb.auth.signOut()
  }, [sb])

  const resetPassword = useCallback(
    async (email: string) => {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'com.forkmap.app://auth/callback?next=/settings'
        : typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/settings`
          : undefined

      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      return error?.message ?? null
    },
    [sb]
  )

  return {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
  }
}
