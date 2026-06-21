import { aiApi } from "@/api/areas";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, Card } from "@ledgr/ui";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Heart,
  IndianRupee,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import styled from "styled-components";

const STORAGE_KEY = "aios-dashboard-overview-cache";

type InsightSnapshot = {
  finance: string | null;
  health: string | null;
};

function readCachedInsight(): InsightSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as InsightSnapshot;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.finance === null || typeof parsed.finance === "string") &&
      (parsed.health === null || typeof parsed.health === "string")
    ) {
      return parsed;
    }
  } catch {
    // ignore malformed cache and continue with a fresh fetch
  }

  return null;
}

function writeCachedInsight(data: InsightSnapshot) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write failures and keep UI working
  }
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 280px;
  max-height: 280px;
  overflow-y: auto;
`;

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 280px;
  max-height: 280px;
  justify-content: center;
`;

const SummaryGrid = styled.div`
  display: grid;
  gap: 10px;
`;

const InsightCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const InsightHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const InsightTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.foreground};
`;

const InsightBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const InsightList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const InsightItem = styled.li`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.foreground};
`;

const Bullet = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accent};
  margin-top: 7px;
  flex-shrink: 0;
`;

const Highlight = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`;

function splitIntoBullets(text: string | null) {
  if (!text) return [];

  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const bySentence = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  if (bySentence.length > 0) {
    return bySentence.slice(0, 3);
  }

  return [normalized].slice(0, 3);
}

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.5;
`;

const Failed = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.destructive};
`;

const EmptyState = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.foreground};
  white-space: pre-wrap;
`;

export function OverviewInsightCard() {
  const [cachedData, setCachedData] = useState<InsightSnapshot | null>(() =>
    readCachedInsight(),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const [finance, health] = await Promise.allSettled([
        aiApi.explain("finance"),
        aiApi.explain("health"),
      ]);
      const result = {
        finance: finance.status === "fulfilled" ? finance.value.text : null,
        health: health.status === "fulfilled" ? health.value.text : null,
      };
      writeCachedInsight(result);
      return result;
    },
    onSuccess: (result) => setCachedData(result),
    onError: () => toast.error("AI temporarily unavailable"),
  });

  const data = mutation.data ?? cachedData;
  const isPending = mutation.isPending;
  const isError = mutation.isError;
  const hasData = Boolean(data);

  const financeBullets = splitIntoBullets(data?.finance ?? null);
  const healthBullets = splitIntoBullets(data?.health ?? null);

  return (
    <Card
      title="Life Overview"
      subtitle="Cross-domain AI snapshot from your logged data"
      icon={<Sparkles size={14} style={{ color: "#CA8A04" }} />}
      action={
        <Button
          size="sm"
          variant={data ? "ghost" : "primary"}
          startIcon={data ? <RefreshCw size={12} /> : <Sparkles size={12} />}
          loading={isPending}
          onClick={() => mutation.mutate()}
        >
          {data ? "Refresh" : "Analyse"}
        </Button>
      }
    >
      {isPending && !hasData ? (
        <SkeletonStack>
          <Skeleton style={{ height: "14px", width: "100%" }} />
          <Skeleton style={{ height: "14px", width: "92%" }} />
          <Skeleton style={{ height: "14px", width: "78%" }} />
          <Skeleton style={{ height: "14px", width: "60%" }} />
        </SkeletonStack>
      ) : data ? (
        <Body>
          <SummaryGrid>
            <InsightCard>
              <InsightHeader>
                <InsightTitle>
                  <IndianRupee size={13} />
                  Money
                </InsightTitle>
                <InsightBadge>
                  <Activity size={11} />
                  Finance
                </InsightBadge>
              </InsightHeader>
              {financeBullets.length > 0 ? (
                <InsightList>
                  {financeBullets.map((item, index) => (
                    <InsightItem key={`finance-${index}`}>
                      <Bullet />
                      <span>
                        {index === 0 ? <Highlight>{item}</Highlight> : item}
                      </span>
                    </InsightItem>
                  ))}
                </InsightList>
              ) : data.finance ? (
                <EmptyState>
                  <ArrowRight size={12} />
                  <span>{data.finance}</span>
                </EmptyState>
              ) : (
                <Failed>Finance analysis unavailable.</Failed>
              )}
            </InsightCard>

            <InsightCard>
              <InsightHeader>
                <InsightTitle>
                  <Heart size={13} />
                  Health
                </InsightTitle>
                <InsightBadge>
                  <Sparkles size={11} />
                  Wellness
                </InsightBadge>
              </InsightHeader>
              {healthBullets.length > 0 ? (
                <InsightList>
                  {healthBullets.map((item, index) => (
                    <InsightItem key={`health-${index}`}>
                      <Bullet />
                      <span>
                        {index === 0 ? <Highlight>{item}</Highlight> : item}
                      </span>
                    </InsightItem>
                  ))}
                </InsightList>
              ) : data.health ? (
                <EmptyState>
                  <ArrowRight size={12} />
                  <span>{data.health}</span>
                </EmptyState>
              ) : (
                <Failed>Health analysis unavailable.</Failed>
              )}
            </InsightCard>
          </SummaryGrid>
        </Body>
      ) : (
        <Hint>
          {isError
            ? "Could not reach the AI — try again."
            : "One click and the AI reads your finance + health logs and gives you a plain-English overview of where you stand."}
        </Hint>
      )}
    </Card>
  );
}
