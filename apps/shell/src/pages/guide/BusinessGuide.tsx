import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code } from '@aios/shared/components/ui/DocStyles'

export function BusinessGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={Rocket}>Business & Startup Guide</DocH1>
        <DocP>
          The Business area serves as the control center for your product or startup. It connects raw financial runway metrics with product shipment velocity, allowing you to correlate development effort directly with revenue growth.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Summary Dashboard</DocH2>
        <DocP>
          The <Code>SummaryTab</Code> provides an instant pulse check on your product. It tracks the name of the last shipped feature and displays a dynamic financial status banner (e.g., motivating you if you are pre-revenue, or celebrating if you are revenue-generating).
        </DocP>
        
        <DocH3>MRR Trend Analysis</DocH3>
        <DocP>
          The centerpiece of the summary is the interactive <Code>MrrTrendCard</Code>, rendered via Highcharts. This area-spline chart tracks your Monthly Recurring Revenue (MRR) over time.
        </DocP>
        <DocUl>
          <DocLi><strong>Event Correlation:</strong> Hovering over any data point reveals the amount and the specific event (e.g., "Launched v2.0") that drove the change.</DocLi>
          <DocLi><strong>ARR Calculation:</strong> Annual Recurring Revenue is automatically extrapolated and displayed in the KPI tiles alongside current MRR.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Runway Calculator</DocH2>
        <DocP>
          A vital widget for any early-stage venture, the Runway Calculator operates on your Dashboard to prevent financial surprises.
        </DocP>
        <DocUl>
          <DocLi>Input your <strong>Current Cash Reserves</strong> and your <strong>Monthly Burn Rate</strong>.</DocLi>
          <DocLi>The widget dynamically outputs how many months of runway remain.</DocLi>
          <DocLi>A visual health indicator will turn <strong style={{ color: '#d97706' }}>amber or red</strong> if your runway dips below the critical 6-month threshold.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Product Event Log</DocH2>
        <DocP>
          The <Code>EventsTab</Code> acts as a highly structured company changelog.
        </DocP>
        <DocP>
          By categorizing events into <Code>Feature Shipped</Code>, <Code>Decision</Code>, <Code>Revenue</Code>, <Code>Blocker</Code>, and <Code>Milestone</Code>, you build a searchable history of your company's evolution.
        </DocP>
        
        <DocAlert title="Tracking Revenue Events" type="info">
          When logging a new event, choose the <strong>Revenue</strong> event type to record revenue milestones. These events appear in the Event Timeline and help correlate product activity with MRR changes.
        </DocAlert>
      </DocSection>

    </motion.div>
  )
}
