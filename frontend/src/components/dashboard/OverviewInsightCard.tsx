import { aiApi } from "@/api/areas";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, Card } from "@ledgr/ui";
import { useMutation } from "@tanstack/react-query";
import {
  BookOpen,
  Heart,
  IndianRupee,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import styled, { keyframes } from "styled-components";

// ─────────────────────────── Cache utils ───────────────────────────

const OVERVIEW_KEY = "aios-dashboard-overview-cache";
const BRIEF_KEY = "aios-daily-brief-cache";

type InsightSnapshot = { finance: string | null; health: string | null; date?: string };
type BriefCache = { text: string; date: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, data: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─────────────────────────── Text parsers ───────────────────────────

function splitIntoBullets(text: string | null): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

const BRIEF_HEADERS = ["TODAY'S FOCUS", "MONEY PULSE", "HEALTH PULSE", "KEY ACTION"];

type BriefSection = { header: string; items: string[] };

function parseBrief(text: string): BriefSection[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: BriefSection[] = [];
  let current: BriefSection | null = null;
  for (const line of lines) {
    const upper = line.toUpperCase();
    const matched = BRIEF_HEADERS.find((h) => upper.includes(h));
    if (matched) {
      if (current) sections.push(current);
      current = { header: matched, items: [] };
    } else if (current) {
      const cleaned = line.replace(/^\d+\.\s*/, "").replace(/^[-•*]\s*/, "").trim();
      if (cleaned) current.items.push(cleaned);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ─────────────────────────── Domain config ───────────────────────────

type DomainKey = "finance" | "health";

const DOMAINS: Record<
  DomainKey,
  { label: string; tag: string; icon: LucideIcon; accent: string }
> = {
  finance: { label: "Money",  tag: "Finance",  icon: IndianRupee, accent: "#CA8A04" },
  health:  { label: "Health", tag: "Wellness", icon: Heart,       accent: "#16A34A" },
};

// ─────────────────────────── Animation ───────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────── Toggle ───────────────────────────

type Mode = "overview" | "brief";

const SegControl = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 999px;
  padding: 3px;
`;

const SegIndicator = styled.span<{ $mode: Mode }>`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: ${({ $mode }) => ($mode === "overview" ? "3px" : "calc(50%)")};
  right: ${({ $mode }) => ($mode === "brief" ? "3px" : "calc(50%)")};
  background: ${({ theme }) => theme.color.card};
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition:
    left 220ms cubic-bezier(0.2, 0, 0, 1),
    right 220ms cubic-bezier(0.2, 0, 0, 1);
`;

const SegBtn = styled.button<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  color: ${({ theme, $active }) =>
    $active ? theme.color.foreground : theme.color.mutedForeground};
  transition: color 200ms;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`;

// ─────────────────────────── Life Overview — row list ───────────────────────────

const DomainList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow-y: auto;
  animation: ${fadeIn} 200ms cubic-bezier(0.2, 0, 0, 1) both;

  /* Thin scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.border} transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.border};
    border-radius: 999px;
  }
`;

const DomainRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const DomainHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`;

const DomainIconBox = styled.span<{ $accent: string }>`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: ${({ $accent }) => $accent}1A;
  border: 1px solid ${({ $accent }) => $accent}30;
  color: ${({ $accent }) => $accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const DomainLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1;
`;

const BulletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 4px;
`;

const BulletItem = styled.span<{ $accent: string }>`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};

  &::before {
    content: "";
    flex-shrink: 0;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${({ $accent }) => $accent};
    margin-top: 5px;
  }
`;

const DomainErrorText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.destructive};
`;

function DomainRowView({ domain, text }: { domain: DomainKey; text: string | null }) {
  const cfg = DOMAINS[domain];
  const Icon = cfg.icon;
  const bullets = splitIntoBullets(text);

  return (
    <DomainRow>
      <DomainHeader>
        <DomainIconBox $accent={cfg.accent}>
          <Icon size={11} />
        </DomainIconBox>
        <DomainLabel>{cfg.label}</DomainLabel>
      </DomainHeader>

      <BulletList>
        {bullets.length > 0 ? (
          bullets.map((b, i) => (
            <BulletItem key={i} $accent={cfg.accent}>
              {b}
            </BulletItem>
          ))
        ) : text ? (
          <BulletItem $accent={cfg.accent}>{text}</BulletItem>
        ) : (
          <DomainErrorText>Analysis unavailable.</DomainErrorText>
        )}
      </BulletList>
    </DomainRow>
  );
}

// ─────────────────────────── Skeleton ───────────────────────────

const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const SkeletonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`;

function OverviewSkeleton() {
  return (
    <SkeletonList>
      {(["finance", "health"] as const).map((k) => (
        <SkeletonRow key={k}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Skeleton style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0 }} />
            <Skeleton style={{ height: 11, width: 52 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4 }}>
            <Skeleton style={{ height: 11, width: "88%" }} />
            <Skeleton style={{ height: 11, width: "70%" }} />
            <Skeleton style={{ height: 11, width: "80%" }} />
          </div>
        </SkeletonRow>
      ))}
    </SkeletonList>
  );
}

// ─────────────────────────── Daily Brief ───────────────────────────

const BriefBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ${fadeIn} 200ms cubic-bezier(0.2, 0, 0, 1) both;
`;

const BriefSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BriefSectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const PriorityList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PriorityItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.foreground};
  font-weight: 500;
`;

const NumBadge = styled.span`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.foreground};
  color: ${({ theme }) => theme.color.background};
  font-size: 9px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
`;

const PulseGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const PulseTile = styled.div<{ $accent: string }>`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $accent }) => $accent}0D;
  border: 1px solid ${({ $accent }) => $accent}22;
`;

const PulseTileHeader = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ $accent }) => $accent};
`;

const PulseLine = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.foreground};
`;

const ActionBlock = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.accent}0D;
  border: 1px solid ${({ theme }) => theme.color.accent}28;
`;

const ActionIcon = styled.span`
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: ${({ theme }) => theme.color.accent}1E;
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ActionText = styled.p`
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.foreground};
`;

function BriefView({ sections }: { sections: BriefSection[] }) {
  const focusSection  = sections.find((s) => s.header === "TODAY'S FOCUS");
  const moneySection  = sections.find((s) => s.header === "MONEY PULSE");
  const healthSection = sections.find((s) => s.header === "HEALTH PULSE");
  const actionSection = sections.find((s) => s.header === "KEY ACTION");

  return (
    <BriefBody>
      {focusSection && focusSection.items.length > 0 && (
        <BriefSection>
          <BriefSectionLabel><Target size={10} />Today's Priorities</BriefSectionLabel>
          <PriorityList>
            {focusSection.items.slice(0, 3).map((item, i) => (
              <PriorityItem key={i}>
                <NumBadge>{i + 1}</NumBadge>
                {item}
              </PriorityItem>
            ))}
          </PriorityList>
        </BriefSection>
      )}

      {(moneySection || healthSection) && (
        <PulseGrid>
          {moneySection && (
            <PulseTile $accent="#CA8A04">
              <PulseTileHeader $accent="#CA8A04">
                <IndianRupee size={10} />Money Pulse
              </PulseTileHeader>
              {moneySection.items.slice(0, 2).map((item, i) => (
                <PulseLine key={i}>{item}</PulseLine>
              ))}
            </PulseTile>
          )}
          {healthSection && (
            <PulseTile $accent="#16A34A">
              <PulseTileHeader $accent="#16A34A">
                <Heart size={10} />Health Pulse
              </PulseTileHeader>
              {healthSection.items.slice(0, 2).map((item, i) => (
                <PulseLine key={i}>{item}</PulseLine>
              ))}
            </PulseTile>
          )}
        </PulseGrid>
      )}

      {actionSection && actionSection.items.length > 0 && (
        <ActionBlock>
          <ActionIcon><Zap size={13} /></ActionIcon>
          <ActionText>{actionSection.items[0]}</ActionText>
        </ActionBlock>
      )}
    </BriefBody>
  );
}

// ─────────────────────────── Empty states ───────────────────────────

const EmptyRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 24px 16px;
`;

const EmptyIconRing = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ theme, $color }) => ($color ?? theme.color.accent) + "1A"};
  color: ${({ theme, $color }) => $color ?? theme.color.accent};
  margin-bottom: 4px;
`;

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`;

const EmptyText = styled.p`
  margin: 0;
  max-width: 320px;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const DomainPills = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
`;

const DomainPill = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${({ $accent }) => $accent}14;
  color: ${({ $accent }) => $accent};
  font-size: 11px;
  font-weight: 600;
`;

// ─────────────────────────── Card header ───────────────────────────

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding-bottom: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  row-gap: 8px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ─────────────────────────── Root component ───────────────────────────

export function OverviewInsightCard() {
  const [mode, setMode] = useState<Mode>("overview");

  // Life Overview — invalidate if cached from a different day
  const [overviewCache, setOverviewCache] = useState<InsightSnapshot | null>(() => {
    const c = readJson<InsightSnapshot>(OVERVIEW_KEY);
    return c?.date === todayIso() ? c : null;
  });
  const overviewMutation = useMutation({
    mutationFn: async () => {
      const [finance, health] = await Promise.allSettled([
        aiApi.explain("finance"),
        aiApi.explain("health"),
      ]);
      const result: InsightSnapshot = {
        finance: finance.status === "fulfilled" ? finance.value.text : null,
        health:  health.status  === "fulfilled" ? health.value.text  : null,
        date: todayIso(),
      };
      writeJson(OVERVIEW_KEY, result);
      return result;
    },
    onSuccess: (r) => setOverviewCache(r),
    onError: () => toast.error("AI temporarily unavailable"),
  });

  // Daily Brief
  const [briefCache, setBriefCache] = useState<BriefCache | null>(() => {
    const c = readJson<BriefCache>(BRIEF_KEY);
    return c?.date === todayIso() ? c : null;
  });
  const briefMutation = useMutation({
    mutationFn: aiApi.dailyBrief,
    onSuccess: (r) => {
      const c: BriefCache = { text: r.text, date: todayIso() };
      writeJson(BRIEF_KEY, c);
      setBriefCache(c);
    },
    onError: () => toast.error("Could not generate daily brief"),
  });

  const overviewData    = overviewMutation.data ?? overviewCache;
  const overviewPending = overviewMutation.isPending;
  const briefSections   = briefCache ? parseBrief(briefCache.text) : [];
  const briefPending    = briefMutation.isPending;
  const briefReady      = briefSections.length > 0;

  const actionBtn =
    mode === "overview" ? (
      <Button
        size="sm"
        variant={overviewData ? "ghost" : "primary"}
        startIcon={overviewData ? <RefreshCw size={12} /> : <Sparkles size={12} />}
        loading={overviewPending}
        onClick={() => overviewMutation.mutate()}
      >
        {overviewData ? "Refresh" : "Analyse"}
      </Button>
    ) : briefReady ? (
      <Button
        size="sm"
        variant="ghost"
        startIcon={<RefreshCw size={12} />}
        loading={briefPending}
        onClick={() => briefMutation.mutate()}
      >
        Regenerate
      </Button>
    ) : (
      <Button
        size="sm"
        variant="primary"
        startIcon={<BookOpen size={12} />}
        loading={briefPending}
        onClick={() => briefMutation.mutate()}
      >
        Generate
      </Button>
    );

  return (
    <Card
      size="lg"
      variant="glass"
      title={mode === "overview" ? "Life Overview" : "Daily Brief"}
      subtitle="AI-synthesised daily status across your logs"
      icon={<Sparkles size={14} style={{ color: "#CA8A04" }} />}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SegControl role="tablist" aria-label="Insight mode">
            <SegIndicator $mode={mode} />
            <SegBtn
              role="tab"
              aria-selected={mode === "overview"}
              $active={mode === "overview"}
              onClick={() => setMode("overview")}
            >
              <Sparkles size={11} />
              Overview
            </SegBtn>
            <SegBtn
              role="tab"
              aria-selected={mode === "brief"}
              $active={mode === "brief"}
              onClick={() => setMode("brief")}
            >
              <BookOpen size={11} />
              Daily Brief
            </SegBtn>
          </SegControl>
          {actionBtn}
        </div>
      }
    >

      {/* ── Life Overview ── */}
      {mode === "overview" &&
        (overviewPending && !overviewData ? (
          <OverviewSkeleton />
        ) : overviewData ? (
          <DomainList>
            <DomainRowView domain="finance" text={overviewData.finance} />
            <DomainRowView domain="health"  text={overviewData.health}  />
          </DomainList>
        ) : (
          <EmptyRoot>
            <EmptyIconRing>
              <Sparkles size={18} />
            </EmptyIconRing>
            <EmptyTitle>
              {overviewMutation.isError ? "Couldn't reach the AI" : "Cross-domain snapshot"}
            </EmptyTitle>
            <EmptyText>
              {overviewMutation.isError
                ? "Something went wrong — try analysing again."
                : "One click reads your Finance + Health logs and gives you a plain-English snapshot of where you stand."}
            </EmptyText>
            <DomainPills>
              <DomainPill $accent="#CA8A04"><IndianRupee size={10} />Finance</DomainPill>
              <DomainPill $accent="#16A34A"><Heart size={10} />Health</DomainPill>
            </DomainPills>
          </EmptyRoot>
        ))}

      {/* ── Daily Brief ── */}
      {mode === "brief" &&
        (briefPending ? (
          <EmptyRoot>
            <EmptyIconRing><BookOpen size={18} /></EmptyIconRing>
            <EmptyTitle>Generating your brief…</EmptyTitle>
            <EmptyText>Reading your Finance + Health context and assembling today's brief.</EmptyText>
          </EmptyRoot>
        ) : briefReady ? (
          <BriefView sections={briefSections} />
        ) : (
          <EmptyRoot>
            <EmptyIconRing $color="#6366F1"><BookOpen size={18} /></EmptyIconRing>
            <EmptyTitle>
              {briefMutation.isError ? "Brief failed to generate" : "No brief for today yet"}
            </EmptyTitle>
            <EmptyText>
              {briefMutation.isError
                ? "Couldn't reach the AI — try again."
                : "Generate your daily brief: priorities, money pulse, health pulse, and one key action — from your logged data."}
            </EmptyText>
            <DomainPills>
              <DomainPill $accent="#6366F1"><Target size={10} />Priorities</DomainPill>
              <DomainPill $accent="#CA8A04"><IndianRupee size={10} />Money</DomainPill>
              <DomainPill $accent="#16A34A"><Heart size={10} />Health</DomainPill>
            </DomainPills>
          </EmptyRoot>
        ))}
    </Card>
  );
}
