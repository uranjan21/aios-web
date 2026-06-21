import { useState, useEffect } from 'react';
import { Dialog, Button } from '@ledgr/ui';
import styled, { useTheme } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Heart, Briefcase, Zap, PenTool, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 8px;
`;

const IconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.primary}1a;
  color: ${({ theme }) => theme.color.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0 0 12px 0;
`;

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0 0 32px 0;
  max-width: 320px;
  line-height: 1.5;
`;

const StepsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
`;

const StepIndicator = styled.div<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? '24px' : '8px')};
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme, $active }) => ($active ? theme.color.primary : theme.color.muted)};
  transition: width 0.3s ease, background-color 0.3s ease;
`;

const slides = [
  {
    icon: <Wallet size={28} />,
    title: 'Master Your Finances',
    desc: 'Track expenses, monitor budgets, and achieve financial freedom with AI-driven insights.',
    path: '/finance'
  },
  {
    icon: <Heart size={28} />,
    title: 'Optimize Your Health',
    desc: 'Log workouts, monitor sleep, and discover correlations between your habits.',
    path: '/health'
  },
  {
    icon: <Briefcase size={28} />,
    title: 'Accelerate Your Career',
    desc: 'Track skills, manage job applications, and navigate your professional growth.',
    path: '/career'
  },
  {
    icon: <Zap size={28} />,
    title: 'Grow Your Business',
    desc: 'Monitor MRR, track tasks, and execute strategies to scale your projects.',
    path: '/business'
  },
  {
    icon: <PenTool size={28} />,
    title: 'Build Your Audience',
    desc: 'Manage your content pipeline, schedule posts, and track engagement.',
    path: '/content'
  }
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('aios_has_seen_welcome');
    if (!hasSeenWelcome) {
      // Small delay to let the initial page render
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
      navigate(slides[step].path);
    }
  };

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('aios_has_seen_welcome', 'true');
  };

  const currentSlide = slides[step];

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <ModalContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <IconWrapper>{currentSlide.icon}</IconWrapper>
            <Title>{currentSlide.title}</Title>
            <Description>{currentSlide.desc}</Description>
          </motion.div>
        </AnimatePresence>

        <StepsContainer>
          {slides.map((_, i) => (
            <StepIndicator key={i} $active={i === step} />
          ))}
        </StepsContainer>

        <Button onClick={handleNext} variant="primary" style={{ width: '100%' }}>
          {step === slides.length - 1 ? 'Get Started' : 'Next'} <ArrowRight size={16} style={{ marginLeft: 8 }} />
        </Button>
        {step < slides.length - 1 && (
          <Button variant="ghost" onClick={handleClose} style={{ width: '100%', marginTop: 8 }}>
            Skip Tutorial
          </Button>
        )}
      </ModalContent>
    </Dialog>
  );
}
