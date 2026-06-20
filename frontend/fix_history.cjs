const fs = require('fs');
const content = fs.readFileSync('src/components/areas/health/HistoryTab.tsx', 'utf-8');

const railMatch = content.indexOf("const rail = (");
const returnMatch = content.indexOf("return (", railMatch);

const railBlock = content.substring(railMatch, returnMatch);

const toolbarBlock = `const toolbar = (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-1.5 pl-3 bg-card rounded-2xl border border-border/60 shadow-sm mb-4">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[13px] font-semibold text-foreground">History Tracker</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pr-1">
        <Select
          value={filterType}
          onChange={setFilterType}
          size="sm"
          options={selectOptions}
          className="min-w-[120px] bg-background/50 border-border/50 text-[12px] font-medium h-8"
        />
        <div className="w-px h-4 bg-border/60 mx-1 hidden md:block" />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExport}
          disabled={!filtered?.length}
          className="h-8 px-2.5 gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <Download size={13} />
          <span>Export CSV</span>
        </Button>
      </div>
    </div>
  )

  `;

let newContent = content.replace(railBlock, toolbarBlock);

newContent = newContent.replace(
  "<WorkspaceLayout rail={rail}>",
  "<>\n    <WorkspaceLayout rail={undefined}>\n      {toolbar}"
);

newContent = newContent.replace(
  "    </WorkspaceLayout>\n  )\n}",
  "    </WorkspaceLayout>\n    </>\n  )\n}"
);

fs.writeFileSync('src/components/areas/health/HistoryTab.tsx', newContent);
