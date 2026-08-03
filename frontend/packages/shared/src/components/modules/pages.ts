/**
 * Page compositions — the redesign's `PAGES` table, ported verbatim.
 *
 * Each key is `area:section` and maps to an ORDERED list of modules that
 * `ModuleGrid` renders on a 12-column grid. The rule the canvas states for
 * itself: "the module set answers the question the page name asks. No
 * KPI-row-everywhere."
 *
 * The CONTENT here is the designer's sample data, transcribed from
 * `Control Tower Redesign.dc.html`. It is placeholder copy, not live data —
 * Phase 4 swaps each page's module list for one built from its API response,
 * keeping the same shapes. Treat these as the layout contract.
 */
import {
  Activity, BarChart3, Bell, CheckSquare, Circle, Cpu, CreditCard, FileText, Flag, Gem, Inbox, Landmark, Layers, LayoutGrid, MessageCircle, Moon, PieChart, Settings, Shield, TrendingUp, User, Zap,
} from 'lucide-react'
import type { ModuleSpec } from '@ct/shared/components/modules'

export const PAGES: Record<string, ModuleSpec[]> = {
  "today:review": [
    {
      kind: "progress",
      span: 7,
      title: "Week 31 scorecard",
      subtitle: "Mon 27 Jul – Sun 2 Aug",
      icon: BarChart3,
      action: "Recalculate",
      rows: [
        {
          title: "Finance",
          meta: "5 of 6 categories under limit · savings rate 34%",
          pct: 83,
          value: "83",
          colorKey: "finance"
        },
        {
          title: "Health",
          meta: "3 of 5 workouts · sleep avg 7h 02m",
          pct: 64,
          value: "64",
          colorKey: "health"
        },
        {
          title: "Career",
          meta: "4 deep-work blocks · 1 feature shipped",
          pct: 72,
          value: "72",
          colorKey: "career"
        },
        {
          title: "Workspace",
          meta: "2 of 9 sprint tasks closed",
          pct: 22,
          value: "22",
          colorKey: "warning"
        }
      ]
    },
    {
      kind: "checklist",
      span: 5,
      title: "Review ritual",
      subtitle: "4 steps · about 12 minutes",
      icon: CheckSquare,
      items: [
        {
          label: "Reconcile last week transactions",
          meta: "6 still unreviewed",
          done: true,
          tagLabel: "Finance",
          tagKey: "finance"
        },
        {
          label: "Check budget overruns",
          meta: "Shopping is 148% of limit",
          done: true,
          tagLabel: "Finance",
          tagKey: "finance"
        },
        {
          label: "Log workouts and weight",
          meta: "Body metrics missing for Thu",
          done: false,
          tagLabel: "Health",
          tagKey: "health"
        },
        {
          label: "Move unfinished sprint tasks",
          meta: "7 tasks still open in 2026-S16",
          done: false,
          tagLabel: "Workspace",
          tagKey: "mutedFg"
        }
      ]
    },
    {
      kind: "notes",
      span: 7,
      title: "Reflection",
      subtitle: "Saved to your career journal on submit",
      icon: FileText,
      cta: "Close the week",
      prompts: [
        {
          label: "What actually moved this week",
          placeholder: "One or two things that mattered…",
          height: "82px"
        },
        {
          label: "What slipped, and why",
          placeholder: "Be specific about the cause, not the guilt…",
          height: "82px"
        },
        {
          label: "One priority for next week",
          placeholder: "The single thing that would make next week a win…",
          height: "62px"
        }
      ]
    },
    {
      kind: "timeline",
      span: 5,
      title: "Wins logged",
      subtitle: "Captured during your daily briefs",
      icon: Flag,
      entries: [
        {
          title: "Shipped vault sync writeback guard",
          body: "Fixed the double-write bug that was corrupting habit streaks.",
          date: "Thu",
          tagLabel: "Career",
          colorKey: "career"
        },
        {
          title: "Four planned workouts hit",
          body: "Missed only the Wednesday session.",
          date: "Wed",
          tagLabel: "Health",
          colorKey: "health"
        },
        {
          title: "Under budget in 5 of 6 categories",
          body: "Dining out came in at 96% — close call.",
          date: "Tue",
          tagLabel: "Finance",
          colorKey: "finance"
        },
        {
          title: "Cleared Ledgr onboarding backlog",
          body: "All 5 onboarding tickets closed.",
          date: "Mon",
          tagLabel: "Workspace",
          colorKey: "mutedFg"
        }
      ]
    }
  ],

  "today:plan": [
    {
      kind: "week",
      span: 12,
      title: "Week of 3 August",
      subtitle: "12 focus blocks planned across 4 domains",
      icon: Layers,
      action: "Add block",
      days: [
        {
          label: "Mon",
          date: "3",
          today: true,
          blocks: [
            {
              time: "09:00",
              title: "Standup — Ledgr",
              colorKey: "career"
            },
            {
              time: "10:00",
              title: "Deep work — sync guard",
              colorKey: "career"
            },
            {
              time: "18:30",
              title: "Gym — push",
              colorKey: "health"
            }
          ]
        },
        {
          label: "Tue",
          date: "4",
          blocks: [
            {
              time: "11:30",
              title: "Budget review call",
              colorKey: "finance"
            },
            {
              time: "14:00",
              title: "Deep work — Ledgr API",
              colorKey: "career"
            }
          ]
        },
        {
          label: "Wed",
          date: "5",
          blocks: [
            {
              time: "07:00",
              title: "Long run 10k",
              colorKey: "health"
            },
            {
              time: "13:00",
              title: "CC bill + SIP debit",
              colorKey: "finance"
            }
          ]
        },
        {
          label: "Thu",
          date: "6",
          blocks: [
            {
              time: "10:00",
              title: "Deep work — DSA",
              colorKey: "career"
            },
            {
              time: "18:30",
              title: "Gym — pull",
              colorKey: "health"
            }
          ]
        },
        {
          label: "Fri",
          date: "7",
          blocks: [
            {
              time: "09:30",
              title: "Sprint close 2026-S16",
              colorKey: "mutedFg"
            },
            {
              time: "17:00",
              title: "Weekly review",
              colorKey: "accent"
            }
          ]
        },
        {
          label: "Sat",
          date: "8",
          blocks: [
            {
              time: "10:00",
              title: "Content batch — 2 reels",
              colorKey: "mutedFg"
            }
          ]
        },
        {
          label: "Sun",
          date: "9",
          blocks: [
            {
              time: "18:00",
              title: "Plan next week",
              colorKey: "accent"
            }
          ]
        }
      ]
    },
    {
      kind: "progress",
      span: 6,
      title: "Planned hours vs capacity",
      subtitle: "Where next week is actually going",
      icon: BarChart3,
      rows: [
        {
          title: "Career — deep work",
          meta: "18h planned of 20h capacity",
          pct: 90,
          value: "18h",
          colorKey: "career"
        },
        {
          title: "Workspace — sprint",
          meta: "6h planned of 10h capacity",
          pct: 60,
          value: "6h",
          colorKey: "warning"
        },
        {
          title: "Health — training",
          meta: "5h planned of 5h capacity",
          pct: 100,
          value: "5h",
          colorKey: "health"
        },
        {
          title: "Finance — admin",
          meta: "2h planned of 4h capacity",
          pct: 50,
          value: "2h",
          colorKey: "finance"
        }
      ]
    },
    {
      kind: "rows",
      span: 6,
      title: "One priority per day",
      subtitle: "If nothing else happens, this does",
      icon: Flag,
      rows: [
        {
          title: "Ship vault sync writeback guard",
          meta: "Monday",
          tagLabel: "Career",
          tagColorKey: "career"
        },
        {
          title: "Renegotiate dining-out budget",
          meta: "Tuesday",
          tagLabel: "Finance",
          tagColorKey: "finance"
        },
        {
          title: "10k run under 55 min",
          meta: "Wednesday",
          tagLabel: "Health",
          tagColorKey: "health"
        },
        {
          title: "Close sprint 2026-S16",
          meta: "Friday",
          tagLabel: "Workspace",
          tagColorKey: "mutedFg"
        },
        {
          title: "Weekly review + plan",
          meta: "Sunday",
          tagLabel: "Ritual",
          tagColorKey: "accent"
        }
      ]
    }
  ],

  "finance:bills": [
    {
      kind: "calendar",
      span: 7,
      title: "August 2026",
      subtitle: "₹46,249 due across 6 bills",
      icon: FileText,
      action: "Add bill",
      lead: [27, 28, 29, 30, 31],
      todayLead: 31,
      days: 31,
      trail: [1, 2, 3, 4, 5, 6],
      marks: {
        "1": {
          t: "₹24,000",
          k: "info"
        },
        "5": {
          t: "₹14,200",
          k: "destructive"
        },
        "8": {
          t: "₹1,850",
          k: "info"
        },
        "12": {
          t: "₹799",
          k: "mutedFg"
        },
        "18": {
          t: "₹4,300",
          k: "warning"
        },
        "22": {
          t: "₹1,100",
          k: "info"
        }
      },
      legend: [
        {
          label: "Autopay",
          colorKey: "info"
        },
        {
          label: "Needs action",
          colorKey: "destructive"
        },
        {
          label: "Due soon",
          colorKey: "warning"
        }
      ]
    },
    {
      kind: "rows",
      span: 5,
      title: "Next up",
      subtitle: "Sorted by due date",
      icon: Bell,
      rows: [
        {
          title: "Rent",
          meta: "Tomorrow · autopay from HDFC",
          tagLabel: "Autopay",
          tagColorKey: "info",
          value: "₹24,000"
        },
        {
          title: "HDFC Credit Card",
          meta: "5 Aug · manual payment",
          tagLabel: "Action",
          tagColorKey: "destructive",
          value: "₹14,200"
        },
        {
          title: "Electricity",
          meta: "8 Aug · autopay from HDFC",
          tagLabel: "Autopay",
          tagColorKey: "info",
          value: "₹1,850"
        },
        {
          title: "Phone",
          meta: "12 Aug · autopay from ICICI",
          tagLabel: "Autopay",
          tagColorKey: "info",
          value: "₹799"
        },
        {
          title: "Term insurance",
          meta: "18 Aug · card expiring soon",
          tagLabel: "Check card",
          tagColorKey: "warning",
          value: "₹4,300"
        }
      ]
    },
    {
      kind: "controls",
      span: 12,
      title: "Autopay and reminders",
      subtitle: "Per-bill automation — 4 of 6 bills self-pay",
      icon: Settings,
      rows: [
        {
          title: "Rent",
          meta: "HDFC Savings •• 4021 · 1st of month",
          control: "toggle",
          on: true
        },
        {
          title: "HDFC Credit Card",
          meta: "Full statement balance · 5th of month",
          control: "toggle",
          on: false
        },
        {
          title: "Electricity",
          meta: "HDFC Savings •• 4021 · on bill receipt",
          control: "toggle",
          on: true
        },
        {
          title: "Remind me before due date",
          meta: "Push and email",
          control: "segment",
          options: ["1 day", "3 days", "7 days"],
          value: "3 days"
        }
      ]
    }
  ],

  "finance:goals": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Emergency fund",
          value: "₹1,80,000",
          sub: "Target ₹3,00,000 · done Mar 2027",
          badge: "On track",
          badgeKey: "success",
          bar: 60,
          barKey: "success"
        },
        {
          label: "Home down payment",
          value: "₹4,20,000",
          sub: "Target ₹12,00,000 · 8 months behind",
          badge: "Behind",
          badgeKey: "warning",
          bar: 35,
          barKey: "warning"
        },
        {
          label: "Credit card payoff",
          value: "₹18,900",
          sub: "Of ₹40,000 cleared · done Nov 2026",
          badge: "On track",
          badgeKey: "success",
          bar: 47,
          barKey: "accent"
        }
      ]
    },
    {
      kind: "bars",
      span: 7,
      title: "Monthly contributions",
      subtitle: "Across all three goals · target ₹35,000",
      icon: TrendingUp,
      target: 35,
      targetLabel: "Target",
      bars: [
        {
          label: "Feb",
          v: 28,
          t: "28k",
          colorKey: "accent"
        },
        {
          label: "Mar",
          v: 31,
          t: "31k",
          colorKey: "accent"
        },
        {
          label: "Apr",
          v: 22,
          t: "22k",
          colorKey: "warning"
        },
        {
          label: "May",
          v: 36,
          t: "36k",
          colorKey: "success"
        },
        {
          label: "Jun",
          v: 34,
          t: "34k",
          colorKey: "accent"
        },
        {
          label: "Jul",
          v: 38,
          t: "38k",
          colorKey: "success"
        }
      ]
    },
    {
      kind: "timeline",
      span: 5,
      title: "Projected milestones",
      subtitle: "At your current contribution rate",
      icon: Flag,
      entries: [
        {
          title: "Emergency fund hits 6 months",
          body: "₹2,40,000 covers 6 months of expenses.",
          date: "Dec 2026",
          tagLabel: "Next",
          colorKey: "success"
        },
        {
          title: "Credit card cleared",
          body: "Frees ₹4,700/month of interest and EMI.",
          date: "Nov 2026",
          tagLabel: "Soonest",
          colorKey: "accent"
        },
        {
          title: "Down payment 50%",
          body: "Needs ₹18,000/month — currently ₹11,000.",
          date: "Aug 2027",
          tagLabel: "At risk",
          colorKey: "warning"
        }
      ]
    }
  ],

  "finance:investments": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Portfolio value",
          value: "₹6,40,200",
          sub: "↑ 3.1% this month",
          subKey: "success",
          badge: "+₹19.2k",
          badgeKey: "success"
        },
        {
          label: "Invested",
          value: "₹5,12,000",
          sub: "Across 4 instruments"
        },
        {
          label: "XIRR",
          value: "14.2%",
          sub: "Since Jan 2024",
          subKey: "success"
        },
        {
          label: "Monthly SIP",
          value: "₹15,000",
          sub: "3 active mandates"
        }
      ]
    },
    {
      kind: "donut",
      span: 5,
      title: "Allocation",
      subtitle: "By current value",
      icon: PieChart,
      centerValue: "₹6.4L",
      centerLabel: "Total",
      slices: [
        {
          label: "Indian equity — index",
          pct: 48,
          value: "₹3,10,000",
          colorKey: "career"
        },
        {
          label: "US equity — FoF",
          pct: 29,
          value: "₹1,85,000",
          colorKey: "info"
        },
        {
          label: "Direct equity",
          pct: 16,
          value: "₹1,00,200",
          colorKey: "warning"
        },
        {
          label: "Liquid / debt",
          pct: 7,
          value: "₹45,000",
          colorKey: "mutedFg"
        }
      ]
    },
    {
      kind: "series",
      span: 7,
      title: "Invested vs value",
      subtitle: "Daily valuations",
      icon: TrendingUp,
      xKey: "date",
      emptyLabel: "Daily valuations start building tonight.",
      lines: [
        { key: "value", label: "Current value", colorKey: "career" },
        { key: "invested", label: "Invested", colorKey: "mutedFg", dashed: true }
      ],
      points: [
        { date: "Mar", invested: 452000, value: 468000 },
        { date: "Apr", invested: 467000, value: 471000 },
        { date: "May", invested: 482000, value: 463000 },
        { date: "Jun", invested: 497000, value: 552000 },
        { date: "Jul", invested: 512000, value: 601000 },
        { date: "Aug", invested: 512000, value: 640200 }
      ]
    },
    {
      kind: "bars",
      span: 7,
      title: "Portfolio value",
      subtitle: "Last 8 months, in lakhs",
      icon: TrendingUp,
      bars: [
        {
          label: "Dec",
          v: 452,
          t: "4.5",
          colorKey: "career"
        },
        {
          label: "Jan",
          v: 471,
          t: "4.7",
          colorKey: "career"
        },
        {
          label: "Feb",
          v: 463,
          t: "4.6",
          colorKey: "warning"
        },
        {
          label: "Mar",
          v: 502,
          t: "5.0",
          colorKey: "career"
        },
        {
          label: "Apr",
          v: 538,
          t: "5.4",
          colorKey: "career"
        },
        {
          label: "May",
          v: 571,
          t: "5.7",
          colorKey: "career"
        },
        {
          label: "Jun",
          v: 621,
          t: "6.2",
          colorKey: "career"
        },
        {
          label: "Jul",
          v: 640,
          t: "6.4",
          colorKey: "success"
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Holdings",
      subtitle: "4 instruments · 2 with SIPs due this week",
      icon: Gem,
      action: "Add holding",
      gridCols: "2.2fr 1.2fr 1fr 1fr 0.9fr",
      cols: [
        {
          l: "Instrument"
        },
        {
          l: "Type"
        },
        {
          l: "Invested",
          a: "right"
        },
        {
          l: "Current",
          a: "right"
        },
        {
          l: "Return",
          a: "right"
        }
      ],
      rows: [
        [
          "Nifty 50 Index Fund",
          "SIP ₹8,000/mo",
          "₹2,62,000",
          {
            t: "₹3,10,000",
            bold: true
          },
          {
            t: "+18.4%",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "Nasdaq 100 FoF",
          "SIP ₹5,000/mo",
          "₹1,51,000",
          {
            t: "₹1,85,000",
            bold: true
          },
          {
            t: "+22.1%",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "Direct equity — 6 stocks",
          "Self-managed",
          "₹1,04,000",
          {
            t: "₹1,00,200",
            bold: true
          },
          {
            t: "-4.2%",
            tag: true,
            colorKey: "destructive"
          }
        ],
        [
          "Liquid fund",
          "Emergency buffer",
          "₹42,000",
          {
            t: "₹45,000",
            bold: true
          },
          {
            t: "+6.8%",
            tag: true,
            colorKey: "mutedFg"
          }
        ]
      ]
    }
  ],

  "finance:loans": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Total outstanding",
          value: "₹3,17,750",
          sub: "Down ₹52,400 this year",
          subKey: "success",
          bar: 38,
          barKey: "accent"
        },
        {
          label: "Next EMI",
          value: "₹18,400",
          sub: "Due 5 Aug · HDFC personal",
          badge: "5 days",
          badgeKey: "warning"
        },
        {
          label: "Interest paid in 2026",
          value: "₹21,340",
          sub: "Blended rate 9.2%",
          subKey: "warning"
        }
      ]
    },
    {
      kind: "progress",
      span: 12,
      title: "Payoff progress",
      subtitle: "Principal cleared against original amount",
      icon: Landmark,
      rows: [
        {
          title: "Personal loan — HDFC",
          meta: "₹2,40,000 left of ₹4,50,000 · 9.5% · 14 EMIs to go",
          pct: 47,
          value: "47%",
          colorKey: "accent"
        },
        {
          title: "Vehicle loan — ICICI",
          meta: "₹77,750 left of ₹2,20,000 · 8.9% · 22 EMIs to go",
          pct: 65,
          value: "65%",
          colorKey: "success"
        }
      ]
    },
    {
      kind: "table",
      span: 7,
      title: "EMI schedule",
      subtitle: "Next four instalments",
      icon: FileText,
      gridCols: "1fr 1.5fr 1fr 1fr",
      cols: [
        {
          l: "Date"
        },
        {
          l: "Loan"
        },
        {
          l: "Principal",
          a: "right"
        },
        {
          l: "Interest",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "5 Aug",
            bold: true
          },
          "HDFC personal",
          "₹16,500",
          {
            t: "₹1,900",
            colorKey: "warning"
          }
        ],
        [
          {
            t: "10 Aug",
            bold: true
          },
          "ICICI vehicle",
          "₹3,120",
          {
            t: "₹580",
            colorKey: "warning"
          }
        ],
        [
          {
            t: "5 Sep",
            bold: true
          },
          "HDFC personal",
          "₹16,630",
          {
            t: "₹1,770",
            colorKey: "warning"
          }
        ],
        [
          {
            t: "10 Sep",
            bold: true
          },
          "ICICI vehicle",
          "₹3,140",
          {
            t: "₹560",
            colorKey: "warning"
          }
        ]
      ]
    },
    {
      kind: "donut",
      span: 5,
      title: "What you have paid so far",
      subtitle: "Principal vs interest, both loans",
      icon: PieChart,
      centerValue: "₹2.9L",
      centerLabel: "Paid",
      slices: [
        {
          label: "Principal cleared",
          pct: 78,
          value: "₹2,52,250",
          colorKey: "success"
        },
        {
          label: "Interest cost",
          pct: 22,
          value: "₹68,900",
          colorKey: "destructive"
        }
      ]
    }
  ],

  "finance:inbox": [
    {
      kind: "queue",
      span: 12,
      title: "Needs review",
      subtitle: "6 transactions · oldest 5 days old",
      icon: Inbox,
      action: "Approve all safe",
      rows: [
        {
          mono: "IR",
          title: "IRCTC",
          meta: "27 Jul · HDFC •• 4021",
          amount: "-₹1,240",
          amountKey: "destructive",
          suggestion: "Suggested: Travel",
          suggestKey: "info",
          primary: "Approve",
          secondary: "Change"
        },
        {
          mono: "??",
          title: "Unknown UPI merchant",
          meta: "26 Jul · possible duplicate of Zomato ₹500",
          amount: "-₹500",
          amountKey: "destructive",
          suggestion: "Possible duplicate",
          suggestKey: "destructive",
          primary: "Merge",
          secondary: "Keep both",
          flag: true
        },
        {
          mono: "DC",
          title: "Decathlon",
          meta: "25 Jul · HDFC •• 4021",
          amount: "-₹3,299",
          amountKey: "destructive",
          suggestion: "Suggested: Health & fitness",
          suggestKey: "health",
          primary: "Approve",
          secondary: "Change"
        },
        {
          mono: "SW",
          title: "Swiggy Instamart",
          meta: "24 Jul · HDFC •• 4021",
          amount: "-₹842",
          amountKey: "destructive",
          suggestion: "Suggested: Groceries",
          suggestKey: "info",
          primary: "Approve",
          secondary: "Change"
        },
        {
          mono: "RF",
          title: "Refund — Amazon",
          meta: "23 Jul · ICICI •• 7710",
          amount: "+₹1,299",
          amountKey: "success",
          suggestion: "Suggested: Refund",
          suggestKey: "success",
          primary: "Approve",
          secondary: "Change"
        },
        {
          mono: "AT",
          title: "ATM withdrawal",
          meta: "22 Jul · needs a note",
          amount: "-₹5,000",
          amountKey: "destructive",
          suggestion: "Split into categories",
          suggestKey: "warning",
          primary: "Split",
          secondary: "Skip"
        }
      ]
    },
    {
      kind: "controls",
      span: 6,
      title: "Auto-categorization rules",
      subtitle: "Applied before anything reaches this inbox",
      icon: Zap,
      rows: [
        {
          title: "Learn from my corrections",
          meta: "92 merchants learned so far",
          control: "toggle",
          on: true
        },
        {
          title: "Auto-approve under",
          meta: "Small recurring merchants only",
          control: "select",
          value: "₹500"
        },
        {
          title: "Flag duplicates",
          meta: "Same amount within 10 minutes",
          control: "toggle",
          on: true
        },
        {
          title: "Auto-file salary credits",
          meta: "Matched to ICICI •• 7710",
          control: "toggle",
          on: true
        }
      ]
    },
    {
      kind: "rows",
      span: 6,
      title: "Filed automatically today",
      subtitle: "11 transactions needed no input",
      icon: CheckSquare,
      rows: [
        {
          title: "Netflix",
          meta: "Subscriptions · rule match",
          tagLabel: "Auto",
          tagColorKey: "success",
          value: "-₹649"
        },
        {
          title: "BluSmart",
          meta: "Transport · rule match",
          tagLabel: "Auto",
          tagColorKey: "success",
          value: "-₹340"
        },
        {
          title: "Salary — Ledgr Inc",
          meta: "Income · rule match",
          tagLabel: "Auto",
          tagColorKey: "success",
          value: "+₹1,85,000"
        },
        {
          title: "Big Basket",
          meta: "Groceries · learned merchant",
          tagLabel: "Learned",
          tagColorKey: "info",
          value: "-₹3,120"
        }
      ]
    }
  ],

  "finance:accounts": [
    {
      kind: "tiles",
      span: 12,
      tileCols: "repeat(auto-fit,minmax(230px,1fr))",
      tiles: [
        {
          label: "HDFC Savings •• 4021",
          value: "₹4,10,200",
          sub: "Synced 12 minutes ago",
          badge: "Primary",
          dotKey: "success"
        },
        {
          label: "ICICI Salary •• 7710",
          value: "₹2,85,000",
          sub: "Synced 12 minutes ago",
          badge: "Salary",
          dotKey: "success"
        },
        {
          label: "HDFC Credit •• 8843",
          value: "-₹14,200",
          sub: "22% of ₹65,000 limit",
          bar: 22,
          barKey: "warning",
          dotKey: "warning"
        },
        {
          label: "Groww Demat",
          value: "₹6,40,200",
          sub: "Sync failed 2 days ago",
          subKey: "destructive",
          badge: "Reconnect",
          badgeKey: "destructive",
          dotKey: "destructive"
        }
      ]
    },
    {
      kind: "table",
      span: 7,
      title: "Connections",
      subtitle: "4 institutions · 1 needs attention",
      icon: Landmark,
      action: "Link account",
      gridCols: "1.6fr 1fr 1fr 0.8fr",
      cols: [
        {
          l: "Institution"
        },
        {
          l: "Type"
        },
        {
          l: "Last sync"
        },
        {
          l: "Status",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "HDFC Bank",
            bold: true
          },
          "Savings + card",
          "12 min ago",
          {
            t: "Healthy",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "ICICI Bank",
            bold: true
          },
          "Salary account",
          "12 min ago",
          {
            t: "Healthy",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "Groww",
            bold: true
          },
          "Demat",
          "2 days ago",
          {
            t: "Expired",
            tag: true,
            colorKey: "destructive"
          }
        ],
        [
          {
            t: "Cash wallet",
            bold: true
          },
          "Manual",
          "Manual entry",
          {
            t: "Manual",
            tag: true,
            colorKey: "mutedFg"
          }
        ]
      ]
    },
    {
      kind: "progress",
      span: 5,
      title: "Credit utilization",
      subtitle: "Keep each card under 30%",
      icon: CreditCard,
      rows: [
        {
          title: "HDFC Credit •• 8843",
          meta: "₹14,200 of ₹65,000 limit",
          pct: 22,
          value: "22%",
          colorKey: "success"
        },
        {
          title: "Amazon Pay ICICI •• 2210",
          meta: "₹9,800 of ₹40,000 limit",
          pct: 25,
          value: "25%",
          colorKey: "success"
        },
        {
          title: "Overall exposure",
          meta: "₹24,000 of ₹1,05,000 total limit",
          pct: 23,
          value: "23%",
          colorKey: "accent"
        }
      ]
    }
  ],

  "health:workouts": [
    {
      kind: "bars",
      span: 7,
      title: "Training load",
      subtitle: "Last 7 days, minutes trained",
      icon: Activity,
      target: 45,
      targetLabel: "Daily target",
      bars: [
        {
          label: "Mon",
          v: 48,
          t: "48",
          colorKey: "health"
        },
        {
          label: "Tue",
          v: 62,
          t: "62",
          colorKey: "health"
        },
        {
          label: "Wed",
          v: 0,
          t: "—",
          dim: true
        },
        {
          label: "Thu",
          v: 55,
          t: "55",
          colorKey: "health"
        },
        {
          label: "Fri",
          v: 28,
          t: "28",
          colorKey: "warning"
        },
        {
          label: "Sat",
          v: 0,
          t: "—",
          dim: true
        },
        {
          label: "Sun",
          v: 25,
          t: "25",
          colorKey: "warning"
        }
      ]
    },
    {
      kind: "checklist",
      span: 5,
      title: "This week plan",
      subtitle: "3 of 5 sessions done",
      icon: CheckSquare,
      items: [
        {
          label: "Upper body — push",
          meta: "Mon · 48 min · 6 exercises",
          done: true,
          tagLabel: "Strength",
          tagKey: "health"
        },
        {
          label: "Run — 5k tempo",
          meta: "Tue · 28 min · 5:36/km",
          done: true,
          tagLabel: "Cardio",
          tagKey: "health"
        },
        {
          label: "Lower body — squat focus",
          meta: "Thu · 55 min",
          done: true,
          tagLabel: "Strength",
          tagKey: "health"
        },
        {
          label: "Upper body — pull",
          meta: "Planned Fri",
          done: false,
          tagLabel: "Missed",
          tagKey: "warning"
        },
        {
          label: "Long run — 10k",
          meta: "Planned Sat",
          done: false,
          tagLabel: "Upcoming",
          tagKey: "mutedFg"
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Session log",
      subtitle: "Latest sessions with volume and best sets",
      icon: Activity,
      action: "Log workout",
      gridCols: "1fr 1.6fr 1fr 0.9fr 1.1fr",
      cols: [
        {
          l: "Date"
        },
        {
          l: "Session"
        },
        {
          l: "Focus"
        },
        {
          l: "Duration",
          a: "right"
        },
        {
          l: "Best set",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "Today",
            bold: true
          },
          "Upper body — push",
          "Chest, shoulders",
          "48 min",
          {
            t: "Bench 72.5kg ×6",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "Yesterday",
          "Run — 5k tempo",
          "Cardio",
          "28 min",
          {
            t: "5:36/km avg",
            tag: true,
            colorKey: "health"
          }
        ],
        [
          "29 Jul",
          "Lower body",
          "Squat, hinge",
          "55 min",
          {
            t: "Squat 95kg ×5",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "27 Jul",
          "Yoga — mobility",
          "Recovery",
          "25 min",
          {
            t: "—",
            colorKey: "mutedFg"
          }
        ],
        [
          "26 Jul",
          "Upper body — pull",
          "Back, biceps",
          "44 min",
          {
            t: "Row 60kg ×8",
            colorKey: "mutedFg"
          }
        ]
      ]
    }
  ],

  "health:nutrition": [
    {
      kind: "donut",
      span: 4,
      title: "Macros today",
      subtitle: "2,140 kcal of 2,200 target",
      icon: Circle,
      centerValue: "2,140",
      centerLabel: "kcal",
      slices: [
        {
          label: "Protein",
          pct: 22,
          value: "118 g",
          colorKey: "health"
        },
        {
          label: "Carbs",
          pct: 48,
          value: "257 g",
          colorKey: "warning"
        },
        {
          label: "Fat",
          pct: 30,
          value: "71 g",
          colorKey: "info"
        }
      ]
    },
    {
      kind: "progress",
      span: 8,
      title: "Daily targets",
      subtitle: "Where today stands at 9 PM",
      icon: Flag,
      rows: [
        {
          title: "Calories",
          meta: "2,140 of 2,200 kcal · 60 left",
          pct: 97,
          value: "97%",
          colorKey: "success"
        },
        {
          title: "Protein",
          meta: "118 of 120 g · 2 g left",
          pct: 98,
          value: "98%",
          colorKey: "health"
        },
        {
          title: "Water",
          meta: "2.1 of 2.5 L · one glass short",
          pct: 84,
          value: "84%",
          colorKey: "info"
        },
        {
          title: "Fibre",
          meta: "19 of 30 g · low three days running",
          pct: 63,
          value: "63%",
          colorKey: "warning"
        }
      ]
    },
    {
      kind: "timeline",
      span: 6,
      title: "Meals today",
      subtitle: "4 entries · last logged 8:42 PM",
      icon: Circle,
      action: "Log meal",
      entries: [
        {
          title: "Dinner — grilled chicken bowl",
          body: "560 kcal · 48g protein · logged from photo",
          date: "8:42 PM",
          tagLabel: "560 kcal",
          colorKey: "health"
        },
        {
          title: "Snack — protein shake",
          body: "220 kcal · 25g protein",
          date: "5:00 PM",
          tagLabel: "220 kcal",
          colorKey: "mutedFg"
        },
        {
          title: "Lunch — dal, rice, salad",
          body: "680 kcal · 22g protein",
          date: "1:30 PM",
          tagLabel: "680 kcal",
          colorKey: "warning"
        },
        {
          title: "Breakfast — oats and eggs",
          body: "420 kcal · 23g protein",
          date: "8:15 AM",
          tagLabel: "420 kcal",
          colorKey: "mutedFg"
        }
      ]
    },
    {
      kind: "bars",
      span: 6,
      title: "Calories last 7 days",
      subtitle: "Against a 2,200 kcal target",
      icon: BarChart3,
      target: 2200,
      max: 2600,
      bars: [
        {
          label: "Mon",
          v: 2180,
          t: "2.2k",
          colorKey: "success"
        },
        {
          label: "Tue",
          v: 2410,
          t: "2.4k",
          colorKey: "warning"
        },
        {
          label: "Wed",
          v: 1920,
          t: "1.9k",
          colorKey: "info"
        },
        {
          label: "Thu",
          v: 2240,
          t: "2.2k",
          colorKey: "success"
        },
        {
          label: "Fri",
          v: 2560,
          t: "2.6k",
          colorKey: "destructive"
        },
        {
          label: "Sat",
          v: 2050,
          t: "2.1k",
          colorKey: "success"
        },
        {
          label: "Sun",
          v: 2140,
          t: "2.1k",
          colorKey: "success"
        }
      ]
    }
  ],

  "health:body": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Weight",
          value: "74.2 kg",
          sub: "↓ 0.4 kg this week",
          subKey: "success",
          badge: "Goal 72 kg",
          badgeKey: "mutedFg"
        },
        {
          label: "Body fat",
          value: "18.4%",
          sub: "↓ 0.3 pt in 4 weeks",
          subKey: "success"
        },
        {
          label: "Lean mass",
          value: "60.5 kg",
          sub: "Up 0.2 kg",
          subKey: "success"
        },
        {
          label: "BMI",
          value: "23.1",
          sub: "Healthy range"
        }
      ]
    },
    {
      kind: "bars",
      span: 8,
      title: "Weight trend",
      subtitle: "8 weeks · goal 72.0 kg",
      icon: TrendingUp,
      target: 72,
      max: 78,
      targetLabel: "Goal",
      bars: [
        {
          label: "W24",
          v: 76.4,
          t: "76.4",
          colorKey: "mutedFg"
        },
        {
          label: "W25",
          v: 76.1,
          t: "76.1",
          colorKey: "mutedFg"
        },
        {
          label: "W26",
          v: 75.8,
          t: "75.8",
          colorKey: "health"
        },
        {
          label: "W27",
          v: 75.9,
          t: "75.9",
          colorKey: "warning"
        },
        {
          label: "W28",
          v: 75.2,
          t: "75.2",
          colorKey: "health"
        },
        {
          label: "W29",
          v: 74.9,
          t: "74.9",
          colorKey: "health"
        },
        {
          label: "W30",
          v: 74.6,
          t: "74.6",
          colorKey: "health"
        },
        {
          label: "W31",
          v: 74.2,
          t: "74.2",
          colorKey: "success"
        }
      ]
    },
    {
      kind: "progress",
      span: 4,
      title: "Composition",
      subtitle: "Smart scale, this morning",
      icon: User,
      rows: [
        {
          title: "Muscle",
          meta: "60.5 kg of body weight",
          pct: 81,
          value: "81%",
          colorKey: "health"
        },
        {
          title: "Fat",
          meta: "13.7 kg of body weight",
          pct: 18,
          value: "18%",
          colorKey: "warning"
        },
        {
          title: "Hydration",
          meta: "Estimated total body water",
          pct: 58,
          value: "58%",
          colorKey: "info"
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Measurement log",
      subtitle: "Morning, fasted, same scale",
      icon: User,
      action: "Add measurement",
      gridCols: "1fr 1fr 1fr 1fr 1fr",
      cols: [
        {
          l: "Date"
        },
        {
          l: "Weight",
          a: "right"
        },
        {
          l: "Body fat",
          a: "right"
        },
        {
          l: "Waist",
          a: "right"
        },
        {
          l: "Change",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "31 Jul",
            bold: true
          },
          "74.2 kg",
          "18.4%",
          "81 cm",
          {
            t: "-0.4 kg",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "28 Jul",
          "74.6 kg",
          "18.5%",
          "81 cm",
          {
            t: "-0.3 kg",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "24 Jul",
          "74.9 kg",
          "18.7%",
          "82 cm",
          {
            t: "-0.3 kg",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          "21 Jul",
          "75.2 kg",
          "18.7%",
          "82 cm",
          {
            t: "+0.1 kg",
            tag: true,
            colorKey: "warning"
          }
        ]
      ]
    }
  ],

  "health:sleep": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Average sleep",
          value: "7h 02m",
          sub: "Last 7 nights · goal 7h 30m",
          bar: 94,
          barKey: "info"
        },
        {
          label: "Sleep score",
          value: "82",
          sub: "↑ 4 vs last week",
          subKey: "success",
          badge: "Good",
          badgeKey: "success"
        },
        {
          label: "Bedtime consistency",
          value: "88%",
          sub: "Within 30 min of 11:00 PM",
          subKey: "success"
        },
        {
          label: "Sleep debt",
          value: "2h 10m",
          sub: "Accumulated this week",
          subKey: "warning",
          badge: "Repay",
          badgeKey: "warning"
        }
      ]
    },
    {
      kind: "spans",
      span: 12,
      title: "Last 7 nights",
      subtitle: "Bedtime to wake, positioned on a 10 PM – 9 AM axis",
      icon: Moon,
      axis: ["10 PM", "12 AM", "2 AM", "4 AM", "6 AM", "8 AM"],
      nights: [
        {
          label: "Last night",
          start: 11,
          width: 66,
          duration: "7h 12m",
          quality: "Good",
          colorKey: "health"
        },
        {
          label: "30 Jul",
          start: 19,
          width: 60,
          duration: "6h 36m",
          quality: "Fair",
          colorKey: "warning"
        },
        {
          label: "29 Jul",
          start: 8,
          width: 69,
          duration: "7h 32m",
          quality: "Good",
          colorKey: "health"
        },
        {
          label: "28 Jul",
          start: 14,
          width: 64,
          duration: "7h 04m",
          quality: "Good",
          colorKey: "health"
        },
        {
          label: "27 Jul",
          start: 24,
          width: 52,
          duration: "5h 44m",
          quality: "Poor",
          colorKey: "destructive"
        },
        {
          label: "26 Jul",
          start: 10,
          width: 71,
          duration: "7h 48m",
          quality: "Best",
          colorKey: "success"
        },
        {
          label: "25 Jul",
          start: 16,
          width: 62,
          duration: "6h 50m",
          quality: "Fair",
          colorKey: "warning"
        }
      ]
    },
    {
      kind: "donut",
      span: 5,
      title: "Stages last night",
      subtitle: "7h 12m in bed · 4 wake events",
      icon: Moon,
      centerValue: "82",
      centerLabel: "Score",
      slices: [
        {
          label: "Deep",
          pct: 21,
          value: "1h 31m",
          colorKey: "career"
        },
        {
          label: "REM",
          pct: 24,
          value: "1h 44m",
          colorKey: "info"
        },
        {
          label: "Light",
          pct: 49,
          value: "3h 32m",
          colorKey: "health"
        },
        {
          label: "Awake",
          pct: 6,
          value: "25m",
          colorKey: "mutedFg"
        }
      ]
    },
    {
      kind: "rows",
      span: 7,
      title: "What moved your score",
      subtitle: "Correlations across the last 30 nights",
      icon: Zap,
      rows: [
        {
          title: "Screens after 10:30 PM",
          meta: "Score drops 9 points on average",
          tagLabel: "Hurts",
          tagColorKey: "destructive",
          value: "-9"
        },
        {
          title: "Training before 7 PM",
          meta: "Deep sleep up 18 minutes",
          tagLabel: "Helps",
          tagColorKey: "success",
          value: "+18m"
        },
        {
          title: "Caffeine after 4 PM",
          meta: "Time to fall asleep up 14 minutes",
          tagLabel: "Hurts",
          tagColorKey: "destructive",
          value: "+14m"
        },
        {
          title: "Consistent 11 PM bedtime",
          meta: "Best predictor of a score above 85",
          tagLabel: "Helps",
          tagColorKey: "success",
          value: "+11"
        }
      ]
    }
  ],

  "health:habits": [
    {
      kind: "heat",
      span: 12,
      title: "Last 14 days",
      subtitle: "Darker means done · 5 habits tracked daily",
      icon: CheckSquare,
      action: "Add habit",
      colorKey: "health",
      dayLabels: ["18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"],
      habits: [
        {
          label: "Drink 2L water",
          cells: [3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
          streak: "12 days"
        },
        {
          label: "Meditate 10 min",
          cells: [0, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 3, 3, 3],
          streak: "6 days"
        },
        {
          label: "10,000 steps",
          cells: [3, 3, 0, 3, 3, 0, 0, 3, 3, 2, 3, 0, 3, 0],
          streak: "Broken today",
          broken: true
        },
        {
          label: "Sleep before 11pm",
          cells: [3, 0, 0, 3, 3, 3, 0, 0, 3, 0, 3, 3, 0, 3],
          streak: "2 days"
        },
        {
          label: "No screens after 10:30",
          cells: [0, 0, 3, 0, 3, 0, 0, 3, 3, 0, 3, 0, 3, 3],
          streak: "2 days"
        }
      ]
    },
    {
      kind: "checklist",
      span: 5,
      title: "Today",
      subtitle: "3 of 5 done · 2 hours left in the day",
      icon: Circle,
      items: [
        {
          label: "Drink 2L water",
          meta: "2.1 L logged",
          done: true,
          tagLabel: "12 day streak",
          tagKey: "success"
        },
        {
          label: "Meditate 10 min",
          meta: "Morning session",
          done: true,
          tagLabel: "6 day streak",
          tagKey: "success"
        },
        {
          label: "Sleep before 11pm",
          meta: "Set a wind-down alarm",
          done: true,
          tagLabel: "2 day streak",
          tagKey: "success"
        },
        {
          label: "10,000 steps",
          meta: "6,240 so far · 3,760 to go",
          done: false,
          tagLabel: "At risk",
          tagKey: "warning"
        },
        {
          label: "No screens after 10:30",
          meta: "Not yet decided",
          done: false,
          tagLabel: "Pending",
          tagKey: "mutedFg"
        }
      ]
    },
    {
      kind: "progress",
      span: 7,
      title: "Completion rate",
      subtitle: "Last 30 days per habit",
      icon: BarChart3,
      rows: [
        {
          title: "Drink 2L water",
          meta: "28 of 30 days",
          pct: 93,
          value: "93%",
          colorKey: "success"
        },
        {
          title: "Meditate 10 min",
          meta: "23 of 30 days",
          pct: 77,
          value: "77%",
          colorKey: "health"
        },
        {
          title: "Sleep before 11pm",
          meta: "17 of 30 days · weakest link",
          pct: 57,
          value: "57%",
          colorKey: "warning"
        },
        {
          title: "10,000 steps",
          meta: "19 of 30 days",
          pct: 63,
          value: "63%",
          colorKey: "warning"
        },
        {
          title: "No screens after 10:30",
          meta: "14 of 30 days",
          pct: 47,
          value: "47%",
          colorKey: "destructive"
        }
      ]
    }
  ],

  "career:journal": [
    {
      kind: "notes",
      span: 12,
      title: "New entry",
      subtitle: "Thursday, 31 July · 4 day writing streak",
      icon: FileText,
      cta: "Save entry",
      prompts: [
        {
          label: "What did you work on, and what did it teach you",
          placeholder: "Ledgr sync bug — learned that writeback needs an idempotency key…",
          height: "104px"
        }
      ]
    },
    {
      kind: "timeline",
      span: 7,
      title: "Recent entries",
      subtitle: "8 entries in July · 3,200 words",
      icon: FileText,
      action: "All entries",
      entries: [
        {
          title: "Shipped the vault writeback guard",
          body: "Root cause was two writers racing on the same habit file. Idempotency key fixed it in 40 lines.",
          date: "Today",
          tagLabel: "Shipped",
          colorKey: "career"
        },
        {
          title: "Thoughts on the Q3 roadmap",
          body: "Cutting two features to make onboarding actually good was the right call.",
          date: "29 Jul",
          tagLabel: "Thinking",
          colorKey: "info"
        },
        {
          title: "Interview prep — system design",
          body: "Practised rate limiter and feed fanout. Still weak on estimating capacity out loud.",
          date: "27 Jul",
          tagLabel: "Learning",
          colorKey: "warning"
        },
        {
          title: "Post-mortem: the deploy that broke sync",
          body: "No staging parity. Added a smoke test that would have caught it.",
          date: "24 Jul",
          tagLabel: "Post-mortem",
          colorKey: "destructive"
        }
      ]
    },
    {
      kind: "rows",
      span: 5,
      title: "Themes this month",
      subtitle: "Auto-tagged from your entries",
      icon: Layers,
      rows: [
        {
          title: "Ledgr — sync and reliability",
          meta: "Recurring since May",
          tagLabel: "Dominant",
          tagColorKey: "career",
          value: "11"
        },
        {
          title: "System design practice",
          meta: "Interview preparation",
          tagLabel: "Growing",
          tagColorKey: "success",
          value: "6"
        },
        {
          title: "Prioritisation and scope",
          meta: "Roadmap decisions",
          tagLabel: "Steady",
          tagColorKey: "info",
          value: "4"
        },
        {
          title: "Burnout signals",
          meta: "Mentioned twice this month",
          tagLabel: "Watch",
          tagColorKey: "warning",
          value: "2"
        }
      ]
    }
  ],

  "career:opportunities": [
    {
      kind: "kanban",
      span: 12,
      cols: 4,
      columns: [
        {
          label: "Applied",
          count: 2,
          colorKey: "mutedFg",
          cards: [
            {
              title: "Founding Engineer — early stage",
              meta: "Applied 15 Jul · no response yet",
              tagLabel: "16 days",
              tagKey: "warning"
            },
            {
              title: "Backend Lead — logistics SaaS",
              meta: "Applied 28 Jul via referral",
              tagLabel: "3 days",
              tagKey: "mutedFg"
            }
          ]
        },
        {
          label: "Screening",
          count: 1,
          colorKey: "info",
          cards: [
            {
              title: "Staff Engineer — Series B fintech",
              meta: "Recruiter call done 24 Jul",
              tagLabel: "Take-home due 2 Aug",
              tagKey: "warning"
            }
          ]
        },
        {
          label: "Interviewing",
          count: 1,
          colorKey: "career",
          cards: [
            {
              title: "Principal Engineer — referral",
              meta: "System design round 5 Aug, 11 AM",
              tagLabel: "Prep needed",
              tagKey: "destructive"
            }
          ]
        },
        {
          label: "Offer",
          count: 0,
          colorKey: "success",
          cards: []
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Next actions",
      subtitle: "Nothing here should be older than a week",
      icon: CheckSquare,
      action: "Add lead",
      gridCols: "1.7fr 1.7fr 1fr 1fr",
      cols: [
        {
          l: "Company"
        },
        {
          l: "Action"
        },
        {
          l: "Due"
        },
        {
          l: "Stage",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "Series B fintech",
            bold: true
          },
          "Submit take-home",
          {
            t: "2 Aug",
            colorKey: "destructive"
          },
          {
            t: "Screening",
            tag: true,
            colorKey: "info"
          }
        ],
        [
          {
            t: "Referral — Principal",
            bold: true
          },
          "Prep system design",
          {
            t: "4 Aug",
            colorKey: "warning"
          },
          {
            t: "Interviewing",
            tag: true,
            colorKey: "career"
          }
        ],
        [
          {
            t: "Early stage",
            bold: true
          },
          "Follow up on application",
          {
            t: "1 Aug",
            colorKey: "warning"
          },
          {
            t: "Applied",
            tag: true,
            colorKey: "mutedFg"
          }
        ],
        [
          {
            t: "Logistics SaaS",
            bold: true
          },
          "Ask referrer for status",
          {
            t: "6 Aug",
            colorKey: "mutedFg"
          },
          {
            t: "Applied",
            tag: true,
            colorKey: "mutedFg"
          }
        ]
      ]
    }
  ],

  "chat:overview": [
    {
      kind: "chat",
      span: 12,
      title: "Weekly budget breakdown",
      subtitle: "Reading finance, health and workspace data",
      icon: MessageCircle,
      placeholder: "Ask about your money, health, projects or plans…",
      context: [
        {
          label: "Finance",
          colorKey: "finance"
        },
        {
          label: "Live vault",
          colorKey: "success"
        }
      ],
      threads: [
        {
          title: "Weekly budget breakdown",
          meta: "12 messages · today",
          active: true,
          colorKey: "finance"
        },
        {
          title: "Plan next sprint for Ledgr",
          meta: "8 messages · yesterday",
          colorKey: "career"
        },
        {
          title: "Draft workout plan for August",
          meta: "5 messages · 2 days ago",
          colorKey: "health"
        },
        {
          title: "Why did dining out spike?",
          meta: "6 messages · 4 days ago",
          colorKey: "finance"
        },
        {
          title: "Summarise my July journal",
          meta: "3 messages · 5 days ago",
          colorKey: "career"
        }
      ],
      messages: [
        {
          role: "user",
          text: "Where did my money actually go this week?",
          time: "9:02 PM"
        },
        {
          role: "assistant",
          text: "You spent ₹18,420 this week across 23 transactions. Groceries (₹4,180) and dining out (₹3,940) are 44% of it. Dining out is now at 96% of its monthly limit with 4 days left.",
          time: "9:02 PM"
        },
        {
          role: "user",
          text: "What should I cut to stay under budget?",
          time: "9:04 PM"
        },
        {
          role: "assistant",
          text: "Two options: skip the two weekend deliveries you usually place (about ₹1,100), or move ₹1,000 from the subscriptions envelope, which is running 23% under. I would take the first — subscriptions are already trimmed.",
          time: "9:04 PM"
        }
      ],
      suggestions: [
        {
          label: "Show my August bills"
        },
        {
          label: "Am I on track for the emergency fund?"
        },
        {
          label: "Summarise this week for the review"
        },
        {
          label: "What habit is slipping?"
        }
      ]
    }
  ],

  "agents:overview": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Active agents",
          value: "3",
          sub: "2 healthy · 1 needs permission",
          dotKey: "warning"
        },
        {
          label: "Runs today",
          value: "18",
          sub: "16 scheduled · 2 manual"
        },
        {
          label: "Success rate",
          value: "94%",
          sub: "Last 30 days",
          subKey: "success",
          bar: 94,
          barKey: "success"
        },
        {
          label: "Time saved",
          value: "~3.2h",
          sub: "Estimated this week",
          subKey: "success"
        }
      ]
    },
    {
      kind: "agents",
      span: 12,
      cols: 3,
      agents: [
        {
          name: "Daily Brief",
          schedule: "Every day at 7:00 AM",
          on: true,
          iconKey: "accent",
          icon: Zap,
          successPct: "100%",
          statusKey: "success",
          runs: [0.7, 0.9, 0.8, 1, 0.9, 0.85, 1, 0.9, 0.95, 1, 0.8, 0.9, 1, 0.95],
          lastRun: "Ran today, 7:00 AM",
          log: "07:00:02  pulled 4 domains · 07:00:06  brief written · 07:00:06  push sent"
        },
        {
          name: "Weekly Review",
          schedule: "Sundays at 6:00 PM",
          on: true,
          iconKey: "career",
          icon: FileText,
          successPct: "96%",
          statusKey: "success",
          runs: [1, 0.9, 1, 0.95, 1, 1, 0.4, 1, 1, 0.9, 1, 1, 0.95, 1],
          lastRun: "Ran 3 days ago",
          log: "18:00:01  scored 4 domains · 18:00:09  draft saved · awaiting your reflection"
        },
        {
          name: "Budget Watcher",
          schedule: "On every new transaction",
          on: false,
          iconKey: "warning",
          icon: Shield,
          successPct: "Paused",
          statusKey: "warning",
          runs: [0.8, 0.9, 0.85, 1, 0.6, 0.9, 0.8, 0.3, 0, 0, 0, 0, 0, 0],
          lastRun: "Paused 2 days ago",
          log: "ERROR  missing scope: accounts:read · grant permission to resume"
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Run log",
      subtitle: "Last 6 runs across all agents",
      icon: Cpu,
      action: "Export log",
      gridCols: "1fr 1.3fr 1.3fr 0.9fr 0.9fr",
      cols: [
        {
          l: "Time"
        },
        {
          l: "Agent"
        },
        {
          l: "Trigger"
        },
        {
          l: "Duration",
          a: "right"
        },
        {
          l: "Result",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "07:00 today",
            bold: true
          },
          "Daily Brief",
          "Schedule",
          "4.2s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "21:14 yest.",
            bold: true
          },
          "Budget Watcher",
          "Transaction",
          "0.1s",
          {
            t: "Failed",
            tag: true,
            colorKey: "destructive"
          }
        ],
        [
          {
            t: "07:00 yest.",
            bold: true
          },
          "Daily Brief",
          "Schedule",
          "3.9s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "18:00 Sun",
            bold: true
          },
          "Weekly Review",
          "Schedule",
          "11.4s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "14:22 Sat",
            bold: true
          },
          "Daily Brief",
          "Manual",
          "4.0s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "07:00 Sat",
            bold: true
          },
          "Daily Brief",
          "Schedule",
          "4.4s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ]
      ]
    }
  ],

  "settings:appearance": [
    {
      kind: "controls",
      span: 12,
      title: "Theme",
      subtitle: "Applies instantly across every area",
      icon: Layers,
      rows: [
        {
          title: "Palette",
          meta: "Mushroom Taupe — warm neutral with a clay accent",
          control: "swatches",
          swatches: [
            {
              color: "#C68A68",
              active: true
            },
            {
              color: "#7CA6B6"
            },
            {
              color: "#7FAE83"
            },
            {
              color: "#B08BC7"
            }
          ]
        },
        {
          title: "Mode",
          meta: "Dark is the default for evening use",
          control: "segment",
          options: ["Light", "Dark", "System"],
          value: "Dark"
        },
        {
          title: "Density",
          meta: "Row height and card padding",
          control: "segment",
          options: ["Compact", "Comfortable"],
          value: "Comfortable"
        },
        {
          title: "Base font size",
          meta: "Scales all text proportionally",
          control: "slider",
          pct: 50,
          value: "15px"
        }
      ]
    },
    {
      kind: "rows",
      span: 6,
      title: "Domain colours",
      subtitle: "Fixed per area so nav keeps its meaning",
      icon: LayoutGrid,
      rows: [
        {
          title: "Finance",
          meta: "Used for money, bills, budgets",
          tagLabel: "Amber",
          tagColorKey: "finance"
        },
        {
          title: "Health",
          meta: "Used for body, training, sleep",
          tagLabel: "Green",
          tagColorKey: "health"
        },
        {
          title: "Career",
          meta: "Used for journal, opportunities",
          tagLabel: "Sky",
          tagColorKey: "career"
        },
        {
          title: "Workspace",
          meta: "Neutral by design",
          tagLabel: "Stone",
          tagColorKey: "mutedFg"
        }
      ]
    },
    {
      kind: "controls",
      span: 6,
      title: "Layout and motion",
      subtitle: "Chrome behaviour and animation",
      icon: Settings,
      rows: [
        {
          title: "Start with sidebar collapsed",
          meta: "Applies on next load",
          control: "toggle",
          on: false
        },
        {
          title: "Remember last visited page",
          meta: "Reopen where you left off",
          control: "toggle",
          on: true
        },
        {
          title: "Reduce motion",
          meta: "Disables card and bar transitions",
          control: "toggle",
          on: false
        },
        {
          title: "Number format",
          meta: "Affects every amount in the app",
          control: "select",
          value: "Indian (1,80,000)"
        }
      ]
    }
  ],

  "settings:notifications": [
    {
      kind: "controls",
      span: 12,
      title: "Channels",
      subtitle: "How Control Tower reaches you",
      icon: Bell,
      rows: [
        {
          title: "Email digest",
          meta: "utsav@example.com · daily at 7 AM",
          control: "toggle",
          on: true
        },
        {
          title: "Push notifications",
          meta: "2 devices registered",
          control: "toggle",
          on: true
        },
        {
          title: "In-app only",
          meta: "Nothing leaves the app",
          control: "toggle",
          on: false
        }
      ]
    },
    {
      kind: "controls",
      span: 6,
      title: "Alert rules",
      subtitle: "What is worth interrupting you for",
      icon: Zap,
      rows: [
        {
          title: "Budget warning",
          meta: "When a category crosses a threshold",
          control: "select",
          value: "At 90%"
        },
        {
          title: "Bill due reminder",
          meta: "Before the due date",
          control: "segment",
          options: ["1d", "3d", "7d"],
          value: "3d"
        },
        {
          title: "Habit nudge",
          meta: "If a streak is about to break",
          control: "toggle",
          on: true
        },
        {
          title: "Agent failures",
          meta: "Immediately, every time",
          control: "toggle",
          on: true
        },
        {
          title: "Large transaction",
          meta: "Above ₹10,000",
          control: "toggle",
          on: true
        }
      ]
    },
    {
      kind: "controls",
      span: 6,
      title: "Quiet hours",
      subtitle: "Nothing but critical alerts get through",
      icon: Moon,
      rows: [
        {
          title: "Enable quiet hours",
          meta: "Every day",
          control: "toggle",
          on: true
        },
        {
          title: "Window",
          meta: "Aligned to your 11 PM bedtime",
          control: "select",
          value: "10:30 PM – 7:00 AM"
        },
        {
          title: "Allow critical alerts",
          meta: "Overdue bills and agent failures",
          control: "toggle",
          on: true
        },
        {
          title: "Weekend mode",
          meta: "Digest only, no push",
          control: "toggle",
          on: false
        }
      ]
    }
  ],

  "settings:billing": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Current plan",
          value: "Pro",
          sub: "Renews 12 Aug 2026",
          badge: "Active",
          badgeKey: "success",
          accent: true
        },
        {
          label: "Monthly cost",
          value: "₹799",
          sub: "Billed monthly · GST included"
        },
        {
          label: "Next invoice",
          value: "12 Aug",
          sub: "Visa •• 4412"
        }
      ]
    },
    {
      kind: "progress",
      span: 5,
      title: "Usage this cycle",
      subtitle: "Resets on 12 August",
      icon: BarChart3,
      rows: [
        {
          title: "Storage",
          meta: "2.4 GB of 10 GB",
          pct: 24,
          value: "24%",
          colorKey: "success"
        },
        {
          title: "AI messages",
          meta: "412 of 1,000",
          pct: 41,
          value: "41%",
          colorKey: "accent"
        },
        {
          title: "Agent runs",
          meta: "318 of 500",
          pct: 64,
          value: "64%",
          colorKey: "warning"
        },
        {
          title: "Linked accounts",
          meta: "4 of 10",
          pct: 40,
          value: "40%",
          colorKey: "success"
        }
      ]
    },
    {
      kind: "table",
      span: 7,
      title: "Invoices",
      subtitle: "Last four charges",
      icon: FileText,
      action: "Download all",
      gridCols: "1fr 1.4fr 1fr 0.9fr",
      cols: [
        {
          l: "Date"
        },
        {
          l: "Description"
        },
        {
          l: "Amount",
          a: "right"
        },
        {
          l: "Status",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "12 Jul",
            bold: true
          },
          "Pro plan — July",
          "₹799",
          {
            t: "Paid",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "12 Jun",
            bold: true
          },
          "Pro plan — June",
          "₹799",
          {
            t: "Paid",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "12 May",
            bold: true
          },
          "Pro plan — May",
          "₹799",
          {
            t: "Paid",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "12 Apr",
            bold: true
          },
          "Pro plan — April",
          "₹799",
          {
            t: "Paid",
            tag: true,
            colorKey: "success"
          }
        ]
      ]
    },
    {
      kind: "controls",
      span: 12,
      title: "Payment and invoicing",
      subtitle: "Card, billing email and renewal",
      icon: CreditCard,
      rows: [
        {
          title: "Payment method",
          meta: "Visa •• 4412 · expires 08/28",
          control: "select",
          value: "Change card"
        },
        {
          title: "Billing email",
          meta: "Invoices are sent here",
          control: "select",
          value: "utsav@example.com"
        },
        {
          title: "Auto-renew",
          meta: "Cancel any time before renewal",
          control: "toggle",
          on: true
        },
        {
          title: "Billing cycle",
          meta: "Yearly saves 2 months",
          control: "segment",
          options: ["Monthly", "Yearly"],
          value: "Monthly"
        }
      ]
    }
  ],

  "settings:ai": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Balanced",
          value: "Selected",
          sub: "Best mix of speed and reasoning",
          badge: "Current",
          badgeKey: "success",
          accent: true
        },
        {
          label: "Fast",
          value: "Available",
          sub: "Lower latency, shallower answers"
        },
        {
          label: "Deep reasoning",
          value: "Available",
          sub: "Slower · uses 3× message quota"
        }
      ]
    },
    {
      kind: "controls",
      span: 7,
      title: "Behaviour",
      subtitle: "How the assistant answers you",
      icon: Cpu,
      rows: [
        {
          title: "Response style",
          meta: "Applies to chat and daily briefs",
          control: "segment",
          options: ["Concise", "Balanced", "Detailed"],
          value: "Concise"
        },
        {
          title: "Memory",
          meta: "Remembers preferences across sessions",
          control: "toggle",
          on: true
        },
        {
          title: "Proactive suggestions",
          meta: "Assistant can start a thread on its own",
          control: "toggle",
          on: false
        },
        {
          title: "Data retention",
          meta: "Conversations older than this are deleted",
          control: "select",
          value: "12 months"
        }
      ]
    },
    {
      kind: "notes",
      span: 5,
      title: "Custom instructions",
      subtitle: "Prepended to every conversation",
      icon: FileText,
      cta: "Save instructions",
      prompts: [
        {
          label: "Always",
          placeholder: "Be direct. Use Indian number formatting. Flag budget risk before praise…",
          height: "128px"
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Data access",
      subtitle: "What the assistant may read, per area",
      icon: Shield,
      gridCols: "1.4fr 1.8fr 1fr 0.9fr",
      cols: [
        {
          l: "Source"
        },
        {
          l: "Scope"
        },
        {
          l: "Used by"
        },
        {
          l: "Access",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "Finance vault",
            bold: true
          },
          "Transactions, budgets, bills",
          "Chat, Brief",
          {
            t: "Read",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "Health vault",
            bold: true
          },
          "Workouts, sleep, body metrics",
          "Chat, Brief",
          {
            t: "Read",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "Career journal",
            bold: true
          },
          "Entries and themes",
          "Weekly Review",
          {
            t: "Read",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "Bank connections",
            bold: true
          },
          "Balances and account names",
          "Budget Watcher",
          {
            t: "Blocked",
            tag: true,
            colorKey: "destructive"
          }
        ]
      ]
    }
  ],

  "settings:security": [
    {
      kind: "tiles",
      span: 12,
      tiles: [
        {
          label: "Two-factor",
          value: "Enabled",
          sub: "Authenticator app · added Mar 2026",
          badge: "Strong",
          badgeKey: "success",
          dotKey: "success"
        },
        {
          label: "Password age",
          value: "3 months",
          sub: "Rotate every 6 months",
          dotKey: "warning"
        },
        {
          label: "Recovery codes",
          value: "2 left",
          sub: "Generate a new set",
          subKey: "warning",
          badge: "Low",
          badgeKey: "warning",
          dotKey: "warning"
        }
      ]
    },
    {
      kind: "table",
      span: 7,
      title: "Active sessions",
      subtitle: "2 devices signed in",
      icon: Shield,
      action: "Sign out all",
      gridCols: "1.5fr 1.2fr 1fr 0.9fr",
      cols: [
        {
          l: "Device"
        },
        {
          l: "Location"
        },
        {
          l: "Last active"
        },
        {
          l: "",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "MacBook Pro — Chrome",
            bold: true
          },
          "Pune, IN",
          "Now",
          {
            t: "This device",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "iPhone 15 — app",
            bold: true
          },
          "Pune, IN",
          "2 hours ago",
          {
            t: "Revoke",
            tag: true,
            colorKey: "destructive"
          }
        ]
      ]
    },
    {
      kind: "controls",
      span: 5,
      title: "Protection",
      subtitle: "Sign-in and sensitive actions",
      icon: Shield,
      rows: [
        {
          title: "Two-factor authentication",
          meta: "Required at every sign-in",
          control: "toggle",
          on: true
        },
        {
          title: "Login alerts",
          meta: "Email me on new devices",
          control: "toggle",
          on: true
        },
        {
          title: "Re-auth for money actions",
          meta: "Editing bills, accounts, payments",
          control: "toggle",
          on: true
        },
        {
          title: "Session timeout",
          meta: "Auto sign-out when idle",
          control: "select",
          value: "30 days"
        }
      ]
    },
    {
      kind: "rows",
      span: 12,
      title: "Connected apps",
      subtitle: "Third-party access to your vault",
      icon: LayoutGrid,
      rows: [
        {
          title: "Google",
          meta: "Sign-in and calendar read · connected Jan 2026",
          tagLabel: "Manage",
          tagColorKey: "mutedFg"
        },
        {
          title: "GitHub",
          meta: "Repo activity for career logging · connected Mar 2026",
          tagLabel: "Manage",
          tagColorKey: "mutedFg"
        },
        {
          title: "Groww",
          meta: "Portfolio sync · token expired",
          tagLabel: "Reconnect",
          tagColorKey: "destructive"
        }
      ]
    }
  ],

  "admin:overview": [
    {
      kind: "tiles",
      span: 12,
      tileCols: "repeat(auto-fit,minmax(210px,1fr))",
      tiles: [
        {
          label: "API",
          value: "Healthy",
          sub: "p95 latency 142 ms",
          dotKey: "success"
        },
        {
          label: "Database",
          value: "Healthy",
          sub: "Postgres · primary region",
          dotKey: "success"
        },
        {
          label: "Job queue",
          value: "0 waiting",
          sub: "2 workers idle",
          dotKey: "success"
        },
        {
          label: "Last backup",
          value: "6h ago",
          sub: "Next run at 02:00",
          dotKey: "warning"
        }
      ]
    },
    {
      kind: "bars",
      span: 7,
      title: "Requests per hour",
      subtitle: "Last 12 hours · single-tenant instance",
      icon: BarChart3,
      bars: [
        {
          label: "09",
          v: 180,
          t: "180",
          colorKey: "info"
        },
        {
          label: "10",
          v: 240,
          t: "240",
          colorKey: "info"
        },
        {
          label: "11",
          v: 310,
          t: "310",
          colorKey: "info"
        },
        {
          label: "12",
          v: 260,
          t: "260",
          colorKey: "info"
        },
        {
          label: "13",
          v: 190,
          t: "190",
          colorKey: "info"
        },
        {
          label: "14",
          v: 420,
          t: "420",
          colorKey: "warning"
        },
        {
          label: "15",
          v: 380,
          t: "380",
          colorKey: "info"
        },
        {
          label: "16",
          v: 290,
          t: "290",
          colorKey: "info"
        },
        {
          label: "17",
          v: 210,
          t: "210",
          colorKey: "info"
        },
        {
          label: "18",
          v: 160,
          t: "160",
          colorKey: "info"
        },
        {
          label: "19",
          v: 140,
          t: "140",
          colorKey: "info"
        },
        {
          label: "20",
          v: 120,
          t: "120",
          colorKey: "info"
        }
      ]
    },
    {
      kind: "progress",
      span: 5,
      title: "Resource usage",
      subtitle: "Current instance limits",
      icon: Cpu,
      rows: [
        {
          title: "CPU",
          meta: "2 vCPU · 15 min average",
          pct: 34,
          value: "34%",
          colorKey: "success"
        },
        {
          title: "Memory",
          meta: "1.4 GB of 4 GB",
          pct: 35,
          value: "35%",
          colorKey: "success"
        },
        {
          title: "Storage",
          meta: "2.4 GB of 10 GB",
          pct: 24,
          value: "24%",
          colorKey: "success"
        },
        {
          title: "DB connections",
          meta: "17 of 20 in pool",
          pct: 85,
          value: "85%",
          colorKey: "warning"
        }
      ]
    },
    {
      kind: "table",
      span: 12,
      title: "Recent jobs",
      subtitle: "Background workers, last 5 runs",
      icon: Cpu,
      action: "View all",
      gridCols: "1fr 1.5fr 1fr 0.9fr 0.9fr",
      cols: [
        {
          l: "Time"
        },
        {
          l: "Job"
        },
        {
          l: "Trigger"
        },
        {
          l: "Duration",
          a: "right"
        },
        {
          l: "Result",
          a: "right"
        }
      ],
      rows: [
        [
          {
            t: "20:14",
            bold: true
          },
          "vault.sync.writeback",
          "Queue",
          "1.2s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "19:00",
            bold: true
          },
          "finance.import.transactions",
          "Schedule",
          "8.6s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "18:42",
            bold: true
          },
          "agent.budget_watcher",
          "Event",
          "0.1s",
          {
            t: "Failed",
            tag: true,
            colorKey: "destructive"
          }
        ],
        [
          {
            t: "14:00",
            bold: true
          },
          "backup.snapshot",
          "Schedule",
          "42.0s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ],
        [
          {
            t: "07:00",
            bold: true
          },
          "agent.daily_brief",
          "Schedule",
          "4.2s",
          {
            t: "Success",
            tag: true,
            colorKey: "success"
          }
        ]
      ]
    }
  ],
}

/** One-line description shown under the page title. */
export const PAGE_META: Record<string, string> = {
  'today:review': 'Score the week, close it out, write it down',
  'today:plan': 'Block the week before it blocks you',
  'finance:bills': 'What is due, when, and what pays itself',
  'finance:goals': 'Savings targets and projected finish dates',
  'finance:investments': 'Allocation, holdings and portfolio trend',
  'finance:loans': 'Payoff progress, EMIs and interest cost',
  'finance:inbox': 'Triage queue for unreviewed transactions',
  'finance:accounts': 'Linked institutions, balances and sync health',
  'health:workouts': 'Training volume, plan adherence and PRs',
  'health:nutrition': 'Macros, meals and hydration today',
  'health:body': 'Weight trend, composition and measurements',
  'health:sleep': 'Nightly timing, duration and stage mix',
  'health:habits': 'Daily consistency over the last two weeks',
  'career:journal': 'Write, then read back what you learned',
  'career:opportunities': 'Pipeline by stage and next actions',
  'chat:overview': 'Ask your Control Tower anything',
  'agents:overview': 'Scheduled automations and their run history',
  'settings:appearance': 'Palette, mode, density and motion',
  'settings:notifications': 'Channels, alert rules and quiet hours',
  'settings:billing': 'Plan, usage this cycle and invoices',
  'settings:ai': 'Model, behaviour and data access',
  'settings:security': 'Sign-in protection, sessions and apps',
  'admin:overview': 'Service health, throughput and job runs',
}
