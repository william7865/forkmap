'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'
import { validateUsername } from '@/lib/username'
import { signupProgress, type FlowStep, type FlowPath } from '@/lib/auth-flow'

export function useAuthFlow(onDone: () => void) {
  const auth = useAuth()
  const { profile, ready, checkUsername, createProfile, pickAndUploadAvatar } = useProfile()

  const [step, setStep] = useState<FlowStep>('welcome')
  const [path, setPath] = useState<FlowPath>('signup_email')
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [resumed, setResumed] = useState(false)

  // Resume at handle when authed but profileless (Google return / legacy).
  const resumedRef = useRef(false)
  useEffect(() => {
    if (resumedRef.current || !ready || step !== 'welcome') return
    if (auth.user && !profile) {
      resumedRef.current = true
      setResumed(true)
      setPath('signup_google')
      const meta = auth.user.user_metadata ?? {}
      setDisplayName((meta.full_name as string) ?? (meta.name as string) ?? '')
      setAvatarUrl((meta.avatar_url as string) ?? (meta.picture as string) ?? null)
      setStep('handle')
    }
  }, [ready, auth.user, profile, step])

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

  const pickAvatar = async () => {
    setError(null)
    setAvatarBusy(true)
    try {
      const url = await pickAndUploadAvatar()
      if (url) setAvatarUrl(url)
    } catch {
      setError('Échec de la photo. Réessaie.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const submitAvatar = async () => {
    setError(null)
    setBusy(true)
    try {
      const r = await createProfile({
        username,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      })
      if (!r.ok) {
        setError(
          r.error === 'username_taken'
            ? 'Ce pseudo est déjà pris.'
            : (r.error ?? 'Une erreur est survenue.')
        )
        setStep('handle')
        return
      }
      setStep('done')
    } catch {
      setError('Connexion impossible. Réessaie.')
      setStep('handle')
    } finally {
      setBusy(false)
    }
  }

  const [resetSent, setResetSent] = useState(false)

  const submitSignin = async () => {
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('E-mail et mot de passe requis.')
      return
    }
    setBusy(true)
    try {
      const err = await auth.signInWithEmail(email, password)
      if (err) {
        setError(err)
        return
      }
      onDone()
    } catch {
      setError('Connexion impossible. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  const sendReset = async () => {
    setError(null)
    if (!email.trim()) {
      setError('Saisis ton adresse e-mail.')
      return
    }
    setBusy(true)
    try {
      const err = await auth.resetPassword(email)
      if (err) {
        setError(err)
        return
      }
      setResetSent(true)
    } catch {
      setError('Envoi impossible. Réessaie.')
    } finally {
      setBusy(false)
    }
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
    try {
      const err = await auth.signUpWithEmail(email, password, '')
      if (err) {
        setError(err)
        return
      }
      setStep('handle')
    } catch {
      setError('Connexion impossible. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return {
    auth,
    profile,
    checkUsername,
    createProfile,
    pickAndUploadAvatar,
    step,
    path,
    resumed,
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
    avatarBusy,
    pickAvatar,
    submitAvatar,
    goWelcome,
    startEmailSignup,
    startSignin,
    startGoogle,
    back,
    submitHandle,
    submitEmail,
    resetSent,
    setResetSent,
    submitSignin,
    sendReset,
    onDone,
    progress: signupProgress(step),
  }
}
