import { goalsApi, type MacroGoal } from "@ct/shared/api/goals";
import { DOMAIN_OPTIONS, domainLabel } from "@ct/shared/config/domains";
import {
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  Label,
  Select,
} from "@ledgr/ui";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Plus, Target, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import styled from "styled-components";

import { GoalsTab as FinanceGoalsTab } from "@ct/finance/components/GoalsTab";
import { BudgetTabModal } from "@ct/finance/components/QuickAddBudget";
import { ModuleGrid, type ModuleSpec } from "@ct/shared/components/modules";
import { DomainGoalsCard } from "@ct/shared/components/workspace/DomainGoalsCard";
import {
  BodyGoalsSection,
  FitnessGoalsSection,
  NutritionGoalsSection,
} from "@ct/health/pages/HealthSettingsPage";



const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  @media ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
`

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`;

const CATEGORY_OPTIONS = DOMAIN_OPTIONS;

const GOAL_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

/** Editable statuses — the filter's "All" is not one a goal can be set to. */
const GOAL_STATUS_OPTIONS = GOAL_STATUS_FILTER_OPTIONS.slice(1);

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export function GoalsSection({
  domainFilter,
  filterNode,
}: {
  domainFilter?: string
  /**
   * PlanPage's shared domain filter. This section renders a different surface
   * per domain, so the filter is threaded into whichever card is showing rather
   * than living in one place — otherwise selecting a domain would unmount the
   * only control that can deselect it.
   */
  filterNode?: ReactNode
}) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [goalStatusFilter, setGoalStatusFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("active");
  /** Non-null puts the shared dialog into edit mode. */
  const [editing, setEditing] = useState<MacroGoal | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.list,
    staleTime: 60_000,
  });

  // Opens the cross-domain Add Goal dialog, pre-selecting the correct category.
  const handleOpenAddGoal = (cat = "general") => {
    setEditing(null);
    setTitle("");
    setCategory(cat);
    setDescription("");
    setTargetDate("");
    setPriority("medium");
    setStatus("active");
    setAddOpen(true);
  };

  /** Same dialog, prefilled — a table row has no action column, so the row
      click opens the editor and Delete lives in its footer. */
  const handleOpenEditGoal = (g: MacroGoal) => {
    setEditing(g);
    setTitle(g.title);
    setCategory(g.category);
    setDescription(g.description ?? "");
    setTargetDate(g.target_date ? g.target_date.slice(0, 10) : "");
    setPriority(g.priority || "medium");
    setStatus(g.status || "active");
    setAddOpen(true);
  };

  const closeDialog = () => {
    setAddOpen(false);
    setEditing(null);
  };

  const [deleteTarget, setDeleteTarget] = useState<MacroGoal | null>(null);
  /** Finance savings-pot add modal — see the finance branch below. */
  const [potModalOpen, setPotModalOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      toast.success("Goal added");
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: () => toast.error("Could not add goal"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof goalsApi.update>[1]) =>
      goalsApi.update(editing!.id, data),
    onSuccess: () => {
      toast.success("Goal updated");
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: () => toast.error("Could not update goal"),
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => goalsApi.remove(goalId),
    onSuccess: () => {
      toast.success("Goal deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: () => toast.error("Could not delete goal"),
  });

  const handleSave = () => {
    if (!title.trim()) return;
    if (editing) {
      // Explicit `null` clears a field — `undefined` would leave it as it was.
      updateMutation.mutate({
        title: title.trim(),
        category,
        description: description.trim() || null,
        target_date: targetDate || null,
        priority,
        status,
      });
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      target_date: targetDate || undefined,
      priority,
    });
  };

  return (
    <>
      {/* Domain-specific goal surfaces live alongside the shared list. */}
      {/*
        Phase 4: the canvas's `workspace:goals` is a filter, a New button and a
        goal/domain/target/progress/status table. The card grid is replaced by
        that table module; a row click opens the delete confirmation, which is
        where the old card's trash icon went.
      */}
      {!domainFilter && (() => {
        const visibleGoals =
          goalStatusFilter === "all"
            ? goals
            : goals.filter((g) => g.status === goalStatusFilter);

        if (!isLoading && visibleGoals.length === 0) {
          return (
            <StyledCard
              icon={<Target size={16} />}
              title="All goals"
              subtitle="Nothing here yet"
              action={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {filterNode}
                  <Select
                    size="sm"
                    fullWidth={false}
                    aria-label="Filter goals by status"
                    value={goalStatusFilter}
                    onChange={(v) => setGoalStatusFilter(v as string)}
                    options={GOAL_STATUS_FILTER_OPTIONS}
                  />
                </div>
              }
            >
              <EmptyState
                icon={<Flag size={24} />}
                title="No goals yet"
                description="Set a macro goal and track progress across your life areas."
                action={
                  <Button size="sm" variant="primary" onClick={() => handleOpenAddGoal()}>
                    <Plus size={14} style={{ marginRight: 6 }} /> Add goal
                  </Button>
                }
              />
            </StyledCard>
          );
        }

        const modules: ModuleSpec[] = [{
          kind: "table",
          span: 12,
          // Both belong to this table — see ProjectsPage.
          actionNode: (
            <>
              {filterNode}
              <Select
                size="sm"
                fullWidth={false}
                aria-label="Filter goals by status"
                value={goalStatusFilter}
                onChange={(v) => setGoalStatusFilter(v as string)}
                options={GOAL_STATUS_FILTER_OPTIONS}
              />
            </>
          ),
          title: "All goals",
          subtitle: `${visibleGoals.length} goal${visibleGoals.length !== 1 ? "s" : ""} · click a row to edit`,
          icon: Target,
          action: "+ Add goal",
          onAction: () => handleOpenAddGoal(),
          gridCols: "1.9fr 1fr 1.1fr 1fr 1fr",
          cols: [
            { l: "Goal" },
            { l: "Area" },
            { l: "Target" },
            { l: "Priority" },
            { l: "Status", a: "right" },
          ],
          rows: visibleGoals.map((g) => [
            { t: g.title, bold: true },
            domainLabel(g.category),
            g.target_date
              ? new Date(g.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "No target date",
            { t: g.priority || "medium", tag: true, colorKey: g.priority === "high" ? "destructive" : g.priority === "low" ? "mutedFg" : "info" },
            {
              t: g.status,
              tag: true,
              colorKey: g.status === "completed" ? "success" : g.status === "archived" ? "mutedFg" : "accent",
            },
          ]),
          onRowClick: (i: number) => handleOpenEditGoal(visibleGoals[i]),
        }];

        return <ModuleGrid modules={modules} />;
      })()}

      {/*
        Finance's savings pots are a different entity from a macro goal (a
        target/current ₹ balance, not a scored objective), so "Add" here opens
        the pot modal — it used to open the macro-goal dialog, which meant a
        savings pot could not be created from the only page that still shows
        them once Finance lost its Goals destination (2026-08-02).
      */}
      {domainFilter === "finance" && (
        <>
          <FinanceGoalsTab onAdd={() => setPotModalOpen(true)} filterNode={filterNode} />
          <BudgetTabModal
            open={potModalOpen}
            onClose={() => setPotModalOpen(false)}
            defaultTab="Goal"
          />
        </>
      )}

      {domainFilter === "health" && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <DomainGoalsCard domain="health" onAdd={() => handleOpenAddGoal("health")} filterNode={filterNode} />
          </div>
          <TwoCol>
            <BodyGoalsSection />
            <FitnessGoalsSection />
            <NutritionGoalsSection />
          </TwoCol>
        </>
      )}

      {domainFilter === "career" && (
        <DomainGoalsCard domain="career" onAdd={() => handleOpenAddGoal("career")} filterNode={filterNode} />
      )}


        <Dialog
          open={addOpen}
          onOpenChange={(o) => { if (!o) closeDialog() }}
          icon={<Target size={16} />}
          eyebrow="Goals"
          title={editing ? "Edit macro goal" : "Add Macro Goal"}
          description="Set a high-level goal and track progress across life areas."
          size="md"
        >
          <FormGrid>
            <div>
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reach ₹10L net worth"
                autoFocus
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(v) => setCategory(v as string)}
                placeholder="Category"
              />
            </div>
            <div>
              <Label htmlFor="goal-desc">Description (optional)</Label>
              <Input
                id="goal-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does done look like?"
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <Label>Priority</Label>
                <Select
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={(v) => setPriority(v as string)}
                />
              </div>
              <div>
                <Label htmlFor="goal-date">Target date (optional)</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
            {/* A goal is born active — status is only meaningful once it exists. */}
            {editing && (
              <div>
                <Label>Status</Label>
                <Select
                  options={GOAL_STATUS_OPTIONS}
                  value={status}
                  onChange={(v) => setStatus(v as string)}
                />
              </div>
            )}
            <DialogFooter>
              {editing && (
                <Button
                  variant="destructive"
                  size="sm"
                  style={{ marginRight: "auto" }}
                  onClick={() => {
                    setDeleteTarget(editing);
                    closeDialog();
                  }}
                >
                  <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                </Button>
              )}
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!title.trim()}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Save changes" : "Add Goal"}
              </Button>
            </DialogFooter>
          </FormGrid>
        </Dialog>

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
          title="Delete this goal?"
          description={
            deleteTarget
              ? `"${deleteTarget.title}" and its progress history will be permanently removed.`
              : ""
          }
          confirmLabel="Delete"
          destructive
          loading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          }}
        />
    </>
  );
}
