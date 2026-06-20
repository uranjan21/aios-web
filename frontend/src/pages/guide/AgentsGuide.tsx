import { motion } from 'framer-motion'
import { Bot, Terminal, Play, Settings2 } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code, Kbd } from '@/components/ui/DocStyles'

export function AgentsGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={Bot}>Autonomous Agents</DocH1>
        <DocP>
          Agents are pre-configured autonomous sub-processes that run in the background of your workspace. While the Chat interface is conversational and synchronous, Agents are task-oriented and asynchronous, seeded directly by the system to handle specific domains.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Agent Dashboard</DocH2>
        <DocP>
          Navigate to the Agents tab to view your active fleet. Each agent is displayed as a sleek status card containing vital telemetry.
        </DocP>
        
        <DocUl>
          <DocLi><strong>Status Indicators:</strong> Real-time visual feedback showing if an agent is <Code>idle</Code>, <Code>running</Code> (with a glowing pulse animation), <Code>success</Code>, or in an <Code>error</Code> state.</DocLi>
          <DocLi><strong>Schedules:</strong> View the cron schedule for automated agents and see when they last ran.</DocLi>
          <DocLi><strong>Active Toggle:</strong> Use the toggle switch to easily pause or enable an agent's background cron schedule without deleting the agent entirely.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Manual Triggers & Live Terminal</DocH2>
        
        <DocH3>Triggering Agents</DocH3>
        <DocP>
          You don't have to wait for an agent's scheduled cron job. Click the <strong>Run</strong> button (<Play size={12} style={{ display: 'inline', color: '#1e50d0', verticalAlign: 'middle' }} />) on any agent card to manually trigger its workflow immediately.
        </DocP>

        <DocH3>Live Terminal Drawer</DocH3>
        <DocP>
          Want to see exactly what the agent is "thinking" or executing? Click the terminal icon (<Terminal size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />).
        </DocP>
        <DocP>
          This slides open a dedicated <strong>Terminal Drawer</strong>. It features a dark, monospace environment that streams the agent's live output, logs, and thought processes exactly as they happen in the backend.
        </DocP>
      </DocSection>

      <DocSection>
        <DocAlert title="How are Agents created?" type="info">
          Currently, agents are pre-seeded by the backend infrastructure based on your active modules (like the Finance AI Insights engine or the Career Skill-Gap analyzer). Custom UI-based agent creation is locked in the current build to ensure system stability.
        </DocAlert>
      </DocSection>

    </motion.div>
  )
}
