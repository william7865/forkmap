'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'
import { validateUsername } from '@/lib/username'
import { resolveInitialStep, signupProgress, type FlowStep, type FlowPath } from '@/lib/auth-flow'

export function useAuthFlow(onDone: () => void) {
  const auth = useAuth()
  const { profile, ready, checkUsername, createProfile, pickAndUploadAvatar } = useProfile()

  const [step, setStep] = useState<FlowStep>('welcome')
  const [path, setPath] = useState<FlowPath>('signup_email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Resume at handle when authed but profileless (Google return / legacy).
  const resumedRef = useRef(false)
  useEffect(() => {
    if (resumedRef.current || !ready) return
    if (auth.user && !profile) {
      resumedRef.current = true
      const meta = auth.user.user_metadata ?? {}
      setDisplayName((meta.full_name as string) ?? (meta.name as string) ?? '')
      setAvatarUrl((meta.avatar_url as string) ?? (meta.picture as string) ?? null)
      setStep('handle')
    }
  }, [ready, auth.user, profile])

  const reset = () => {
    setError(null)
    setBusy(false)
  }
  const goWelcome = () => {
    reset()
    setStep('welcome')
  }
  const startEmailSignup = () => {
    reset()
    setPath('signup_email')
    setStep('email')
  }
  const startSignin = () => {
    reset()
    setPath('signin')
    setStep('signin')
  }
  const startGoogle = async () => {
    reset()
    setPath('signup_google')
    setBusy(true)
    const err = await auth.signInWithGoogle()
    if (err) {
      setError(err)
      setBusy(false)
    }
    // success → redirects out; on return the resume effect lands on 'handle'.
  }
  const back = () => {
    reset()
    if (step === 'email' || step === 'signin') setStep('welcome')
    else if (step === 'avatar') setStep('handle')
    // 'handle' has no back when it's the resumed Google entry → keep welcome.
    else if (step === 'handle') setStep(path === 'signup_email' ? 'email' : 'welcome')
  }

  const submitHandle = () => {
    setError(null)
    const v = validateUsername(username)
    if (!v.ok) {
      setError(v.reason)
      return
    }
    if (!displayName.trim()) {
      setError('Indique ton nom.')
      return
    }
    setStep('avatar')
  }

  const submitEmail = async () => {
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError("L'adresse e-mail et le mot de passe sont requis.")
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setBusy(true)
    const err = await auth.signUpWithEmail(email, password, '')
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setStep('handle')
  }

  return {
    auth,
    profile,
    checkUsername,
    createProfile,
    pickAndUploadAvatar,
    step,
    path,
    busy,
    error,
    email,
    password,
    username,
    displayName,
    avatarUrl,
    setEmail,
    setPassword,
    setUsername,
    setDisplayName,
    setAvatarUrl,
    setError,
    setBusy,
    setStep,
    goWelcome,
    startEmailSignup,
    startSignin,
    startGoogle,
    back,
    submitHandle,
    submitEmail,
    onDone,
    initialStep: resolveInitialStep(!!auth.user, !!profile),
    progress: signupProgress(step),
  }
}
