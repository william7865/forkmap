'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InfoPage } from '@/components/ui/PageLayout'
import { apiFetch } from '@/lib/api'

type Status = 'idle' | 'sending' | 'success' | 'error'

const TOPICS = [
  'Question générale',
  'Signaler un bug',
  'Suggestion de fonctionnalité',
  'Erreur de données (info erronée sur un restaurant)',
  'Problème de compte',
  'Autre',
]

export default function ContactContent() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const valid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    message.trim().length >= 10

  const handleSubmit = async () => {
    if (!valid) return
    setStatus('sending')
    setError('')

    try {
      const res = await apiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
        }),
      })

      if (res.status === 429) {
        setStatus('error')
        setError(
          'Trop de messages envoyés. Veuillez patienter quelques minutes avant de réessayer.'
        )
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'Échec de l’envoi. Veuillez réessayer ou nous écrire directement par e-mail.'
      )
    }
  }

  if (status === 'success') {
    return (
      <InfoPage>
        <div style={{ textAlign: 'center', padding: '60px 0 40px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--open-bg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}
          >
            ✉️
          </div>
          <h1
            style={{
              margin: '0 0 10px',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.04em',
              color: 'var(--text)',
            }}
          >
            Message envoyé !
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            Merci de nous avoir contactés, {name.split(' ')[0]}. Nous vous répondrons
            <br />à <strong style={{ color: 'var(--ink-80)' }}>{email}</strong> sous quelques jours.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => {
                setStatus('idle')
                setName('')
                setEmail('')
                setMessage('')
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: '1.5px solid var(--b2)',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-80)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Envoyer un autre message
            </button>
            <Link
              href="/carte"
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Retour à la carte
            </Link>
          </div>
        </div>
      </InfoPage>
    )
  }

  return (
    <InfoPage>
      <h1
        style={{
          margin: '0 0 16px',
          fontSize: 'clamp(28px, 7vw, 36px)',
          fontWeight: 600,
          letterSpacing: '-0.05em',
          lineHeight: 1.2,
          color: 'var(--text)',
          maxWidth: 480,
          textWrap: 'balance',
        }}
      >
        Contactez-nous
      </h1>
      <p
        style={{
          margin: '0 0 44px',
          fontSize: 16,
          color: 'var(--text-2)',
          lineHeight: 1.75,
          maxWidth: 560,
        }}
      >
        Une question, une erreur de données repérée ou une fonctionnalité à suggérer&nbsp;? Nous
        lisons chaque message.
      </p>

      {/* The page container matches the other info pages; the form keeps its own measure. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>
        {/* Name + Email row — stacks below ~500px rather than squeezing two inputs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          <Field label="Votre nom" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              aria-label="Votre nom"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
            />
          </Field>
          <Field label="Adresse e-mail" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean@exemple.com"
              aria-label="Adresse e-mail"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
            />
          </Field>
        </div>

        {/* Topic */}
        <Field label="Sujet">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Sujet"
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        {/* Message */}
        <Field label="Message" required hint="Au moins 10 caractères">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dites-nous ce que vous avez en tête…"
            rows={5}
            aria-label="Message"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
            onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
          />
          <div
            style={{
              textAlign: 'right',
              marginTop: 4,
              fontSize: 11,
              color: message.length >= 10 ? 'var(--open)' : 'var(--text-3)',
            }}
          >
            {message.length} / 10 min.
          </div>
        </Field>

        {error && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--coral)', fontWeight: 600 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!valid || status === 'sending'}
          style={{
            padding: '13px 24px',
            borderRadius: 12,
            background: valid ? 'var(--accent)' : 'var(--surface-2)',
            // --text-3 on --surface-2 is 4.15:1; disabled controls are WCAG-exempt
            // but the label still has to be readable.
            color: valid ? 'var(--on-accent)' : 'var(--text-2)',
            border: 'none',
            cursor: valid ? 'pointer' : 'not-allowed',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            boxShadow: valid ? '0 4px 16px rgba(25,28,29,0.15)' : 'none',
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {status === 'sending' ? (
            <>
              <Spinner /> Envoi…
            </>
          ) : (
            'Envoyer le message →'
          )}
        </button>

        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
          Vous pouvez aussi nous écrire directement à{' '}
          <a
            href="mailto:hello@forkmap.app"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
          >
            hello@forkmap.app
          </a>
        </p>
      </div>
    </InfoPage>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-80)', letterSpacing: '0.01em' }}
      >
        {label}
        {required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
        {hint && (
          <span style={{ fontWeight: 500, color: 'var(--text-3)', marginLeft: 6 }}>{hint}</span>
        )}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid var(--on-accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--b2)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 120ms, box-shadow 120ms',
}
const focusStyle: React.CSSProperties = {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 3px rgba(25,28,29,0.15)',
}
const blurStyle: React.CSSProperties = {
  borderColor: 'var(--b2)',
  boxShadow: 'none',
}
