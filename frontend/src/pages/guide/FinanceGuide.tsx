import { motion } from 'framer-motion'
import { IndianRupee } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code } from '@/components/ui/DocStyles'

export function FinanceGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={IndianRupee}>Finance Guide</DocH1>
        <DocP>
          Welcome to the personal finance hub. This area is designed to replace disparate spreadsheets and budgeting apps by unifying your net worth tracking, transaction ledger, and long-term financial planning into a single, cohesive dashboard.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Dashboard & Overview</DocH2>
        <DocP>
          The <Code>HomeTab</Code> serves as the command center for your financial life. At a glance, you can view your total Net Worth, a breakdown of this month's Income vs. Expenses, and your current Savings Rate.
        </DocP>
        <DocH3>Financial Health Score</DocH3>
        <DocP>
          The system calculates a dynamic score out of 100 based on your savings rate, debt-to-income ratio, and emergency fund status. This score provides a quick heuristic for your overall financial stability.
        </DocP>
        
        <DocAlert title="AI Insights Engine" type="tip">
          The dashboard features an AI Insights Engine that autonomously analyzes your recent transactions. It will surface actionable advice, such as identifying a higher-than-average spend on "Dining Out" or alerting you to an impending recurring bill.
        </DocAlert>
      </DocSection>

      <DocSection>
        <DocH2>Transactions Manager</DocH2>
        <DocP>
          The <Code>TransactionsTab</Code> is a double-entry ledger optimized for speed and clarity.
        </DocP>
        <DocUl>
          <DocLi><strong>Split Transactions:</strong> Toggle split mode when logging an expense to divide a single receipt across multiple categories (e.g., splitting a supermarket run into "Groceries" and "Household Supplies").</DocLi>
          <DocLi><strong>Advanced Filtering:</strong> Use the search bar or tag filters to isolate specific expenses. Switch between List and Calendar views to visualise spending patterns.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Accounts & Assets</DocH2>
        <DocP>
          Manage liquid cash, credit lines, and illiquid investments in one place. The <Code>AccountsTab</Code> groups your balances into Bank, Cash, Credit Card, and Investments.
        </DocP>
        <DocUl>
          <DocLi><strong>Investments:</strong> Track specific holdings across Stocks, Mutual Funds, and Crypto. The system calculates unrealized returns based on your invested principal.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Debt Payoff Planner</DocH2>
        <DocP>
          If you have active loans or credit card debt, the <Code>PayoffPlanner</Code> is an invaluable simulation tool.
        </DocP>
        <DocP>
          By entering your loan principals, interest rates, and minimum payments, the planner models your journey to being debt-free. You can toggle between two primary strategies:
        </DocP>
        <DocUl>
          <DocLi><strong>Avalanche Method:</strong> Prioritizes paying off the debt with the highest interest rate first, mathematically saving you the most money over time.</DocLi>
          <DocLi><strong>Snowball Method:</strong> Prioritizes the smallest balances first, securing quick psychological wins to keep you motivated.</DocLi>
        </DocUl>
        
        <DocAlert title="Simulating Extra Payments" type="info">
          Try adjusting the "Extra / month" input in the planner to instantly see how many months of interest you will save by paying a little more each cycle.
        </DocAlert>
      </DocSection>

    </motion.div>
  )
}
