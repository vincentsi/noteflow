'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth.provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Trash2, Shield, FileText } from 'lucide-react'
import { logError } from '@/lib/utils/logger'
import { gdprApi } from '@/lib/api/gdpr'
import { toast } from 'sonner'

export default function GDPRSettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleteReason, setDeleteReason] = useState('')

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const data = await gdprApi.exportData()

      // Download data as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `noteflow-data-export-${new Date().toISOString().split('T')[0]}.json`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()

      // Small delay to ensure download starts
      await new Promise(resolve => setTimeout(resolve, 100))

      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Your data has been exported successfully')
    } catch (error: unknown) {
      logError(error, 'GDPR Data Export')

      // Show specific error message if available
      const err = error as { response?: { data?: { error?: string } }; message?: string }
      const errorMessage = err.response?.data?.error || err.message || 'Failed to export data. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.email) {
      toast.error('User email not found')
      return
    }

    if (confirmEmail !== user.email) {
      toast.error('Email does not match your account email')
      return
    }

    setIsDeleting(true)
    try {
      await gdprApi.deleteAccount({
        confirmEmail,
        reason: deleteReason || undefined,
      })

      toast.success('Your account has been deleted successfully')

      // Logout and redirect to login
      logout()
      router.push('/login')
    } catch (error) {
      logError(error, 'GDPR Account Deletion')

      // Check for rate limit error
      if (error instanceof Error && error.message.includes('Rate limit')) {
        toast.error('You can only request account deletion once per day')
      } else {
        toast.error('Failed to delete account. Please try again.')
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GDPR & Privacy</h1>
        <p className="text-muted-foreground">
          Manage your personal data and privacy settings
        </p>
      </div>

      <div className="grid gap-4">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Export Your Data</CardTitle>
            </div>
            <CardDescription>
              Download a copy of all your personal data stored in our system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You have the right to receive a copy of your personal data in a structured,
              commonly used, and machine-readable format (JSON).
            </p>
            <Button onClick={handleExportData} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export My Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Your Rights</CardTitle>
            </div>
            <CardDescription>
              Under GDPR, you have the following rights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Right to access your personal data</li>
              <li>✓ Right to rectification of inaccurate data</li>
              <li>✓ Right to erasure (&quot;right to be forgotten&quot;)</li>
              <li>✓ Right to restriction of processing</li>
              <li>✓ Right to data portability</li>
              <li>✓ Right to object to processing</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data We Collect */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Data We Collect</CardTitle>
            </div>
            <CardDescription>
              Information we store about you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Account information (email, name)</li>
              <li>• Authentication data (hashed passwords, tokens)</li>
              <li>• Subscription information</li>
              <li>• Content data (notes, summaries, saved articles)</li>
              <li>• Usage data and logs</li>
              <li>• Payment information (processed by Stripe)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-500">Delete Account</CardTitle>
            </div>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Warning: This action cannot be undone. All your data will be permanently deleted
              from our systems, including your Stripe subscription.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action is <strong>IRREVERSIBLE</strong>. All your data will be permanently deleted:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Your account and profile</li>
                <li>All your notes and summaries</li>
                <li>All saved articles</li>
                <li>Your Stripe subscription</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">
                Confirm your email to continue
              </Label>
              <Input
                id="confirm-email"
                type="email"
                placeholder={user?.email || 'your@email.com'}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-reason">
                Reason for deletion (optional)
              </Label>
              <Input
                id="delete-reason"
                type="text"
                placeholder="Help us improve..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                disabled={isDeleting}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || !confirmEmail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
