const fs = require('fs');
const content = fs.readFileSync('src/components/areas/health/NutritionTab.tsx', 'utf-8');

let newContent = content.replace(
  "import { useState } from 'react'",
  "import { useState, useEffect } from 'react'"
);

newContent = newContent.replace(
  "import { Button, Input, Select } from '@ledgr/ui'",
  "import { Button, Input, Select, Dialog } from '@ledgr/ui'"
);

// We need to find "const rail = (" and replace it up to "return ("
const railMatch = newContent.indexOf("const rail = (");
const returnMatch = newContent.indexOf("return (", railMatch);

const railBlock = newContent.substring(railMatch, returnMatch);

// We want to insert the toolbar and state right where `const rail = ...` was.
const toolbarBlock = `const [logModalOpen, setLogModalOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => setLogModalOpen(true)
    window.addEventListener('open-new-nutrition', handleOpen)
    return () => window.removeEventListener('open-new-nutrition', handleOpen)
  }, [])

  const toolbar = (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-1.5 pl-3 bg-card rounded-2xl border border-border/60 shadow-sm mb-4">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[13px] font-semibold text-foreground">Nutrition Tracker</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pr-1">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLogModalOpen(true)}
          className="h-8 px-2.5 gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <Utensils size={13} />
          <span>Log Meal</span>
        </Button>
      </div>
    </div>
  )

  `;

newContent = newContent.replace(railBlock, toolbarBlock);

// Now we need to replace `<WorkspaceLayout rail={rail}>` with `<><WorkspaceLayout rail={undefined}>\n{toolbar}`
newContent = newContent.replace(
  "<WorkspaceLayout rail={rail}>",
  "<>\n    <WorkspaceLayout rail={undefined}>\n      {toolbar}"
);

// Extract the form logic from the original rail block to put inside the Dialog
const dialogBody = railBlock
  .replace("const rail = (", "")
  .replace("<>", "")
  .replace("<RailHeading>Log Meal</RailHeading>", "")
  .replace("<GlassCard hoverable fadeIn=\"up\">", "")
  .replace("</GlassCard>", "")
  .replace("</>", "")
  .trim();

// Append Dialog to the end
newContent = newContent.replace(
  "    </WorkspaceLayout>\n  )\n}",
  `    </WorkspaceLayout>\n\n    <Dialog open={logModalOpen} onOpenChange={setLogModalOpen} title="Log Meal">\n      <div className="space-y-4">\n        ${dialogBody}\n      </div>\n    </Dialog>\n    </>\n  )\n}`
);

fs.writeFileSync('src/components/areas/health/NutritionTab.tsx', newContent);
