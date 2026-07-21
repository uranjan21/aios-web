import { goalsApi, type MacroGoal } from "@aios/shared/api/goals";
import { DOMAIN_OPTIONS } from "@aios/shared/config/domains";
import { PageContainer, PageContent } from "@aios/shared/components/layout/PageLayout";
import {
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
} from "@ledgr/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Plus, Settings, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";

import { GoalsTab as FinanceGoalsTab } from "@aios/finance/components/GoalsTab";
import { AreaTabs } from "@aios/shared/components/ui/AreaTabs";
import { DomainGoalsCard } from "@aios/shared/components/workspace/DomainGoalsCard";
import {
  BodyGoalsSection,
  FitnessGoalsSection,
  NutritionGoalsSection,
} from "@aios/health/pages/HealthSettingsPage";
import {
  Briefcase,
  Heart,
  IndianRupee,
  LayoutDashboard,
  } from "lucide-react";



const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const GoalsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
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
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`;

const CategoryChip = styled.span`
  display: inline-flex;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radii.sm};
`;

const GoalDesc = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const GoalMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CATEGORY_OPTIONS = DOMAIN_OPTIONS;

const StyledTabLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const GOAL_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function GoalsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [goalStatusFilter, setGoalStatusFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [activeTab, setActiveTab] = useState("overview");

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
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<Target />}
          eyebrow="Goals"
          title="Goals"
          subtitle="Macro goals, AI actions, and forecasts in one place"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/app/settings")}
            >
              <Settings size={14} style={{ marginRight: 6 }} /> Settings
            </Button>
          }
        />

        <AreaTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "overview",
              label: (
                <StyledTabLabel>
                  <LayoutDashboard size={14} /> Overview
                </StyledTabLabel>
              ),
              children: (
                <>
                  {(() => {
                    const visibleGoals =
                      goalStatusFilter === "all"
                        ? goals
                        : goals.filter((g) => g.status === goalStatusFilter);
                    return (
                      <Card
                        icon={<Target size={16} />}
                        title="All Goals"
                        subtitle={`${visibleGoals.length} goal${visibleGoals.length !== 1 ? "s" : ""}`}
                        action={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Select
                              size="sm"
                              fullWidth={false}
                              value={goalStatusFilter}
                              onChange={(v) => setGoalStatusFilter(v as string)}
                              options={GOAL_STATUS_FILTER_OPTIONS}
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenAddGoal()}
                            >
                              <Plus size={12} style={{ marginRight: 4 }} /> Add
                              Goal
                            </Button>
                          </div>
                        }
                      >
                        {!isLoading && goals.length === 0 ? (
                          <EmptyState
                            icon={<Target size={24} />}
                            title="No goals yet"
                            description="Set a macro goal — the weekly review will track it with you."
                            action={
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenAddGoal()}
                              >
                                <Plus size={12} style={{ marginRight: 4 }} />{" "}
                                Add your first goal
                              </Button>
                            }
                          />
                        ) : (
                          <GoalsGrid>
                            {visibleGoals.map((goal) => (
                              <Card
                                key={goal.id}
                                title={goal.title}
                                icon={<Flag size={16} />}
                                action={
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    <CategoryChip>{goal.category}</CategoryChip>
                                    <IconBtn
                                      onClick={() => setDeleteTarget(goal)}
                                      aria-label={`Delete goal ${goal.title}`}
                                    >
                                      <Trash2 size={14} />
                                    </IconBtn>
                                  </div>
                                }
                              >
                                <GoalDesc>
                                  {goal.description ||
                                    "No description provided."}
                                </GoalDesc>
                                <GoalMeta>
                                  <span>Status: {goal.status}</span>
                                  {goal.target_date && (
                                    <span>Target: {goal.target_date}</span>
                                  )}
                                </GoalMeta>
                              </Card>
                            ))}
                          </GoalsGrid>
                        )}
                      </Card>
                    );
                  })()}
                </>
              ),
            },
            {
              key: "finance",
              label: (
                <StyledTabLabel>
                  <IndianRupee size={14} /> Finance
                </StyledTabLabel>
              ),
              children: (
                <FinanceGoalsTab onAdd={() => handleOpenAddGoal("finance")} />
              ),
            },
            {
              key: "health",
              label: (
                <StyledTabLabel>
                  <Heart size={14} /> Health
                </StyledTabLabel>
              ),
              children: (
                <>
                  <div style={{ marginBottom: "24px" }}>
                    <DomainGoalsCard
                      domain="health"
                      onAdd={() => handleOpenAddGoal("health")}
                    />
                  </div>
                  <TwoCol>
                    <BodyGoalsSection />
                    <FitnessGoalsSection />
                    <NutritionGoalsSection />
                  </TwoCol>
                </>
              ),
            },
            {
              key: "career",
              label: (
                <StyledTabLabel>
                  <Briefcase size={14} /> Career
                </StyledTabLabel>
              ),
              children: (
                <DomainGoalsCard
                  domain="career"
                  onAdd={() => handleOpenAddGoal("career")}
                />
              ),
            },
          ]}
        />

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
      </PageContent>
    </PageContainer>
  );
}
