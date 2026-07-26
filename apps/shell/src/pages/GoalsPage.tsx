import { focusRing } from '@ledgr/ui'
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
import { useState } from "react";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";

import { GoalsTab as FinanceGoalsTab } from "@ct/finance/components/GoalsTab";
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

const GoalsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  @media ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media ${({ theme }) => theme.media.xl} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.destructive};
  }
  ${focusRing}
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

const GoalCard = styled(StyledCard)`
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.color.accent}80;
  }
`

const CategoryChip = styled.span`
  display: inline-flex;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  box-shadow: 0 0 10px ${({ theme }) => theme.color.accent}40;
`;

const GoalDesc = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const GoalMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => `${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

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

export function GoalsSection({ domainFilter }: { domainFilter?: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [goalStatusFilter, setGoalStatusFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.list,
    staleTime: 60_000,
  });

  // Opens the cross-domain Add Goal dialog, pre-selecting the correct category.
  const handleOpenAddGoal = (cat = "general") => {
    setTitle("");
    setCategory(cat);
    setDescription("");
    setTargetDate("");
    setPriority("medium");
    setAddOpen(true);
  };

  const [deleteTarget, setDeleteTarget] = useState<MacroGoal | null>(null);

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      toast.success("Goal added");
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: () => toast.error("Could not add goal"),
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

  const handleCreate = () => {
    if (!title.trim()) return;
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
      {!domainFilter && (() => {
        const visibleGoals =
          goalStatusFilter === "all"
            ? goals
            : goals.filter((g) => g.status === goalStatusFilter);
        return (
          <StyledCard
            icon={<Target size={16} />}
            title="All Goals"
            subtitle={`${visibleGoals.length} goal${visibleGoals.length !== 1 ? "s" : ""}`}
            action={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Select
                  size="sm"
                  fullWidth={false}
                  value={goalStatusFilter}
                  onChange={(v) => setGoalStatusFilter(v as string)}
                  options={GOAL_STATUS_FILTER_OPTIONS}
                />
                <Button size="sm" variant="primary" onClick={() => handleOpenAddGoal()} style={{
                  background: `linear-gradient(135deg, ${theme.color.accent} 0%, color-mix(in srgb, ${theme.color.accent} 80%, black) 100%)`,
                  border: 'none',
                  boxShadow: `0 4px 12px ${theme.color.accent}40`
                }}>
                  <Plus size={14} style={{ marginRight: 6 }} /> Add goal
                </Button>
              </div>
            }
          >
            {isLoading ? null : visibleGoals.length === 0 ? (
              <EmptyState
                icon={<Flag size={24} />}
                title="No goals yet"
                description="Set a macro goal and track progress across your life areas."
                action={
                  <Button size="sm" variant="primary" onClick={() => handleOpenAddGoal()} style={{
                    background: `linear-gradient(135deg, ${theme.color.accent} 0%, color-mix(in srgb, ${theme.color.accent} 80%, black) 100%)`,
                    border: 'none',
                    boxShadow: `0 4px 12px ${theme.color.accent}40`
                  }}>
                    <Plus size={14} style={{ marginRight: 6 }} /> Add goal
                  </Button>
                }
              />
            ) : (
              <GoalsGrid>
                {visibleGoals.map((g) => (
                  <GoalCard key={g.id} size="md">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <CategoryChip>{domainLabel(g.category)}</CategoryChip>
                      <IconBtn aria-label={`Delete ${g.title}`} onClick={() => setDeleteTarget(g)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                    <h3 style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600 }}>{g.title}</h3>
                    {g.description && <GoalDesc>{g.description}</GoalDesc>}
                    <GoalMeta>
                      <span>{g.status}</span>
                      {g.target_date && <span>{g.target_date}</span>}
                    </GoalMeta>
                  </GoalCard>
                ))}
              </GoalsGrid>
            )}
          </StyledCard>
        );
      })()}

      {domainFilter === "finance" && (
        <FinanceGoalsTab onAdd={() => handleOpenAddGoal("finance")} />
      )}

      {domainFilter === "health" && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <DomainGoalsCard domain="health" onAdd={() => handleOpenAddGoal("health")} />
          </div>
          <TwoCol>
            <BodyGoalsSection />
            <FitnessGoalsSection />
            <NutritionGoalsSection />
          </TwoCol>
        </>
      )}

      {domainFilter === "career" && (
        <DomainGoalsCard domain="career" onAdd={() => handleOpenAddGoal("career")} />
      )}


        <Dialog
          open={addOpen}
          onOpenChange={setAddOpen}
          icon={<Target size={16} />}
          eyebrow="Goals"
          title="Add Macro Goal"
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
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                    { label: "Urgent", value: "urgent" },
                  ]}
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!title.trim()}
                loading={createMutation.isPending}
              >
                Add Goal
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
