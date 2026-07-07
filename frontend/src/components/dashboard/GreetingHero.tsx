import { useUIStore } from "@/stores/uiStore";
import { Button, Card } from "@ledgr/ui";
import { Heart, RefreshCcw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { api } from "@/api/client";
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
  border: 1px solid ${({ theme }) => theme.color.border};
  background:
    radial-gradient(
      120% 130% at 100% 0%,
      ${({ theme }) => theme.color.accent}14 0%,
      transparent 46%
    ),
    ${({ theme }) => theme.color.card};

  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.accent} 0%,
      ${({ theme }) => theme.color.accent}40 28%,
      transparent 60%
    );
    pointer-events: none;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: stretch;
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.9fr);
    gap: 24px;
    align-items: stretch;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  justify-content: center;
`;

const StatusRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
`;

const PulseDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accent};
  flex-shrink: 0;
  position: relative;
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 999px;
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
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`;

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const ChipKey = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
`;

const QuotePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const QuoteLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.color.accent};
`;

const QuoteBlock = styled.blockquote`
  margin: 0;
  padding-left: 14px;
  border-left: 2px solid ${({ theme }) => theme.color.accent};
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const QuoteText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.foreground};
  font-weight: 500;
`;

const QuoteAuthor = styled.cite`
  font-size: 11.5px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-style: normal;
`;

const CaptureBtn = styled(Button)`
  align-self: stretch;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
`;

const QuoteActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
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
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
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
