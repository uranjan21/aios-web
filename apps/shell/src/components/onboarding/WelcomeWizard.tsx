import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@ledgr/ui'
import { Rocket, Shield, TrendingUp, CheckCircle, ChevronRight, X } from 'lucide-react'
import { useAuthStore } from '@aios/shared/stores/authStore'

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(12, 10, 9, 0.8);
  backdrop-filter: blur(12px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`

const WizardCard = styled(motion.div)`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  width: 100%;
  max-width: 600px;
  box-shadow: ${({ theme }) => theme.shadow.xl};
  overflow: hidden;
  position: relative;
`

const StepIndicator = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: 2rem 2rem 0;
  justify-content: center;
`

const Dot = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ theme, $active, $completed }) => 
    $active ? theme.color.accent : 
    $completed ? theme.color.primary : 
    theme.color.muted};
  transition: all 0.3s;
`

const ContentArea = styled.div`
  padding: 2rem;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  text-align: center;
`

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 2rem;
  margin-bottom: 1rem;
`

const Desc = styled.p`
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.6;
  margin-bottom: 2rem;
`

const Footer = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.color.muted}33;
`

const CloseBtn = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  border-radius: 50%;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
`


const STEPS = [
  { id: 'welcome', title: 'Welcome to AiOs', icon: Rocket, desc: 'Your personal AI-powered operating system for money, health and career. Let’s get you set up in less than a minute.' },
  { id: 'domains', title: 'Three Core Areas', icon: Shield, desc: 'AiOs unifies Finance, Health and Career into one dashboard, with a shared Plan for goals, projects and tasks.' },
  { id: 'action', title: 'Take Action', icon: TrendingUp, desc: 'Ready to take control? Start by taking one high-value action right now.' },
  { id: 'finish', title: 'You\'re All Set', icon: CheckCircle, desc: 'Your personalized dashboard is ready. Dive in and start orchestrating your life.' }
]

export function WelcomeWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const user = useAuthStore(s => s.user)
  
  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finishOnboarding()
    }
  }

  const finishOnboarding = async () => {
    // Optionally call an API to mark onboarding as complete
    // await api.post('/auth/me', { onboarded: true })
    onComplete()
  }

  const currentStep = STEPS[step]
  const Icon = currentStep.icon

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <WizardCard
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <CloseBtn onClick={onComplete}><X size={20} /></CloseBtn>
          
          <StepIndicator>
            {STEPS.map((s, i) => (
              <Dot key={s.id} $active={i === step} $completed={i < step} />
            ))}
          </StepIndicator>

          <ContentArea>
            <motion.div
              key={step}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent)' }}>
                <Icon size={48} />
              </div>
              <Title>{currentStep.id === 'welcome' ? `Welcome, ${user?.name?.split(' ')[0] || 'there'}` : currentStep.title}</Title>
              <Desc>{currentStep.desc}</Desc>

              {currentStep.id === 'action' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 300, margin: '0 auto' }}>
                  <Button variant="outline" onClick={() => { onComplete(); window.location.href = '/app/finance' }}>Log your first expense</Button>
                  <Button variant="outline" onClick={() => { onComplete(); window.location.href = '/app/agents' }}>Create your first Agent</Button>
                </div>
              )}
            </motion.div>
          </ContentArea>

          <Footer>
            <Button variant="ghost" onClick={onComplete}>Skip for now</Button>
            <Button variant="primary" onClick={handleNext}>
              {step === STEPS.length - 1 ? 'Go to Dashboard' : 'Continue'} <ChevronRight size={16} style={{ marginLeft: 8 }} />
            </Button>
          </Footer>
        </WizardCard>
      </Overlay>
    </AnimatePresence>
  )
}
