import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Card as GlassCard, Button } from '@ledgr/ui'

// ── Admin panel section ───────────────────────────────────────────────────────

export function AdminPanelSection() {
  return (
    <GlassCard
      variant="glass"
      title="Admin Panel"
      subtitle="Manage users, plans, and system overview"
      icon={<Shield size={16} />}
    >
      <div style={{ padding: '14px 20px' }}>
        <Link to="/app/admin">
          <Button size="sm" variant="primary">
            <Shield size={12} style={{ marginRight: 4 }} /> Open Admin Panel
          </Button>
        </Link>
      </div>
    </GlassCard>
  )
}
