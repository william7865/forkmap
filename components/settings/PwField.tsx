'use client'
// Champ mot de passe avec bouton œil — partagé par les deux écrans Réglages.
//
// Le web (AccountSettingsContent) et le natif (AccountSettingsNative) restent
// deux écrans distincts par choix (layout desktop vs lignes groupées iOS), mais
// ce champ-là était recopié à l'identique dans les deux : même état, même
// markup, même bouton. Seul l'HABILLAGE de l'input diffère — le natif passe par
// la classe `.input-field` (16px, anti-zoom iOS), le web par ses styles inline
// à 13.5px. D'où `inputClassName` / `inputStyle` : la logique est mutualisée,
// l'apparence de chaque page est préservée telle quelle.
import { Eye, EyeOff } from 'lucide-react'

/** Libellé de champ des Réglages — identique au caractère près dans les deux écrans. */
export const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  marginBottom: 8,
}

export default function PwField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  iconSize = 16,
  inputClassName,
  inputStyle,
  onFocus,
  onBlur,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
  iconSize?: number
  inputClassName?: string
  inputStyle?: React.CSSProperties
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className={inputClassName}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          onClick={onToggle}
          type="button"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            display: 'flex',
            padding: 2,
          }}
        >
          {show ? (
            <EyeOff size={iconSize} strokeWidth={2} />
          ) : (
            <Eye size={iconSize} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  )
}
