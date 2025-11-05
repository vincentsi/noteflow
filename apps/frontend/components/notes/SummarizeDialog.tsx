'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StyleSelector, type SummaryStyle } from '@/components/summaries/StyleSelector'
import { useCreateSummaryFromNote } from '@/lib/hooks/useSummaries'
import { useAuth } from '@/providers/auth.provider'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/provider'
import type { Note } from '@/lib/api/notes'

export interface SummarizeDialogProps {
  note: Note | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SummarizeDialog({ note, open, onOpenChange }: SummarizeDialogProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const router = useRouter()
  const [selectedStyle, setSelectedStyle] = useState<SummaryStyle>('SHORT')
  const createSummary = useCreateSummaryFromNote()

  const handleSummarize = async () => {
    if (!note) return

    try {
      const result = await createSummary.mutateAsync({
        noteId: note.id,
        style: selectedStyle,
        language: user?.language as 'fr' | 'en' | undefined,
      })

      toast.success(t('summaries.jobCreated'))
      onOpenChange(false)

      // Navigate to summary creation page with progress
      if (result.data.jobId) {
        router.push(`/summaries/create?jobId=${result.data.jobId}`)
      }
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('common.messages.error')
      toast.error(errorMessage)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('notes.summarize.title')}</DialogTitle>
          <DialogDescription>{t('notes.summarize.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-3">{t('summaries.selectStyle')}</h4>
            <StyleSelector value={selectedStyle} onChange={setSelectedStyle} />
          </div>

          {note && (
            <div className="border border-border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium mb-1">{note.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{note.content}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createSummary.isPending}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleSummarize} disabled={createSummary.isPending}>
            {createSummary.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('summaries.generating')}
              </>
            ) : (
              t('notes.summarize.action')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
