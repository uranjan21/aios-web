# Card and GlassCard Audit Report

This report presents the findings of a layout and UI compliance audit of `Card` and `GlassCard` usages, and custom card containers (div wrappers) in the Health, Career, Business, and Content area pages and tabs, as defined in `AGENTS.md`.

---

## Business Area Audit

### 1. `frontend/src/pages/areas/BusinessPage.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **Runway Calculator** | `@ledgr/ui` `GlassCard` | `TrendingUp` (16px) | ❌ None | ❌ None | **Recommendations**: <br>1. Add a 1-line subtitle: `subtitle="Burn rate and operational cash forecast"`. <br>2. Add a period/budget scope filter in the `action` prop. |
| **Ledgr Project Card** | `@ledgr/ui` `GlassCard` | ❌ Custom `IconBadge` inside body | ❌ None (Custom desc inside body) | ❌ Custom `Badge` inside body | **Recommendations**: <br>1. Standardize by using `GlassCard` props instead of custom layout inside body. <br>2. Set `title="Ledgr"`, `subtitle="SaaS accounting for Indian freelancers"`, `icon={<Rocket size={16} />}` (or pass the IconBadge in `icon`), and `action={<Badge tone="info">Building</Badge>}`. |
| **Event Timeline** | `@ledgr/ui` `GlassCard` | `History` (16px) | ❌ None | `Log Event` button in `action` prop | **Recommendations**: <br>1. Add a subtitle: `subtitle="Venture milestones, decisions, and feature releases"`. <br>2. Suggest adding a filter (e.g. by event type or period) adjacent to the button in the `action` prop. |

### 2. `frontend/src/components/areas/business/SummaryTab.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **MRR Trend** | `@ledgr/ui` `Card` | `LineChart` (14px) | `Monthly recurring revenue...` | ❌ None | **Recommendations**: <br>1. Add a period filter dropdown (e.g. 3m/6m/1y) in the `action` prop. <br>2. Chart legend is disabled in Highcharts configuration, which is correct. |
| **MetricTile** (MRR, Product, Last Feature, Last Shipped) | `@ledgr/ui` `Card` | Custom `IconWrap` (12px) | `sub` prop | ❌ None | **Observations**: <br>The `sub` value is passed to the card `subtitle` prop but also duplicated inside the card body as `<TileSub>{sub}</TileSub>`. <br>**Recommendation**: Remove the duplicate `<TileSub>` rendering from the card body since it's already handled by the Card's `subtitle` prop. |

### 3. `frontend/src/components/areas/business/EventsTab.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **Event Log** | `@ledgr/ui` `Card` | `ListChecks` (16px) | `Recent milestones, feature ships...` | `Log Event` button in `action` prop | **Status**: Fully compliant. <br>**Recommendation**: Suggest adding a filter dropdown by event type (e.g. Features, Decisions, Blockers) adjacent to the button in the `action` prop. |

---

## Career Area Audit

### 1. `frontend/src/pages/areas/CareerPage.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **CareerStat** (KPI tiles: Skills, Pipeline, In Play, Milestones) | `@ledgr/ui` `Card` (AppCard) | ❌ None | `sub` text | ❌ None | **Recommendations**: <br>1. Add an icon to each KPI tile: <br>- Skills Tracked: `<BookOpen size={14} />` <br>- Active Pipeline: `<Briefcase size={14} />` <br>- In Play: `<Activity size={14} />` <br>- Milestones: `<History size={14} />`. <br>2. Standardize layout to use Card's `title`, `subtitle`, and `icon` props. |
| **Opportunities Pipeline** | `@ledgr/ui` `GlassCard` | `Briefcase` (16px) | ❌ None | ❌ None | **Recommendations**: <br>1. Add a subtitle: `subtitle="Active job postings and project pipelines"`. <br>2. Place a relevant filter (e.g. by status/stage) in the `action` prop. |
| **Career Timeline** | `@ledgr/ui` `GlassCard` | `History` (16px) | ❌ None | `Log Milestone` button in `action` prop | **Recommendations**: <br>1. Add a subtitle: `subtitle="Milestones and professional history timeline"`. <br>2. Suggest adding a filter adjacent to the button in the `action` prop. |
| **Skills Radar** | `@ledgr/ui` `GlassCard` | `BookOpen` (16px) | ❌ None | ❌ None | **Recommendations**: <br>1. Add a subtitle: `subtitle="Visual mapping of core competencies"`. <br>2. Add a category/level filter in the `action` prop. <br>3. **Bug**: Contains `CareerRadar` which wraps the chart inside a nested `FullWidthCard` (GlassCard). Remove the inner GlassCard wrapper to prevent layout issues from nested cards. |

### 2. `frontend/src/components/areas/career/OpportunitiesTab.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **OppListSection** (Active / Closed) | `@ledgr/ui` `Card` | `Briefcase` or `XCircle` (16px) | Custom text based on status | ❌ None | **Recommendations**: <br>1. Add a period/date-range or status filter dropdown in the `action` prop. <br>2. The tab-wide `SegmentedControl` (view toggle) and "Add" button are placed inside `HeaderActionPortal`, which is correct. |

### 3. `frontend/src/components/areas/career/RoadmapTab.tsx` & `SkillGapCard.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **Career Timeline** | `@ledgr/ui` `Card` | `History` (16px) | `Milestones, learning...` | `SegmentedControl` in `action` prop | **Status**: Fully compliant. |
| **AI Skill-Gap Analysis** | `@ledgr/ui` `Card` | `Target` (14px) | `Compare your skills...` | ❌ None | **Recommendation**: Place an option/action button in the `action` prop (e.g. Reset analysis, history). |

---

## Health Area Audit

### 1. `frontend/src/pages/areas/HealthPage.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **KpiCard** (Weight, Streak, Last Workout, Sessions) | `@ledgr/ui` `KpiCard` | Passed in props | `sub` prop | ❌ None | **Status**: Fully compliant. |
| **Weight Progression** | `@ledgr/ui` `Card` (SectionCard) | `LineChartIcon` (16px) | `Body weight logs...` | `SegmentedControl` in `action` prop | **Recommendations**: <br>1. Chart uses Highcharts which renders a default legend on the canvas. Disable it inside `options` (`legend: { enabled: false }`) and render it in HTML inside the `action` prop adjacent to the SegmentedControl. |

### 2. `frontend/src/components/areas/health/BodySleepTab.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **KpiCard** (Weight, Body Fat, BMI, Last Night, Avg) | `@ledgr/ui` `KpiCard` | Passed in props | ❌ None | ❌ None | **Recommendation**: Add a 1-line faded subtitle using the `sub` prop for each tile (e.g. `sub="Latest body weight log"`). |
| **Weight & Body Fat Trend** | `@ledgr/ui` `Card` (SectionCard) | `LineChartIcon` (16px) | `Recent body composition...` | HTML Legend in `action` prop | **Status**: Fully compliant. <br>**Recommendation**: Suggest adding a period filter adjacent to the legend in the `action` prop. |
| **Sleep Duration Trend** | `@ledgr/ui` `Card` (SectionCard) | `BarChart3` (16px) | `Hours slept per day...` | HTML Legend in `action` prop | **Status**: Fully compliant. <br>**Recommendation**: Suggest adding a period filter adjacent to the legend in the `action` prop. |
| **Sleep — Last 7 Days** | `@ledgr/ui` `Card` (SectionCard) | `BedDouble` (16px) | `Each night's hours...` | ❌ None | **Recommendation**: Add a quality filter dropdown (e.g. Poor, Fair, Good, Excellent) in the `action` prop. |

### 3. `frontend/src/components/areas/health/FitnessTab.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **GoalCard** (Weight, Weekly, Daily Water) | `@ledgr/ui` `GlassCard` | ❌ Custom inside body | ❌ None | ❌ None | **Recommendations**: <br>1. Convert the custom header inside the body to standard `GlassCard` props. <br>2. Pass `title={goal.label}`, `subtitle="Tracked target progress"`, `icon={<Icon size={14} />}` and `action={done ? <CheckCircle2 /> : null}`. |
| **Personal Records** | `@ledgr/ui` `GlassCard` | `Trophy` (16px) | `Top lifts logged...` | ❌ None | **Recommendation**: Add a filter by exercise category or date range in the `action` prop. |
| **Habits Stats** (Habits, Done Today, Best Streak) | `@ledgr/ui` `GlassCard` | ❌ None | ❌ None | ❌ None | **Recommendation**: Convert these 3 custom GlassCards to `@ledgr/ui` `KpiCard` components with proper icons and subtitles for layout consistency. |
| **Daily Habits** | `@ledgr/ui` `GlassCard` | `Repeat` (16px) | `Toggle each day...` | `SegmentedControl` in `action` prop | **Status**: Fully compliant. |
| **SessionCard** (Workout items) | `@ledgr/ui` `GlassCard` | ❌ None | ❌ Custom inside body | `Popconfirm` in body | **Recommendations**: <br>1. Wrap the entire "Recent Workouts" list section in a parent SectionCard or GlassCard container. <br>2. Convert the individual `SessionCard` custom headers to standard `GlassCard` props: `title={session.name}`, `subtitle={formatDate(session.logged_at)}`, `icon={<Dumbbell size={14} />}` and `action={<Popconfirm ... />}`. |

### 4. `frontend/src/components/areas/health/HistoryTab.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **Health Logs Table** | ❌ None (Renders raw `Table` directly) | ❌ None | ❌ None | Filter dropdown in `AreaToolbar`, Export in `HeaderActionPortal` | **Recommendation**: Wrap the `Table` in a standard `Card` or `GlassCard` container. Place the filter dropdown and Export CSV button in the Card's `action` prop to unify page layout. |

### 5. `frontend/src/components/areas/health/NutritionTab.tsx` & `WaterTrackerWidget.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **Today's Nutrition** | `@ledgr/ui` `Card` | `Flame` (16px) | `Calories burned...` | ❌ None | **Recommendation**: Add a period/date range filter dropdown in the `action` prop. |
| **Today's Meals** | `@ledgr/ui` `Card` | `ListChecks` (16px) | `Each meal you've logged...` | `SegmentedControl` in `action` prop | **Status**: Fully compliant. |
| **Water Intake** (WaterTrackerWidget) | `@ledgr/ui` `Card` | `Droplet` (16px) | `Tap a glass...` | Progress text in `action` prop | **Status**: Fully compliant. <br>**Recommendation**: Suggest adding a reset/target-adjustment action in the `action` prop. |

---

## Content Area Audit

### 1. `frontend/src/pages/areas/ContentPage.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **ItemCard** (Kanban board tasks) | `@ledgr/ui` `Card` (AppCard) | ❌ None | ❌ None | Hover actions (Edit, Schedule, Delete) | **Status**: Acceptable as these are draggable item cards representing individual tasks rather than standard layout widgets. |
| **Content Summary** (EngagementWidget) | `@ledgr/ui` `Card` (AppCard) | `TrendingUp` (16px) | `Snapshot of what you've shipped...` | ❌ None | **Recommendation**: Add a period filter dropdown (e.g. 7d/30d/90d) in the `action` prop. |
| **Published Content** (PublishedDropZone) | ❌ Custom `PublishedZoneRoot` div wrapper | ❌ None (Custom dot in body) | ❌ None | `PublishedCount` badge in custom header | **Recommendation**: Standardize by converting this custom container to a `GlassCard` or `Card` and passing `title="Published Content"`, `subtitle="All live pieces shipped across platforms"`, `icon={<CheckCircle size={16} />}` (or similar), and `action={<PublishedCount>...` to ensure header consistency. |

### 2. `frontend/src/components/areas/content/TwitterQueueCard.tsx`

| Card/Widget | Container Component | Icon | Subtitle | Filters/Actions | Analysis & Recommendation |
|---|---|---|---|---|---|
| **Twitter Queue** | `@ledgr/ui` `Card` | `Twitter` (14px) | `Drafts staged...` | Count in `action` prop | **Status**: Fully compliant. <br>**Recommendation**: Suggest adding a tag/category filter dropdown in the `action` prop. |
