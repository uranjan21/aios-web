import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Rocket, Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { AreaSettingsPage } from '@/components/layout/AreaSettingsPage'
import { businessApi } from '@/api/areas'
import { Card, Input, Select, Button, Stack, Label } from '@ledgr/ui'
import { Popconfirm } from '@/components/ui/Popconfirm'
import type { Business } from '@/types'
import styled from 'styled-components'

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

function BusinessDetailsForm({ business }: { business: Business }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(business.name)
  const [businessType, setBusinessType] = useState(business.business_type)
  const [description, setDescription] = useState(business.description ?? '')
  const [color, setColor] = useState(business.color)
  const navigate = useNavigate()

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
      navigate('/app/areas/business')
    },
    onError: () => toast.error('Failed to delete business'),
  })

  return (
    <Card title="Business Details" subtitle="Name, type, description, and theme color" icon={<SettingsIcon size={16} />}>
      <div style={{ padding: '16px 20px' }}>
        <form onSubmit={e => { e.preventDefault(); updateMutation.mutate() }}>
          <Stack gap={4}>
            <Stack gap={2}>
              <Label>Business Name</Label>
              <Input value={name} onChange={(e: any) => setName(e.target.value)} required />
            </Stack>
            <Stack gap={2}>
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
            </Stack>
            <Stack gap={2}>
              <Label>Description</Label>
              <Input value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="What does your business do?" />
            </Stack>
            <Stack gap={2}>
              <Label>Theme Color</Label>
              <input
                type="color"
                value={color}
                onChange={(e: any) => setColor(e.target.value)}
                style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
              />
            </Stack>
          </Stack>
          <div style={{ marginTop: 24 }}>
            <Button type="submit" variant="primary" size="sm" loading={updateMutation.isPending}>Save Changes</Button>
          </div>
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
  )
}

export function BusinessSettingsPage() {
  const { id } = useParams()
  
  const { data: businesses } = useQuery({
    queryKey: ['business', 'list'],
    queryFn: businessApi.list,
  })

  const business = businesses?.find(b => b.id === id)

  if (!business) return null

  return (
    <AreaSettingsPage
      icon={<Rocket color={business.color} />}
      title="Business Settings"
      subtitle={`Manage settings for ${business.name}`}
      backTo="/app/areas/business"
      groups={[
        {
          label: 'General',
          items: [
            {
              key: 'details',
              label: 'Details',
              icon: <SettingsIcon size={15} />,
              content: <BusinessDetailsForm business={business} />,
            }
          ],
        }
      ]}
    />
  )
}
