# Change Log - Card Standardization

The following changes were made to standardize the `Card` and `GlassCard` layouts, subtitles, icons, and select wrappers:

### 1. `frontend/src/pages/DashboardPage.tsx`
- Standardized subtitles for general dashboard tiles in the main overview:
  - **Finance Card**: Subtitle changed from `"Net worth, CC debt, and take-home income"` to `"Overview of net worth, debt, and take-home income"`.
  - **Health Card**: Subtitle changed from `"Weight logs, gym streaks, and active stats"` to `"Weight tracker and workout consistency"`.
  - **Agents Card**: Subtitle changed from `"Autonomous agent task runners and status"` to `"Status and runtime logs of AI agents"`.
  - **Career Card**: Subtitle changed from `"Tracked skills and development events"` to `"Skill progression and activity tracker"`.
  - **Business Card**: Subtitle changed from `"Monthly recurring revenue and milestones"` to `"Monthly recurring revenue and shipping logs"`.
  - **Content Card**: Subtitle changed from `"Post pipeline and publication pipeline"` to `"Drafting pipeline and monthly publication count"`.

### 2. `frontend/src/pages/LoginPage.tsx`
- Standardized the login card header props:
  - Subtitle updated to `"Enter your passphrase to access your command center"` (from `"Enter your passphrase to continue"`).
  - Icon changed from `<Shield size={16} />` to `<Lock size={16} />`.

### 3. `frontend/src/pages/areas/BusinessPage.tsx`
- Standardized card subtitles:
  - **Runway Calculator**: Subtitle updated to `"Burn rate and operational cash forecast"` (from `"Calculate cash runway based on burn rate"`).
  - **Event Timeline**: Subtitle updated to `"Venture milestones, decisions, and feature releases"` (from `"Recent venture milestones and decisions"`).

### 4. `frontend/src/pages/areas/CareerPage.tsx`
- Standardized card icons and subtitles:
  - **In Play (CareerStat)**: Icon changed from `<Target size={16} />` to `<Activity size={16} />`.
  - **Opportunities Pipeline**: Subtitle updated to `"Active job postings and project pipelines"` (from `"Track active job applications and stages"`).
  - **Career Timeline**: Subtitle updated to `"Milestones and professional history timeline"` (from `"Career history and milestone timeline"`).

### 5. `frontend/src/components/areas/content/TwitterQueueCard.tsx`
- Wrapped the `<Select>` component inside the `action` prop in a `div` with `style={{ width: '90px' }}` instead of passing the `style` prop directly to `Select` to resolve type checker errors on the compiled package typings.

### 6. `frontend/src/components/areas/health/NutritionTab.tsx`
- Wrapped the `<Select>` component inside the `action` prop of `"Today's Nutrition"` card in a `div` with `style={{ width: '120px' }}` to resolve type checker errors on the compiled package typings.
