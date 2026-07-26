import { focusRing } from '@ledgr/ui'
import { useUIStore } from "@ct/shared/stores/uiStore";
import { Button, Card } from "@ledgr/ui";
import { Heart, RefreshCcw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { api } from "@ct/shared/api/client";
import { toast } from "sonner";

const QUOTES: Array<{ text: string; author: string }> = [
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  {
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
  },
  { text: "The obstacle is the way.", author: "Marcus Aurelius" },
  {
    text: "Compound interest is the eighth wonder of the world.",
    author: "attrib. Einstein",
  },
  { text: "Slow is smooth. Smooth is fast.", author: "Navy SEAL adage" },
  {
    text: "How we spend our days is, of course, how we spend our lives.",
    author: "Annie Dillard",
  },
  { text: "Mood follows action.", author: "Rich Roll" },
  { text: "Make the thing. Ship the thing. Repeat.", author: "—" },
  { text: "Read. Lift. Build. Sleep.", author: "—" },
  {
    text: "Hard choices, easy life. Easy choices, hard life.",
    author: "Jerzy Gregorek",
  },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function initialQuoteIndex(): number {
  const d = new Date();
  const dayIndex = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
  return dayIndex % QUOTES.length;
}

/** ISO-8601 week number. */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function daysInYear(d: Date): number {
  const y = d.getFullYear();
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.35; }
`;

const HeroCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'};
  background:
    radial-gradient(
      100% 120% at 100% 0%,
      ${({ theme }) => theme.color.accent}20 0%,
      transparent 70%
    ),
    radial-gradient(
      80% 80% at 0% 100%,
      ${({ theme }) => theme.color.accent}0A 0%,
      transparent 60%
    ),
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(20, 24, 34, 0.65)' : 'rgba(255, 255, 255, 0.75)'};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.08);
  border-radius: ${({ theme }) => theme.radii.xl};

  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.accent}80 0%,
      ${({ theme }) => theme.color.accent}20 28%,
      transparent 60%
    );
    pointer-events: none;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[4.5]}`};
  align-items: stretch;
  @media ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.9fr);
    gap: ${({ theme }) => `${theme.spacing[6]}`};
    align-items: stretch;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
  min-width: 0;
  justify-content: center;
`;

const StatusRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
`;

const PulseDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: ${({ theme }) => theme.radii.full}; /* true circle */
  background: ${({ theme }) => theme.color.accent};
  flex-shrink: 0;
  position: relative;
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: ${({ theme }) => theme.radii.full}; /* true circle */
    background: ${({ theme }) => theme.color.accent};
    animation: ${pulse} 2.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
    }
  }
`;

const Sep = styled.span`
  color: ${({ theme }) => theme.color.border};
`;

const Greeting = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: clamp(30px, 3.4vw, 46px);
  font-weight: 800;
  line-height: 1.02;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
  letter-spacing: -0.035em;
`;

const Accent = styled.span`
  color: ${({ theme }) => theme.color.accent};
`;

const DateLine = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`;

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const ChipKey = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`;

const QuotePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  padding: ${({ theme }) => `${theme.spacing[5]}`};
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)`
      : `linear-gradient(145deg, ${theme.color.accent}12 0%, ${theme.color.accent}04 100%)`};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'};
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.4);
`;

const QuoteLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.color.accent};
`;

const QuoteBlock = styled.blockquote`
  margin: 0;
  padding-left: ${({ theme }) => `${theme.spacing[3.5]}`};
  border-left: 2px solid ${({ theme }) => theme.color.accent};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  flex: 1;
`;

const QuoteText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  line-height: 1.55;
  color: ${({ theme }) => theme.color.foreground};
  font-weight: 500;
`;

const QuoteAuthor = styled.cite`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-style: normal;
`;

const CaptureBtn = styled(Button)`
  align-self: stretch;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.color.accent} 0%,
    ${({ theme }) => theme.color.accent}DD 100%
  ) !important;
  color: ${({ theme }) => theme.color.accentForeground} !important;
  border: none !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 14px ${({ theme }) => theme.color.accent}3D;
  transition: all 160ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px ${({ theme }) => theme.color.accent}55;
  }
`;

const QuoteActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  margin-left: auto;
`;

const IconBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme, $active }) => $active ? theme.color.accent : theme.color.mutedForeground};
  cursor: pointer;
  transition: background 120ms, color 120ms;
  flex-shrink: 0;
  &:hover { background: ${({ theme }) => theme.color.accent}18; color: ${({ theme }) => theme.color.accent}; }
  ${focusRing}
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export function GreetingHero({ name }: { name?: string }) {
  const setCaptureModalOpen = useUIStore((s) => s.setCaptureModalOpen);
  const [now, setNow] = useState<Date>(() => new Date());
  const [quoteIndex, setQuoteIndex] = useState(initialQuoteIndex);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = getGreeting();
  const quote = QUOTES[quoteIndex];
  const quoteKey = `${quote.text}::${quote.author}`;

  const handleRefresh = () => setQuoteIndex(i => (i + 1) % QUOTES.length);

  const handleSave = async () => {
    if (savedIds.has(quoteKey)) return;
    try {
      await api.post('/quotes/save', { text: quote.text, author: quote.author });
      setSavedIds(prev => new Set(prev).add(quoteKey));
      toast.success('Quote saved to your collection');
    } catch {
      toast.error('Could not save quote');
    }
  };
  const time = now.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" });
  const dateString = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <HeroCard size="lg" variant="default">
      <Row>
        <Left>
          <StatusRow>
            <PulseDot />
            {time}
            <Sep>·</Sep>
            {weekday}
          </StatusRow>
          <Greeting>
            {greeting}
            {name ? `, ${name}` : ""}
            <Accent>.</Accent>
          </Greeting>
          <DateLine>{dateString}</DateLine>
          <ChipRow>
            <Chip>
              <ChipKey>Week</ChipKey>
              {getWeekNumber(now)}
            </Chip>
            <Chip>
              <ChipKey>Day</ChipKey>
              {getDayOfYear(now)} / {daysInYear(now)}
            </Chip>
          </ChipRow>
        </Left>

        <QuotePanel>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <QuoteLabel>Daily principle</QuoteLabel>
            <QuoteActions>
              <IconBtn aria-label="Next quote" onClick={handleRefresh} title="Refresh quote">
                <RefreshCcw size={13} />
              </IconBtn>
              <IconBtn
                aria-label="Save quote"
                onClick={handleSave}
                $active={savedIds.has(quoteKey)}
                title={savedIds.has(quoteKey) ? 'Already saved' : 'Save to collection'}
              >
                <Heart size={13} fill={savedIds.has(quoteKey) ? 'currentColor' : 'none'} />
              </IconBtn>
            </QuoteActions>
          </div>
          <QuoteBlock>
            <QuoteText>{quote.text}</QuoteText>
            <QuoteAuthor>— {quote.author}</QuoteAuthor>
          </QuoteBlock>
          <CaptureBtn
            variant="primary"
            size="md"
            startIcon={<Zap size={14} />}
            onClick={() => setCaptureModalOpen(true)}
          >
            Quick Log
          </CaptureBtn>
        </QuotePanel>
      </Row>
    </HeroCard>
  );
}
