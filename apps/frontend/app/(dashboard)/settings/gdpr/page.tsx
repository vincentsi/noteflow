'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/auth.provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Trash2, Shield, FileText } from 'lucide-react'

export default function GDPRSettingsPage() {
  const { user } = useAuth()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      // TODO: Call API to export user data
      // const response = await gdprApi.exportData()
      // downloadFile(response.data, 'my-data.json')

      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock data export
      const mockData = {
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          createdAt: new Date().toISOString(),
        },
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-data.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      // TODO: Call API to delete account
      // await gdprApi.deleteAccount()

      // Simulate deletion
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Account deletion requested. You will receive a confirmation email.')
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setIsDeleting(false)
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
              from our systems within 30 days.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? 'Processing...' : 'Delete My Account'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
