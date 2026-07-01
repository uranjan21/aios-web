import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Input, Select, Button } from '@ledgr/ui'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { businessApi } from '@/api/areas'
import type { Business } from '@/types'
import styled from 'styled-components'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'

const FormField = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const DangerZone = styled.div`
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const DangerTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.destructive};
  margin-bottom: 6px;
`

const DangerDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 10px;
`

export function BusinessSettingsTab({ business, onDeleted }: { business: Business; onDeleted: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(business.name)
  const [businessType, setBusinessType] = useState(business.business_type)
  const [description, setDescription] = useState(business.description ?? '')
  const [color, setColor] = useState(business.color)

  const updateMutation = useMutation({
    mutationFn: () => businessApi.update(business.id, { name, business_type: businessType, description, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'list'] })
      toast.success('Business updated')
    },
    onError: () => toast.error('Failed to update business'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => businessApi.delete(business.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'list'] })
      toast.success('Business deleted')
      onDeleted()
    },
    onError: () => toast.error('Failed to delete business'),
  })

  return (
    <WorkspaceLayout rail={undefined}>
      <Card title="Business Details" subtitle="Name, type, description, and theme color" icon={<SettingsIcon size={16} />}>
      <div style={{ padding: '16px 20px' }}>
        <form onSubmit={e => { e.preventDefault(); updateMutation.mutate() }}>
          <FormField>
            <Label>Business Name</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} required />
          </FormField>
          <FormField>
            <Label>Business Type</Label>
            <Select
              value={businessType}
              onChange={(val: any) => setBusinessType(val as Business['business_type'])}
              options={[
                { label: 'SaaS', value: 'saas' },
                { label: 'Agency', value: 'agency' },
                { label: 'E-commerce', value: 'ecommerce' },
                { label: 'Content Creator', value: 'content' },
                { label: 'Freelance', value: 'freelance' },
              ]}
            />
          </FormField>
          <FormField>
            <Label>Description</Label>
            <Input value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="What does your business do?" />
          </FormField>
          <FormField>
            <Label>Theme Color</Label>
            <input
              type="color"
              value={color}
              onChange={(e: any) => setColor(e.target.value)}
              style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
            />
          </FormField>
          <Button type="submit" variant="primary" size="sm" loading={updateMutation.isPending}>Save Changes</Button>
        </form>

        <DangerZone>
          <DangerTitle>Delete business</DangerTitle>
          <DangerDesc>Permanently remove this business and its event history. This cannot be undone.</DangerDesc>
          <Popconfirm title="Delete this business?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button variant="destructive" size="sm">
              <Trash2 size={12} style={{ marginRight: 4 }} /> Delete Business
            </Button>
          </Popconfirm>
        </DangerZone>
      </div>
      </Card>
    </WorkspaceLayout>
  )
}
