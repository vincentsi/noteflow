'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useUploadAudio, useTranscriptionUsage } from '@/lib/hooks/useTranscriptions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Mic, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/provider'

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export interface AudioUploadProps {
  onTranscriptionComplete?: () => void
}

export function AudioUpload({ onTranscriptionComplete }: AudioUploadProps) {
  const { t } = useI18n()
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const uploadAudio = useUploadAudio()
  const { data: usage } = useTranscriptionUsage()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('transcriptions.errors.fileTooLarge'))
        return
      }

      // Validate file type
      if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
        toast.error(t('transcriptions.errors.invalidFormat'))
        return
      }

      try {
        setUploadProgress(0)
        toast.info(t('transcriptions.uploading'))

        // Simulate progress (since we can't track actual multipart upload progress easily)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 300)

        await uploadAudio.mutateAsync(file)

        clearInterval(progressInterval)
        setUploadProgress(100)

        toast.success(t('transcriptions.uploadSuccess'))

        // Reset progress after a delay
        setTimeout(() => {
          setUploadProgress(0)
        }, 2000)

        // Callback to refresh notes list
        onTranscriptionComplete?.()
      } catch (error: unknown) {
        setUploadProgress(0)
        const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('common.messages.error')
        toast.error(errorMessage)
      }
    },
    [uploadAudio, onTranscriptionComplete, t]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const isUploading = uploadProgress > 0 && uploadProgress < 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          {t('transcriptions.uploadAudio')}
        </CardTitle>
        <CardDescription>
          {t('transcriptions.uploadDescription')}
          {usage && (
            <span className="block mt-1 text-xs">
              {t('transcriptions.usageInfo', { count: usage.count, limit: usage.limit })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('transcriptions.processing')} {uploadProgress}%
                  </p>
                </div>
              </>
            ) : uploadProgress === 100 ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('transcriptions.uploadSuccess')}
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? t('transcriptions.dropHere')
                      : t('transcriptions.dropOrClick')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('transcriptions.supportedFormats')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('transcriptions.maxSize')}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {usage && usage.remaining === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">{t('transcriptions.limitReached')}</p>
              <p className="text-xs mt-1">{t('transcriptions.upgradeMessage')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
