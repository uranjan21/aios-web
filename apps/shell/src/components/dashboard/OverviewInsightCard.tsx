import { aiApi } from "@ct/shared/api/areas";
import { Skeleton } from "@ct/shared/components/ui/skeleton";
import { UpgradeWall, is402 } from "@ct/shared/components/UpgradeWall";
import { Button, Card, EmptyState } from "@ledgr/ui";
import { useMutation } from "@tanstack/react-query";
import {
  Heart,
  IndianRupee,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import styled, { keyframes, useTheme } from "styled-components";

// ─────────────────────────── Cache utils ───────────────────────────

const OVERVIEW_KEY = "ct-dashboard-overview-cache";

type InsightSnapshot = { finance: string | null; health: string | null; date?: string };

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

// ─────────────────────────── Text parser ───────────────────────────

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

// ─────────────────────────── Domain config ───────────────────────────

type DomainKey = "finance" | "health";

const DOMAINS: Record<
  DomainKey,
  { label: string; tag: string; icon: LucideIcon }
> = {
  finance: { label: "Money",  tag: "Finance",  icon: IndianRupee },
  health:  { label: "Health", tag: "Wellness", icon: Heart },
};

// ─────────────────────────── Animation ───────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
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
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;

const DomainRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} 0`};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const DomainHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
`;

const DomainIconBox = styled.span<{ $accent: string }>`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ $accent }) => $accent}1A;
  border: 1px solid ${({ $accent }) => $accent}30;
  color: ${({ $accent }) => $accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const DomainLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1;
`;

const BulletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  padding-left: ${({ theme }) => `${theme.spacing[1]}`};
`;

const BulletItem = styled.span<{ $accent: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};

  &::before {
    content: "";
    flex-shrink: 0;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${({ $accent }) => $accent};
    margin-top: ${({ theme }) => `${theme.spacing[1]}`};
  }
`;

const DomainErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.destructive};
`;

function DomainRowView({ domain, text }: { domain: DomainKey; text: string | null }) {
  const theme = useTheme();
  const cfg = DOMAINS[domain];
  const Icon = cfg.icon;
  const bullets = splitIntoBullets(text);
  const accent = theme.domain[domain];

  return (
    <DomainRow>
      <DomainHeader>
        <DomainIconBox $accent={accent}>
          <Icon size={11} />
        </DomainIconBox>
        <DomainLabel>{cfg.label}</DomainLabel>
      </DomainHeader>

      <BulletList>
        {bullets.length > 0 ? (
          bullets.map((b, i) => (
            <BulletItem key={i} $accent={accent}>
              {b}
            </BulletItem>
          ))
        ) : text ? (
          <BulletItem $accent={accent}>{text}</BulletItem>
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
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} 0`};

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

// ─────────────────────────── Root component ───────────────────────────

/* Accent-filled, otherwise a plain Button: the pill radius, the 135° gradient,
   the coloured ambient glow and the hover lift were all clay overrides on top
   of the primitive. Only the accent fill is a real product decision. */
const AnalyseButton = styled(Button)`
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accentForeground};
  border-color: transparent;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.accent};
    filter: brightness(1.08);
  }
`;

const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20, 24, 34, 0.85)'
      : 'rgba(255, 255, 255, 0.85)'};
  backdrop-filter: blur(16px);
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: 0 8px 30px -6px rgba(0, 0, 0, 0.05);
`;

export function OverviewInsightCard() {
  const theme = useTheme();
  const [planBlocked, setPlanBlocked] = useState(false);

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
    onError: (err) => {
      if (is402(err)) { setPlanBlocked(true); return }
      toast.error("AI temporarily unavailable")
    },
  });

  const overviewData    = overviewMutation.data ?? overviewCache;
  const overviewPending = overviewMutation.isPending;

  const actionBtn = overviewData ? (
    <Button
      size="sm"
      variant="ghost"
      startIcon={<RefreshCw size={12} />}
      loading={overviewPending}
      onClick={() => overviewMutation.mutate()}
    >
      Refresh
    </Button>
  ) : (
    <AnalyseButton
      size="sm"
      startIcon={<Sparkles size={12} />}
      loading={overviewPending}
      onClick={() => overviewMutation.mutate()}
    >
      Analyse
    </AnalyseButton>
  );

  return (
    <StyledCard
      size="lg"
      title="Life Overview"
      subtitle="AI-synthesised cross-domain status across your logs"
      icon={<Sparkles size={14} style={{ color: theme.color.accent }} />}
      action={actionBtn}
    >

      {/* ── Plan blocked ── */}
      {planBlocked && <UpgradeWall feature="AI daily brief and insights" style={{ margin: '8px 0' }} />}

      {/* ── Life Overview ── */}
      {!planBlocked &&
        (overviewPending && !overviewData ? (
          <OverviewSkeleton />
        ) : overviewData ? (
          <DomainList>
            <DomainRowView domain="finance" text={overviewData.finance} />
            <DomainRowView domain="health"  text={overviewData.health}  />
          </DomainList>
        ) : (
          <EmptyState
            icon={<Sparkles size={32} />}
            title={overviewMutation.isError ? "Couldn't reach the AI" : "Cross-domain snapshot"}
            description={overviewMutation.isError
                ? "Something went wrong — try analysing again."
                : "One click reads your Finance + Health logs and gives you a plain-English snapshot of where you stand."}
          />
        ))}
    </StyledCard>
  );
}
