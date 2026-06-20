import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code, Kbd } from '@/components/ui/DocStyles'

export function ChatGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={MessageSquare}>Chat Interface</DocH1>
        <DocP>
          The Chat Interface is designed for power users who want rapid, contextual interactions with advanced AI models without leaving their workspace.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Key Capabilities</DocH2>
        
        <DocH3>Context Awareness</DocH3>
        <DocP>
          The AI maintains full context of your ongoing conversation. You can reference previous messages, ask it to refine a previously generated block of text, or switch topics dynamically.
        </DocP>

        <DocH3>Rich Markdown & Code Support</DocH3>
        <DocP>
          Responses aren't just plain text. The AI leverages rich markdown, rendering tables, bold typography, and fully syntax-highlighted code blocks complete with one-click copy buttons for developers.
        </DocP>

        <DocAlert title="Tool-aware responses" type="tip">
          The chat agent can read your vault context, search across all your notes, log entries to any area, and pull data from connected integrations — all without leaving the conversation.
        </DocAlert>
      </DocSection>

      <DocSection>
        <DocH2>Keyboard Shortcuts & Pro Tips</DocH2>
        <DocP>
          Speed is critical. Keep your hands on the keyboard with these built-in shortcuts:
        </DocP>
        
        <DocUl>
          <DocLi>
            <Kbd>Enter</Kbd> <br/>
            Submit your message. Use <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> to insert a newline without sending.
          </DocLi>
          <DocLi>
            <Kbd>⌘</Kbd> + <Kbd>K</Kbd> <br/>
            Open the global command palette to jump to any area or start a new chat session.
          </DocLi>
          <DocLi>
            <Kbd>⌘</Kbd> + <Kbd>L</Kbd> <br/>
            Open the quick capture modal to log thoughts, expenses, or tasks from anywhere in the app.
          </DocLi>
        </DocUl>
      </DocSection>

    </motion.div>
  )
}
