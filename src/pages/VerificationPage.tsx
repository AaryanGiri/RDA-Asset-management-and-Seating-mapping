import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Sparkles, Check, Clock, AlertTriangle, CheckCircle2, Wrench, Cpu,
} from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, StatCard, Segmented, ConditionBadge, Modal, Field, Spinner, Progress, EmptyState } from '@/components/ui'
import { PhotoTile, CategoryIcon } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { CONDITION_META } from '@/lib/status'
import { useSimulatedLoad } from '@/hooks'
import { cn, daysBetween, formatDate } from '@/lib/utils'
import type { VerificationTask, AssetCondition } from '@/lib/types'

const CONDITIONS: AssetCondition[] = ['new', 'good', 'fair', 'damaged', 'beyond-repair']
type Tab = 'pending' | 'overdue' | 'completed'

export function VerificationPage() {
  const verifications = useData((s) => s.verifications)
  const [tab, setTab] = useState<Tab>('pending')
  const [taskId, setTaskId] = useState<string | null>(null)
  const loading = useSimulatedLoad(440)

  const counts = {
    pending: verifications.filter((v) => v.status === 'pending').length,
    overdue: verifications.filter((v) => v.status === 'overdue').length,
    completed: verifications.filter((v) => v.status === 'completed').length,
  }
  const total = verifications.length
  const compliance = Math.round((counts.completed / total) * 100)

  const rows = verifications.filter((v) => v.status === tab)

  return (
    <Page>
      <PageHeader
        title="Condition Verification"
        subtitle="Monthly AI-assisted cycle · every suggestion confirmed by a human"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={counts.pending} icon={<Clock className="h-5 w-5" />} accent="notice" sub="this cycle" />
        <StatCard label="Overdue" value={counts.overdue} icon={<AlertTriangle className="h-5 w-5" />} accent="occupied" sub="past due date" />
        <StatCard label="Completed" value={counts.completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="vacant" />
        <StatCard label="Compliance" value={`${compliance}%`} icon={<ShieldCheck className="h-5 w-5" />} accent="brand" delta={{ value: 'Aug cycle', up: true }} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: <span className="flex items-center gap-1.5">Pending <Count n={counts.pending} /></span> },
            { value: 'overdue', label: <span className="flex items-center gap-1.5">Overdue <Count n={counts.overdue} /></span> },
            { value: 'completed', label: <span className="flex items-center gap-1.5">Completed <Count n={counts.completed} /></span> },
          ]}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-9 w-9 rounded-lg" /><div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-40" /><div className="skeleton h-2.5 w-24" /></div><div className="skeleton h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6"><EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={`No ${tab} tasks`} body={tab === 'completed' ? 'Completed verifications will appear here.' : 'All caught up for this view.'} /></div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((v) => <VerifRow key={v.id} v={v} onVerify={() => setTaskId(v.id)} />)}
          </div>
        )}
      </div>

      {taskId && <VerifyTaskModal taskId={taskId} onClose={() => setTaskId(null)} />}
    </Page>
  )
}

function Count({ n }: { n: number }) {
  return <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-surface-3 px-1 text-2xs font-semibold text-muted">{n}</span>
}

function VerifRow({ v, onVerify }: { v: VerificationTask; onVerify: () => void }) {
  const assets = useData((s) => s.assets)
  const nav = useNavigate()
  const asset = assets.find((a) => a.id === v.assetId)
  const due = daysBetween(v.dueDate)
  return (
    <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
      <button onClick={() => nav(`/assets/${v.assetId}`)} className="flex flex-1 items-center gap-3 text-left">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">{asset && <CategoryIcon catId={asset.categoryId} className="h-4.5 w-4.5" />}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-content">{v.assetName}</p>
          <p className="truncate font-mono text-2xs text-muted">{v.assetTag} · {officeName(v.officeId)}</p>
        </div>
      </button>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-2xs text-subtle">Prior</p>
          <ConditionBadge condition={v.priorCondition} className="px-1.5 py-0.5 text-2xs" />
        </div>
        {v.status === 'completed' ? (
          <div className="flex items-center gap-2">
            {v.aiCondition && <ConditionBadge condition={v.aiCondition} className="px-1.5 py-0.5 text-2xs" />}
            <span className="chip bg-vacant-soft px-2 py-0.5 text-2xs text-vacant capitalize">{v.humanDecision?.replace('-', ' ')}</span>
          </div>
        ) : (
          <>
            <span className={cn('w-16 text-right text-xs font-medium', due <= 0 ? 'text-occupied' : due <= 5 ? 'text-maint' : 'text-muted')}>{due <= 0 ? `${Math.abs(due)}d over` : `${due}d left`}</span>
            <button onClick={onVerify} className="btn-primary h-8 text-xs"><Sparkles className="h-3.5 w-3.5" /> Verify</button>
          </>
        )}
      </div>
    </div>
  )
}

function VerifyTaskModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useData((s) => s.verifications.find((v) => v.id === taskId))
  const asset = useData((s) => s.assets.find((a) => a.id === task?.assetId))
  const runAIVerification = useData((s) => s.runAIVerification)
  const decideVerification = useData((s) => s.decideVerification)
  const [stage, setStage] = useState<'capture' | 'analyzing' | 'review'>('capture')
  const [ai, setAi] = useState<{ condition: AssetCondition; confidence: number } | null>(null)
  const [area, setArea] = useState<{ x: number; y: number; r: number } | null>(null)
  const [choice, setChoice] = useState<AssetCondition | null>(null)
  const [busy, setBusy] = useState(false)

  if (!task || !asset) return null

  const runAI = async () => {
    setStage('analyzing')
    const res = await runAIVerification(task.id)
    const updated = useData.getState().verifications.find((v) => v.id === task.id)
    setAi(res)
    setArea(updated?.aiChangeArea ?? null)
    setChoice(res.condition)
    setStage('review')
  }

  const commit = async (decision: VerificationTask['humanDecision']) => {
    if (!choice) return
    setBusy(true)
    await decideVerification(task.id, decision, choice)
    setBusy(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} width={540}>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Cpu className="h-5 w-5" /></div>
        <div><p className="text-sm font-semibold text-content">Verify {asset.name}</p><p className="text-xs text-muted">{asset.tag} · monthly condition check</p></div>
      </div>
      <div className="p-5">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-2xs font-medium text-subtle">Prior capture · {CONDITION_META[task.priorCondition].label}</p>
            <PhotoTile hue={asset.photos[0]?.hue ?? 200} view="Last month" catId={asset.categoryId} />
          </div>
          <div>
            <p className="mb-1.5 text-2xs font-medium text-subtle">New capture{stage === 'review' && area ? ' · change area' : ''}</p>
            <PhotoTile hue={(asset.photos[0]?.hue ?? 200) + 16} view="Today" catId={asset.categoryId} highlight={stage === 'review' ? area : null} />
          </div>
        </div>

        {stage === 'capture' && <button className="btn-primary w-full" onClick={runAI}><Sparkles className="h-4 w-4" /> Run AI condition check</button>}
        {stage === 'analyzing' && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 py-4">
            <Spinner className="h-5 w-5 text-brand" /><span className="text-sm font-medium text-content">Comparing against last capture…</span>
          </div>
        )}
        {stage === 'review' && ai && (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand/30 bg-brand-soft p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-content"><Sparkles className="h-4 w-4 text-brand" /> AI suggestion</span>
                <span className="chip bg-surface px-2 py-0.5 text-xs font-semibold text-content">{ai.confidence}% confidence</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ConditionBadge condition={ai.condition} />
                <span className="text-xs text-muted">{ai.condition === task.priorCondition ? 'No change detected' : `Changed from ${CONDITION_META[task.priorCondition].label}`}</span>
              </div>
              <div className="mt-2"><Progress value={ai.confidence} tone="brand" /></div>
              <p className="mt-2 text-2xs text-subtle">Assistive only — logged with image, suggestion & confidence. Admin decides.</p>
            </div>
            <Field label="Confirm condition">
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map((cd) => (
                  <button key={cd} onClick={() => setChoice(cd)} className={cn('chip border', choice === cd ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface-2 text-muted hover:text-content')}>{CONDITION_META[cd].label}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-primary" disabled={busy} onClick={() => commit('accepted')}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Accept</button>
              <button className="btn-secondary" disabled={busy} onClick={() => commit('accepted-remark')}>With remark</button>
              <button className="btn-secondary text-maint" disabled={busy} onClick={() => commit('flag-repair')}><Wrench className="h-4 w-4" /> Flag repair</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
