'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSummaryStatus } from '@/lib/hooks/useSummaries'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

const CREATION_STEPS = [
  { id: 'fetching', label: 'Fetching post', duration: 1500 },
  { id: 'analyzing', label: 'Analyzing post', duration: 2000 },
  { id: 'creating', label: 'Creating Power Post', duration: 7000 },
  { id: 'finding', label: 'Finding title', duration: 2500 },
  { id: 'generating', label: 'Generating cover', duration: 3000 },
  { id: 'publishing', label: 'Publishing post', duration: 20000 },
]

export default function SummaryCreatePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = searchParams.get('jobId')

  const [currentStep, setCurrentStep] = useState(0)

  const summaryStatus = useSummaryStatus(jobId)
  const status = summaryStatus.data?.data.status
  const summary = summaryStatus.data?.data.summary

  // Auto-progress through steps with smooth animation
  useEffect(() => {
    // If backend completed, skip to final step immediately
    if (status === 'completed') {
      setCurrentStep(CREATION_STEPS.length)
      return
    }

    // If still processing, progress through steps normally
    if (status === 'waiting' || status === 'active') {
      let totalDuration = 0
      const intervals: NodeJS.Timeout[] = []

      CREATION_STEPS.forEach((step, index) => {
        totalDuration += step.duration
        const timer = setTimeout(() => {
          setCurrentStep(index + 1)
        }, totalDuration)
        intervals.push(timer)
      })

      return () => {
        intervals.forEach(clearTimeout)
      }
    }
  }, [status])

  // Redirect to summary page when completed
  useEffect(() => {
    if (status === 'completed') {
      // Small delay to show completion state
      const timer = setTimeout(() => {
        if (summary?.id) {
          router.push(`/summaries/${summary.id}`)
        } else {
          // If no summary ID, redirect to summaries list
          router.push(`/summaries?my=true`)
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [status, summary?.id, jobId, router])

  // Redirect back if no jobId
  useEffect(() => {
    if (!jobId) {
      router.push('/summaries')
    }
  }, [jobId, router])

  // Redirect back if failed
  useEffect(() => {
    if (status === 'failed') {
      router.push('/summaries')
    }
  }, [status, router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-8 pb-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            We are creating the Power Post for you...
          </h2>

          <div className="space-y-4">
            {CREATION_STEPS.map((step, index) => {
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep
              const Icon = isCompleted ? CheckCircle2 : isCurrent ? Loader2 : Circle

              return (
                <div
                  key={step.id}
                  className="flex items-center gap-4 p-4 rounded-lg border transition-all"
                  style={{
                    backgroundColor: isCompleted ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                    borderColor:
                      isCompleted || isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  }}
                >
                  <div className="flex-shrink-0">
                    <Icon
                      className={`h-6 w-6 ${
                        isCompleted
                          ? 'text-primary'
                          : isCurrent
                            ? 'text-primary animate-spin'
                            : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-8">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(currentStep / CREATION_STEPS.length) * 100}%`,
                }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {currentStep} / {CREATION_STEPS.length} étapes complétées
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
