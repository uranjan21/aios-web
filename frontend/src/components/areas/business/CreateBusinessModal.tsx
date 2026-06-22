import React, { useState } from 'react'
import { Dialog, Button, Input, Select } from '@ledgr/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/api/areas'
import styled from 'styled-components'

const FormField = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'inherit'};
`

import { toast } from 'sonner'

export function CreateBusinessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('saas')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#8B5CF6')

  const createMutation = useMutation({
    mutationFn: businessApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'list'] })
      setName('')
      setBusinessType('saas')
      setDescription('')
      setColor('#8B5CF6')
      toast.success('Business created successfully')
      onClose()
    },
    onError: (error) => {
      console.error(error)
      toast.error('Failed to create business')
    }
  })

  const handleOpenChange = (visible: boolean) => {
    if (!visible) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title="Create New Business">
      <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ name, business_type: businessType, description, color }) }}>
        <div style={{ padding: '20px 0' }}>
          <FormField>
            <Label>Business Name</Label>
            <Input 
              value={name} 
              onChange={(e: any) => setName(e.target.value)} 
              placeholder="Acme Corp"
              required 
            />
          </FormField>
          <FormField>
            <Label>Business Type</Label>
            <Select
              value={businessType}
              onChange={(val: any) => setBusinessType(val as string)}
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
            <Input 
              value={description} 
              onChange={(e: any) => setDescription(e.target.value)} 
              placeholder="What does your business do?" 
            />
          </FormField>
          <FormField>
            <Label>Theme Color</Label>
            <input 
              type="color" 
              value={color} 
              onChange={(e: any) => setColor(e.target.value)}
              style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            />
          </FormField>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={createMutation.isPending} disabled={!name}>
            Create Business
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
