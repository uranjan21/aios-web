import os

files = [
    "src/components/areas/health/BodySleepTab.tsx",
    "src/components/areas/health/FitnessTab.tsx",
    "src/components/areas/health/HistoryTab.tsx",
    "src/components/areas/health/NutritionTab.tsx",
    "src/components/areas/finance/TransactionsTab.tsx",
]

for f in files:
    if os.path.exists(f):
        with open(f, "r") as file:
            content = file.read()
        
        # Replace the border class from the toolbars
        content = content.replace("bg-card rounded-2xl border border-border/60 shadow-sm", "bg-card rounded-2xl shadow-sm")
        content = content.replace("bg-card rounded-2xl border border-border/40 shadow-sm", "bg-card rounded-2xl shadow-sm")
        
        with open(f, "w") as file:
            file.write(content)
