import { motion } from 'framer-motion'
import { Briefcase } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code } from '@/components/ui/DocStyles'

export function CareerGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={Briefcase}>Career Guide</DocH1>
        <DocP>
          The Career module treats your professional trajectory like a product roadmap. It combines a CRM for managing job applications with advanced skill mapping and AI-driven gap analysis.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Opportunities Pipeline</DocH2>
        <DocP>
          The <Code>OpportunitiesTab</Code> acts as a dedicated Kanban board for your job hunt, powered by <Code>@dnd-kit/core</Code>.
        </DocP>
        <DocUl>
          <DocLi><strong>Drag and Drop:</strong> Seamlessly move applications through stages: Prospect, Applied, Screening, Interview, and Offer.</DocLi>
          <DocLi><strong>Reject Zone:</strong> A designated drop area allows you to quickly mark an application as rejected without deleting the historical record.</DocLi>
          <DocLi><strong>List View:</strong> Toggle to a dense list view grouped by "Active" and "Closed/Rejected" for high-volume pipeline management.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Skill Mapping & Radar</DocH2>
        <DocP>
          Rather than a static resume, the system requires you to log your specific competencies.
        </DocP>
        <DocH3>Career Radar Chart</DocH3>
        <DocP>
          As you log skills (categorized into domains like Technical, Soft Skills, Design) and rate your proficiency from "Day 0" to "Expert", the <Code>CareerRadar</Code> widget dynamically generates a spider chart. This visually represents your "T-shaped" professional profile.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>AI Skill-Gap Analysis</DocH2>
        <DocP>
          The <Code>SkillGapCard</Code> is the most powerful tool in the Career area. It leverages the AI backend to act as a career coach.
        </DocP>
        <DocUl>
          <DocLi><strong>Target Role Input:</strong> Enter a desired role (e.g., "Senior AI Engineer" or "Product Manager").</DocLi>
          <DocLi><strong>Gap Identification:</strong> The AI cross-references your logged skills (from the Radar chart) against industry requirements for that target role.</DocLi>
          <DocLi><strong>Actionable Plan:</strong> It generates a personalized 90-day learning plan, highlighting specific frameworks to learn or certifications to pursue.</DocLi>
        </DocUl>
        
        <DocAlert title="Continuous Logging" type="tip">
          Use the side rail on the Career page to immediately log minor wins—like finishing a tutorial or receiving positive peer feedback. These aggregate into your <Code>RoadmapTab</Code> timeline.
        </DocAlert>
      </DocSection>

    </motion.div>
  )
}
