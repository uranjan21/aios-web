export const QUICK_PROMPTS = [
  { label: 'Log gym session', value: "Log today's gym session" },
  { label: 'Week spending?', value: 'What did I spend this week?' },
]

/** Prefix @-mention + current-route hints the backend treats as data context. */
export function buildHiddenContext(message: string, pathname: string): string {
  let extraContext = ''
  if (message.includes('@vault')) extraContext += '\n[System: The user mentioned @vault. Prioritize searching the vault.]'
  if (message.includes('@finance')) extraContext += '\n[System: The user mentioned @finance. Use financial context and tools.]'
  if (message.includes('@health')) extraContext += '\n[System: The user mentioned @health. Use health context and tools.]'
  if (message.includes('@goals')) extraContext += '\n[System: The user mentioned @goals. Use goal tracking context.]'
  return `[System: The user is currently viewing the ${pathname} route in the app. Use this context if the user asks a contextual question like 'what is this' or 'summarize my page'.]${extraContext}`
}
