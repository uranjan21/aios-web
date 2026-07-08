export const AGENT_DOMAINS: Record<string, string> = {
  "aios-morning-brief": "General",
  "aios-news-radar": "Career & Business",
  "aios-weekly-calendar": "Content",
  "aios-career-checkpoint": "Career & Business",
  "aios-monthly-finance": "Finance",
  "aios-evening-review": "General",
  "aios-weekly-refresh": "General",
  "aios-content-performance": "Content",
  "aios-health-coach": "Health",
  "aios-business-pulse": "Career & Business",
  "aios-inbox-triage": "General",
  "aios-upi-tracker": "Finance",
};

export const DOMAIN_OPTIONS = ["All", "General", "Career & Business", "Content", "Finance", "Health"];

export function getAgentDomain(taskId: string) {
  return AGENT_DOMAINS[taskId] || "General";
}
