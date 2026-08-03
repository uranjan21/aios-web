import { focusRing } from '@ledgr/ui'
import { ReactNode, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { HeaderActionPortal, Button } from "@ledgr/ui";
import { ArrowLeft, Plus } from "lucide-react";

import { PageContainer, PageContent } from "./PageLayout";
import { SETTINGS_RAIL_WIDTH, TOPBAR_HEIGHT } from "@ct/shared/theme/layout";

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
  /**
   * Controlled mode (added 2026-08-01): when both are supplied the section is
   * owned by the caller — the global Settings page drives it from the route,
   * so its rail and the sidebar's Settings sub-nav cannot disagree. Area
   * settings pages omit both and keep the local `?section=` behaviour.
   */
  activeKey?: string;
  onSelect?: (key: string) => void;
}

export const Shell = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[6]}`};
  width: 100%;

  @media ${({ theme }) => theme.media.belowLg} {
    flex-direction: column;
  }
`;

export const NavRail = styled.nav`
  width: ${SETTINGS_RAIL_WIDTH};
  flex-shrink: 0;

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[4.5]}`};

  padding: ${({ theme }) => `${theme.spacing[3.5]} ${theme.spacing[3]}`};

  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);

  @media ${({ theme }) => theme.media.lg} {
    position: sticky;
    top: 24px;
    max-height: calc(100dvh - ${TOPBAR_HEIGHT});
    overflow-y: auto;
  }

  @media ${({ theme }) => theme.media.belowLg} {
    width: 100%;
  }
`;

export const GroupBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
`;

export const GroupLabel = styled.h3`
  margin: 0;
  padding: ${({ theme }) => `0 ${theme.spacing[2.5]} ${theme.spacing[1.5]}`};

  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  color: ${({ theme }) => theme.color.mutedForeground};
`;

export const GroupItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};

  margin-left: ${({ theme }) => `${theme.spacing[3]}`};
  padding-left: ${({ theme }) => `${theme.spacing[2]}`};

  border-left: 1px solid ${({ theme }) => theme.color.border};
`;

export const NavItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};

  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[2.5]}`};

  border: none;
  border-radius: ${({ theme }) => theme.radii.md};

  background: ${({ $active, theme }) =>
    $active ? `${theme.color.accent}14` : "transparent"};

  color: ${({ $active, theme }) =>
    $active ? theme.color.accent : theme.color.foreground};

  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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
  gap: ${({ theme }) => `${theme.spacing[6]}`};
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
  activeKey: controlledKey,
  onSelect,
}: AreaSettingsPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const allItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  const allKeys = useMemo(() => allItems.map((item) => item.key), [allItems]);

  const initialKey = searchParams.get("section");

  const [uncontrolledKey, setUncontrolledKey] = useState(() =>
    initialKey && allKeys.includes(initialKey)
      ? initialKey
      : (allItems[0]?.key ?? ""),
  );

  const controlled = controlledKey !== undefined && onSelect !== undefined;
  const activeKey = controlled
    ? (allKeys.includes(controlledKey) ? controlledKey : (allItems[0]?.key ?? ""))
    : uncontrolledKey;
  const setActiveKey = controlled ? onSelect : setUncontrolledKey;

  const activeItem = useMemo(
    () => allItems.find((item) => item.key === activeKey),
    [allItems, activeKey],
  );

  return (
    <PageContainer>
      <PageContent>
        {/* Back renders in this page's own header block via the portal — see
            `PageContent`. It used to go up into the global TopBar. */}
        <HeaderActionPortal>
          <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
            <ArrowLeft size={14} style={{ marginRight: 6 }} />
            Back
          </Button>
        </HeaderActionPortal>

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
