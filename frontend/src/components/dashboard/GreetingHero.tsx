import { useUIStore } from "@/stores/uiStore";
import { Button, Card } from "@ledgr/ui";
import { Plus, Sparkles } from "lucide-react";
import styled from "styled-components";

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

function quoteOfTheDay(): { text: string; author: string } {
  const d = new Date();
  const dayIndex = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
  return QUOTES[dayIndex % QUOTES.length];
}

const HeroCard = styled(Card)`
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(
      circle at top right,
      ${({ theme }) => theme.color.accent}18 0%,
      transparent 18%
    ),
    linear-gradient(
      135deg,
      ${({ theme }) => theme.color.card} 0%,
      ${({ theme }) => theme.color.muted} 100%
    );
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: stretch;
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.95fr);
    gap: 22px;
    align-items: center;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  justify-content: center;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accent}12;
  color: ${({ theme }) => theme.color.accent};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const TodayPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 11px;
  font-weight: 600;
`;

const Greeting = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: clamp(28px, 3.2vw, 42px);
  font-weight: 800;
  line-height: 1;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
  letter-spacing: -0.03em;
`;

const Accent = styled.span`
  color: ${({ theme }) => theme.color.accent};
`;

const DateLine = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const MetaTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 12px;
  font-weight: 600;
`;

const Right = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
`;

const QuoteRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const QuoteIcon = styled.div`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.accent}18;
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const QuoteText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.foreground};
  font-style: italic;
`;

const QuoteAuthor = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-style: normal;
`;

const CaptureBtn = styled(Button)`
  align-self: stretch;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
`;

export function GreetingHero({ name }: { name?: string }) {
  const setCaptureModalOpen = useUIStore((s) => s.setCaptureModalOpen);
  const greeting = getGreeting();
  const quote = quoteOfTheDay();
  const dateString = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <HeroCard size="lg" variant="default">
      <Row>
        <Left>
          <TopRow>
            <Eyebrow>Welcome back</Eyebrow>
            <TodayPill>{dateString.split(",")[0]}</TodayPill>
          </TopRow>
          <Greeting>
            {greeting}
            {name ? `, ${name}` : ""}
            <Accent>.</Accent>
          </Greeting>
          <DateLine>{dateString}</DateLine>
          <MetaRow>
            <MetaTag>🧭 Focused today</MetaTag>
            <MetaTag>⚡ Momentum on</MetaTag>
          </MetaRow>
        </Left>

        <Right>
          <QuoteRow>
            <QuoteIcon>
              <Sparkles size={14} />
            </QuoteIcon>
            <QuoteText>
              “{quote.text}”<QuoteAuthor>— {quote.author}</QuoteAuthor>
            </QuoteText>
          </QuoteRow>
          <CaptureBtn
            variant="primary"
            size="md"
            startIcon={<Plus size={14} />}
            onClick={() => setCaptureModalOpen(true)}
          >
            Quick Capture
          </CaptureBtn>
        </Right>
      </Row>
    </HeroCard>
  );
}
