import { focusRing } from '@ledgr/ui'
import { ReactNode, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { PageHeader, Button } from "@ledgr/ui";
import { ArrowLeft, Plus } from "lucide-react";

import { PageContainer, PageContent } from "./PageLayout";
import { PageDivider } from "./PageDivider";
import { SETTINGS_RAIL_WIDTH, TOPBAR_HEIGHT } from "@aios/shared/theme/layout";

export interface SettingsItem {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  addLabel?: string;
  onAdd?: () => void;
}

export interface SettingsGroup {
  label: string;
  items: SettingsItem[];
}

interface AreaSettingsPageProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  backTo: string;
  groups: SettingsGroup[];
  eyebrow?: string;
}

export const Shell = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 24px;
  width: 100%;

  @media (max-width: 1023px) {
    flex-direction: column;
  }
`;

export const NavRail = styled.nav`
  width: ${SETTINGS_RAIL_WIDTH};
  flex-shrink: 0;

  display: flex;
  flex-direction: column;
  gap: 18px;

  padding: 14px 12px;

  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};

  @media (min-width: 1024px) {
    position: sticky;
    top: 24px;
    max-height: calc(100dvh - ${TOPBAR_HEIGHT});
    overflow-y: auto;
  }

  @media (max-width: 1023px) {
    width: 100%;
  }
`;

export const GroupBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const GroupLabel = styled.h3`
  margin: 0;
  padding: 0 10px 6px;

  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  color: ${({ theme }) => theme.color.mutedForeground};
`;

export const GroupItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  margin-left: 12px;
  padding-left: 9px;

  border-left: 1px solid ${({ theme }) => theme.color.border};
`;

export const NavItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;

  width: 100%;
  padding: 8px 10px;

  border: none;
  border-radius: ${({ theme }) => theme.radii.md};

  background: ${({ $active, theme }) =>
    $active ? `${theme.color.accent}14` : "transparent"};

  color: ${({ $active, theme }) =>
    $active ? theme.color.accent : theme.color.foreground};

  text-align: left;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};

  cursor: pointer;

  transition:
    background 150ms ease,
    color 150ms ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? `${theme.color.accent}20` : theme.color.muted};
  }

  ${focusRing}

  svg {
    flex-shrink: 0;
    color: ${({ $active, theme }) =>
      $active ? theme.color.accent : theme.color.mutedForeground};
  }
`;

export const ContentPane = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export function AreaSettingsPage({
  icon,
  title,
  subtitle,
  backTo,
  groups,
  eyebrow = "Settings",
}: AreaSettingsPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const allItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  const allKeys = useMemo(() => allItems.map((item) => item.key), [allItems]);

  const initialKey = searchParams.get("section");

  const [activeKey, setActiveKey] = useState(() =>
    initialKey && allKeys.includes(initialKey)
      ? initialKey
      : (allItems[0]?.key ?? ""),
  );

  const activeItem = useMemo(
    () => allItems.find((item) => item.key === activeKey),
    [allItems, activeKey],
  );

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={icon}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} />
              Back
            </Button>
          }
        />

        <PageDivider />

        <Shell>
          <NavRail aria-label="Settings sections">
            {groups.map((group) => (
              <GroupBlock key={group.label}>
                <GroupLabel>{group.label}</GroupLabel>

                <GroupItems>
                  {group.items.map((item) => (
                    <NavItem
                      key={item.key}
                      type="button"
                      $active={item.key === activeKey}
                      onClick={() => setActiveKey(item.key)}
                      aria-current={item.key === activeKey ? "page" : undefined}
                    >
                      {item.icon}
                      {item.label}
                    </NavItem>
                  ))}
                </GroupItems>
              </GroupBlock>
            ))}
          </NavRail>

          <ContentPane>
            {activeItem?.onAdd && (
              <ContentHeader>
                <Button variant="primary" size="sm" onClick={activeItem.onAdd}>
                  <Plus size={12} style={{ marginRight: 4 }} />
                  {activeItem.addLabel ?? `Add ${activeItem.label}`}
                </Button>
              </ContentHeader>
            )}

            {activeItem?.content}
          </ContentPane>
        </Shell>
      </PageContent>
    </PageContainer>
  );
}
