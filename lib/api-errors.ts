const ERROR_MAP: Record<string, string> = {
  PGRST116: 'Aucun résultat trouvé.',
  '23505': 'Déjà enregistré.',
  '23503': 'Référence invalide.',
  '42501': 'Accès refusé.',
  '57014': 'Requête trop longue. Réessayez.',
  NETWORK: 'Problème de connexion. Réessayez.',
  UNAUTHORIZED: 'Connectez-vous pour continuer.',
}

export function friendlyError(raw: unknown): string {
  if (!raw) return 'Une erreur est survenue.'
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
  for (const [code, msg] of Object.entries(ERROR_MAP)) {
    if (str.includes(code)) return msg
  }
  if (str.toLowerCase().includes('fetch') || str.toLowerCase().includes('network')) {
    return ERROR_MAP.NETWORK
  }
  return 'Une erreur est survenue. Réessayez.'
}
