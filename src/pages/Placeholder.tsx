import { Hammer } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, EmptyState } from '@/components/ui'

export function Placeholder({ title }: { title: string }) {
  return (
    <Page>
      <PageHeader title={title} subtitle="Concept module" />
      <EmptyState icon={<Hammer className="h-5 w-5" />} title={`${title} — coming together`} body="This screen is being assembled in the demo build." />
    </Page>
  )
}
