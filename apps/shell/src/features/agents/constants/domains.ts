export const AGENT_DOMAINS: Record<string, string> = {
  "aios-morning-brief": "General",
  "aios-professional-pulse": "Career & Business",
  "aios-content-strategist": "Content",
  "aios-monthly-finance": "Finance",
  "aios-weekly-refresh": "General",
  "aios-health-coach": "Health",
  "aios-upi-tracker": "Finance",
  "aios-vault-extractor": "General",
};

export const AGENT_DESCRIPTIONS: Record<string, string> = {
  "aios-morning-brief": "Your daily chief-of-staff briefing.\n\n• Summarizes today's calendar and conflicts.\n• Highlights top 3 cross-domain priorities.\n• Triages your inbox into Reply, Action, and Ignore.\n• Curates 1-2 research topics from your knowledge base.\n\nRuns every day at 06:00.",
  "aios-professional-pulse": "Your weekly career and business strategist.\n\n• Reviews progress on active projects and business goals.\n• Identifies gaps between stated goals and actual time spent.\n• Flags the biggest open risk or blocker.\n• Proposes the single highest-leverage action for next week.\n\nRuns every Monday at 07:00.",
  "aios-content-strategist": "Your weekly content pipeline manager.\n\n• Analyzes what shipped this week and early signals.\n• Reviews drafts stuck in the pipeline.\n• Proposes a 7-day content calendar.\n• Details platform, topic, hook, and format tailored to your audience.\n\nRuns every Sunday at 19:00.",
  "aios-monthly-finance": "Your personal CFO snapshot.\n\n• Compares income vs spend against budget.\n• Identifies top spend categories and anomalies.\n• Tracks progress on financial goals.\n• Proactively creates tasks or updates goals to stay on track.\n\nRuns on the 1st of every month.",
  "aios-weekly-refresh": "Your Sunday operating-system maintainer.\n\n• Reviews progress goal-by-goal.\n• Flags tasks or goals drifting for 2+ weeks.\n• Suggests a focus theme for the coming week.\n• Helps you reset and plan intentionally.\n\nRuns every Sunday at 20:00.",
  "aios-health-coach": "Your Monday fitness and health check-in.\n\n• Analyzes trends in steps, weight, and workouts vs baseline.\n• Tracks habit streaks kept or broken.\n• Suggests one specific, achievable adjustment for the week.\n• Automatically logs metrics back to your database.\n\nRuns every Monday at 06:00.",
  "aios-upi-tracker": "Your automated finance tracker.\n\n• Scans incoming emails for financial transactions.\n• Parses UPI receipts, credit card spends, and incoming transfers.\n• Extracts amount, payee, and transaction type.\n• Silently logs structured transactions to your finance ledger.\n\nRuns every day at 06:00.",
  "aios-vault-extractor": "Your background data sweeper.\n\n• Sweeps diffs from your Obsidian/local vault.\n• Extracts structured tasks, insights, and concepts.\n• Syncs new knowledge to the PostgreSQL database.\n• Operates silently in the background.\n\nRuns every day at 23:00.",
};

export const DOMAIN_OPTIONS = ["All", "General", "Career & Business", "Content", "Finance", "Health"];

export function getAgentDomain(taskId: string) {
  return AGENT_DOMAINS[taskId] || "General";
}

export function getAgentLongDescription(taskId: string, fallback: string) {
  return AGENT_DESCRIPTIONS[taskId] || fallback;
}
