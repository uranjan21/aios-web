## 2026-06-20T17:47:30Z
You are teamwork_preview_explorer.
Your working directory is: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_explorer_card_std_1_gen1
Your task is to audit Card and GlassCard usages, and any custom card containers (div wrappers) in the general pages of aios-web (excluding area pages under pages/areas/), and common layout components under components/layout/.
Specifically, look at:
- DashboardPage.tsx
- LoginPage.tsx
- ChatPage.tsx
- AgentsPage.tsx
- SettingsPage.tsx
- IntegrationsPage.tsx
- Components inside components/layout/ (like AppShell, Sidebar, TopBar, BottomNav etc.)
For each card/chart/KPI tile in these files:
- Identify if it uses @ledgr/ui Card or GlassCard, or if it uses a custom div wrapper.
- Identify if it has an icon and a subtitle. If not, recommend appropriate icon and subtitle.
- Identify if it has filters/actions (segmented controls, dropdowns, etc.) and where they are placed. Recommend moving them to the 'action' prop of Card if they are currently inside the card body or hardcoded.
- If it has no filters, suggest a relevant period/status filter to be placed in the 'action' prop.
- If it has a chart legend, recommend extracting it from the chart canvas to HTML in the 'action' prop.
Write your findings in analysis.md and summarize in handoff.md in your working directory. Notify your parent agent by calling send_message with your results and files when complete.
