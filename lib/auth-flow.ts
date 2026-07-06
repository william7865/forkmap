export type FlowStep = 'welcome' | 'email' | 'signin' | 'handle' | 'avatar' | 'taste' | 'done'
export type FlowPath = 'signup_email' | 'signup_google' | 'signin'

export function resolveInitialStep(authed: boolean, hasProfile: boolean): FlowStep {
  return authed && !hasProfile ? 'handle' : 'welcome'
}

export function signupProgress(step: FlowStep): { index: number; total: number } | null {
  const order: FlowStep[] = ['email', 'handle', 'avatar', 'taste']
  const i = order.indexOf(step)
  return i === -1 ? null : { index: i + 1, total: order.length }
}
