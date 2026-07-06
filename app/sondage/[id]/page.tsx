// Server component — generateStaticParams is required for the static export
// (mobile build). The public poll page is opened from a shared link on the web;
// it reads the id client-side and fetches the poll, so the static export only
// needs a placeholder shell.
import PublicPoll from '@/components/poll/PublicPoll'

export function generateStaticParams() {
  return [{ id: '__placeholder__' }]
}

export default function PublicPollPage() {
  return <PublicPoll />
}
