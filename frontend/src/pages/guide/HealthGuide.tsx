import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code, Kbd } from '@/components/ui/DocStyles'

export function HealthGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "56rem", paddingBottom: 96 }}
    >
      <DocSection>
        <DocH1 icon={Heart}>Health & Fitness Guide</DocH1>
        <DocP>
          The Health dashboard is a highly detailed, data-driven tracking suite for your physical well-being. By consolidating workout logs, nutritional macros, sleep cycles, and body composition into one interface, it provides a holistic view of your health.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Dashboard & Quick Logging</DocH2>
        <DocP>
          The primary <Code>HealthPage</Code> focuses on reducing friction. The unified "Quick Log" rail allows you to input Gym Sessions, daily Weight, and Water Intake without navigating away from your primary metrics.
        </DocP>
        
        <DocH3>Interactive Data Visualization</DocH3>
        <DocP>
          Your dashboard features a 30-day Weight Progression chart powered by Highcharts. This interactive area chart maps your weight fluctuations over the last month, helping you identify long-term trends rather than stressing over daily variance.
        </DocP>

        <DocAlert title="Water Tracker Widget" type="info">
          At the top of the dashboard, you'll find a row of glass icons based on your daily hydration target. Simply click an empty glass to instantly log your water intake.
        </DocAlert>
      </DocSection>

      <DocSection>
        <DocH2>Nutrition & Macros</DocH2>
        <DocP>
          The <Code>NutritionTab</Code> eliminates the guesswork from meal tracking. Instead of manually looking up nutritional labels, the system leverages a built-in AutoComplete food database.
        </DocP>
        <DocUl>
          <DocLi><strong>Database Search:</strong> Begin typing a food item (e.g., "Chicken Breast"). Select it, enter your portion size in grams, and the system automatically calculates the total Calories, Protein, Carbs, and Fat based on per-100g database values.</DocLi>
          <DocLi><strong>Quick Add:</strong> For repeated meals, use the 1-click buttons to instantly log common staples like Rice, Whey Protein, or Coffee.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Fitness & Workouts</DocH2>
        <DocP>
          Built for serious lifters and athletes, the <Code>FitnessTab</Code> supports dynamic logging of workout sets, reps, and weights.
        </DocP>
        <DocUl>
          <DocLi><strong>Dynamic Sets:</strong> Add multiple sets to a single exercise block dynamically. The form autocompletes exercise names to ensure data consistency.</DocLi>
          <DocLi><strong>Personal Records (PRs):</strong> The system tracks your historical max lifts. When you log a set that exceeds your previous best, a celebratory PR toast notification is triggered, and your PR Widget on the dashboard updates automatically.</DocLi>
          <DocLi><strong>Habit Tracker:</strong> A visual 7-day grid lets you check off daily wellness habits (e.g., Stretching, Supplements). It calculates your current and all-time best streaks.</DocLi>
        </DocUl>
      </DocSection>

      <DocSection>
        <DocH2>Body Composition & Sleep</DocH2>
        <DocP>
          The <Code>BodySleepTab</Code> monitors the two most critical recovery metrics: sleep quality and body fat percentage.
        </DocP>
        <DocUl>
          <DocLi><strong>Dual-Axis Trends:</strong> View your Body Weight and Body Fat % plotted together on a Recharts dual-axis chart to ensure you are losing fat, not just overall mass.</DocLi>
          <DocLi><strong>Sleep Averages:</strong> Log your nightly hours and perceived sleep quality. The system calculates a 7-day rolling average against your baseline target.</DocLi>
        </DocUl>
        
        <DocAlert title="AI Health Insights" type="tip">
          The <Code>AiInsightCard</Code> actively analyzes your recent logs. If it notices you've been under-sleeping relative to your high gym volume, or if your protein intake has dropped, it will surface actionable warnings.
        </DocAlert>
      </DocSection>

    </motion.div>
  )
}
