import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code, Kbd } from '@/components/ui/DocStyles'

export function ContentGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={PenLine}>Content Creation Guide</DocH1>
        <DocP>
          The Content area acts as a command center for creators and thought leaders. It replaces clunky spreadsheets by merging a visual Kanban pipeline with advanced AI drafting capabilities and local markdown integrations.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Kanban Pipeline</DocH2>
        <DocP>
          Managing the lifecycle of your posts is handled by a drag-and-drop board powered by <Code>@dnd-kit/core</Code>.
        </DocP>
        <DocUl>
          <DocLi><strong>Status Flow:</strong> Drag cards from <em>Ideas</em> → <em>In Progress</em> → <em>Scheduled</em> → <em>Published</em>.</DocLi>
          <DocLi><strong>In-line Scheduling:</strong> Click on any card in the pipeline to set a specific <Code>YYYY-MM-DD</Code> schedule date without opening a modal.</DocLi>
          <DocLi><strong>Quick Capture:</strong> The top bar form lets you rapidly log a new idea and tag it to a specific platform (LinkedIn, Twitter, YouTube, etc.) before the inspiration fades.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>AI Drafting Assistant</DocH2>
        <DocP>
          Beat writer's block using the built-in AI generation tools.
        </DocP>
        <DocP>
          When you click "Draft" on any captured idea, a specialized modal opens. The system pings the <Code>aiApi.draft</Code> endpoint, passing your idea title and target platform as context.
        </DocP>
        <DocUl>
          <DocLi><strong>Platform Aware:</strong> A LinkedIn draft will generate professional, spaced-out prose, while a Twitter draft will generate a threaded format.</DocLi>
          <DocLi><strong>Iteration:</strong> Use the "Regenerate" function if the tone isn't quite right, and "Copy" the final output directly to your clipboard for publishing.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Twitter Queue Reader</DocH2>
        <DocP>
          If you prefer writing in local text files, the <Code>TwitterQueueCard</Code> bridges the gap between your local vault and the dashboard.
        </DocP>
        <DocP>
          The system reads a local markdown file named <Code>twitter-queue.md</Code>. It parses raw markdown lists and checkboxes, rendering them into a clean, read-only UI checklist. This allows you to manage your X (Twitter) pipeline natively in markdown while visualizing it beautifully on the dashboard.
        </DocP>
        
        <DocAlert title="Engagement Metrics Dashboard" type="info">
          As you move items to the "Published" column, the Engagement Widget aggregates performance stats. It calculates mock views and Click-Through Rates (CTR) based on your output volume, providing visual feedback on your highest-performing platform.
        </DocAlert>
      </DocSection>

    </motion.div>
  )
}
