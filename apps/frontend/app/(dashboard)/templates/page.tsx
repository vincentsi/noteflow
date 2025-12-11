'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/auth.provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '@/lib/api/templates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import type { SummaryTemplate, CreateTemplateParams } from '@/lib/api/templates'

export default function TemplatesPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SummaryTemplate | null>(null)
  const [formData, setFormData] = useState<CreateTemplateParams>({
    name: '',
    description: '',
    prompt: '',
    icon: '',
  })

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getTemplates(),
    enabled: isAuthenticated,
  })

  // Fetch quota
  const { data: quotaData } = useQuery({
    queryKey: ['template-quota'],
    queryFn: () => templatesApi.getQuota(),
    enabled: isAuthenticated,
  })

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateParams) => templatesApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-quota'] })
      toast.success(t('templates.messages.createSuccess'))
      setIsCreateDialogOpen(false)
      resetForm()
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || t('templates.messages.createError')
      toast.error(message)
    },
  })

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateParams }) =>
      templatesApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success(t('templates.messages.updateSuccess'))
      setEditingTemplate(null)
      resetForm()
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || t('templates.messages.updateError')
      toast.error(message)
    },
  })

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-quota'] })
      toast.success(t('templates.messages.deleteSuccess'))
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || t('templates.messages.deleteError')
      toast.error(message)
    },
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', prompt: '', icon: '' })
  }

  const handleCreate = () => {
    createMutation.mutate(formData)
  }

  const handleUpdate = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData })
    }
  }

  const handleEdit = (template: SummaryTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      prompt: template.prompt,
      icon: template.icon || '',
    })
  }

  const handleDelete = (template: SummaryTemplate) => {
    if (confirm(t('templates.messages.deleteConfirmMessage'))) {
      deleteMutation.mutate(template.id)
    }
  }

  const templates = templatesData?.data.templates || []
  const quota = quotaData?.data.quota
  const canCreateMore = quota?.remaining === 'unlimited' || (typeof quota?.remaining === 'number' && quota.remaining > 0)

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('common.messages.loginRequired')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('templates.title')}</h1>
          <p className="text-muted-foreground">{t('templates.subtitle')}</p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={!canCreateMore}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('templates.createTemplate')}
        </Button>
      </div>

      {/* Quota */}
      {quota && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {quota.limit === 'unlimited'
                    ? t('templates.quota.unlimited')
                    : t('templates.quota.used', { used: quota.used, limit: quota.limit })}
                </p>
                {!canCreateMore && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('templates.messages.quotaReached')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('templates.empty')}</h3>
            <p className="text-muted-foreground mb-4">{t('templates.emptySubtitle')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {template.icon && <span className="text-2xl">{template.icon}</span>}
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.isDefault && (
                        <span className="text-xs text-muted-foreground">
                          {t('templates.systemTemplates')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!template.isDefault && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {template.description && (
                  <CardDescription className="mt-2">{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{template.prompt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false)
            setEditingTemplate(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('templates.editTemplate') : t('templates.createTemplate')}
            </DialogTitle>
            <DialogDescription>
              {t('templates.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('templates.form.nameLabel')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('templates.form.namePlaceholder')}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">{t('templates.form.iconLabel')}</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder={t('templates.form.iconPlaceholder')}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('templates.form.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('templates.form.descriptionPlaceholder')}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">{t('templates.form.promptLabel')}</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder={t('templates.form.promptPlaceholder')}
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{t('templates.form.promptHint')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setEditingTemplate(null)
                resetForm()
              }}
            >
              {t('templates.form.cancelButton')}
            </Button>
            <Button
              onClick={editingTemplate ? handleUpdate : handleCreate}
              disabled={
                !formData.name.trim() ||
                !formData.prompt.trim() ||
                formData.prompt.length < 10 ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? editingTemplate
                  ? t('templates.form.saving')
                  : t('templates.form.creating')
                : editingTemplate
                  ? t('templates.form.saveButton')
                  : t('templates.form.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
