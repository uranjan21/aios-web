const fs = require('fs');
const content = fs.readFileSync('src/components/areas/health/FitnessTab.tsx', 'utf-8');

let newContent = content.replace(
  "import { useState } from 'react'",
  "import { useState, useEffect } from 'react'"
);

newContent = newContent.replace(
  "import { Button, Input, Badge } from '@ledgr/ui'",
  "import { Button, Input, Badge, Dialog, SegmentedControl } from '@ledgr/ui'"
);

const railMatch = newContent.indexOf("const rail = (");
const returnMatch = newContent.indexOf("return (", railMatch);

const railBlock = newContent.substring(railMatch, returnMatch);

const toolbarBlock = `const [logModalOpen, setLogModalOpen] = useState(false)
  const [logType, setLogType] = useState<'workout' | 'habit'>('workout')

  useEffect(() => {
    const handleOpen = () => setLogModalOpen(true)
    window.addEventListener('open-new-workout', handleOpen)
    return () => window.removeEventListener('open-new-workout', handleOpen)
  }, [])

  const toolbar = (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-1.5 pl-3 bg-card rounded-2xl border border-border/60 shadow-sm mb-4">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[13px] font-semibold text-foreground">Fitness Tracker</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pr-1">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => { setLogType('workout'); setLogModalOpen(true); }}
          className="h-8 px-2.5 gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <Dumbbell size={13} />
          <span>Log Workout</span>
        </Button>
        <div className="w-px h-4 bg-border/60 mx-1 hidden md:block" />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => { setLogType('habit'); setLogModalOpen(true); }}
          className="h-8 px-2.5 gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <Plus size={13} />
          <span>New Habit</span>
        </Button>
      </div>
    </div>
  )

  `;

newContent = newContent.replace(railBlock, toolbarBlock);

newContent = newContent.replace(
  "<WorkspaceLayout rail={rail}>",
  "<>\n    <WorkspaceLayout rail={undefined}>\n      {toolbar}"
);

// We need to extract the forms out of the rail.
// `railBlock` contains `<RailHeading>Log Workout</RailHeading>` and `<GlassCard...>` 
// and `<RailHeading>New Habit</RailHeading>`.
const workoutFormRegex = /<RailHeading>Log Workout<\/RailHeading>\s*<GlassCard[^>]*>([\s\S]*?)<\/GlassCard>/;
const habitFormRegex = /<RailHeading>New Habit<\/RailHeading>\s*<GlassCard[^>]*>([\s\S]*?)<\/GlassCard>/;

const workoutForm = railBlock.match(workoutFormRegex)[1].trim();
const habitForm = railBlock.match(habitFormRegex)[1].trim();

// Append Dialog to the end
newContent = newContent.replace(
  "    </WorkspaceLayout>\n  )\n}",
  `    </WorkspaceLayout>

    <Dialog open={logModalOpen} onOpenChange={setLogModalOpen} title="Log Fitness Activity">
      <div className="flex flex-col gap-4">
        <SegmentedControl
          options={[
            { label: 'Log Workout', value: 'workout' },
            { label: 'New Habit', value: 'habit' },
          ]}
          value={logType}
          onChange={v => setLogType(v as any)}
          className="mb-2 w-full flex [&>button]:flex-1"
        />

        {logType === 'workout' && (
          <div className="space-y-4">
            ${workoutForm}
          </div>
        )}

        {logType === 'habit' && (
          <div className="space-y-4">
            ${habitForm}
          </div>
        )}
      </div>
    </Dialog>
    </>
  )
}`
);

newContent = newContent.replace(
  "Add a daily habit in the rail and build your streaks.",
  "Add a daily habit and build your streaks."
);

newContent = newContent.replace(
  "Log your first session in the rail with exercises, sets and weights.",
  "Log your first session with exercises, sets and weights."
);

fs.writeFileSync('src/components/areas/health/FitnessTab.tsx', newContent);
