import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import styled from "styled-components";
import { BOTTOM_NAV_HEIGHT } from "@ct/shared/theme/layout";
import { trackOnce } from "@ct/shared/lib/analytics";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

import { CommandPalette } from "@/components/CommandPalette";
import { GlobalAddTaskDialog } from "@/components/GlobalAddTaskDialog";
import { GlobalAssistant } from "@/components/assistant/GlobalAssistant";
import { WelcomeWizard } from "@/components/onboarding/WelcomeWizard";

import { useKeyboardShortcuts } from "@ct/shared/hooks/useKeyboardShortcuts";
import { GOTO_SHORTCUTS, PAGE_NAMES, resolvePath } from "@/config/navigation";
import { PageIdentityProvider } from "@ct/shared/components/layout/PageLayout";
import { useNotifications } from "@ct/shared/hooks/useNotifications";
import { useSubscription } from "@ct/shared/hooks/useSubscription";
import { useUIStore } from "@ct/shared/stores/uiStore";
import { useAuthStore } from "@ct/shared/stores/authStore";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

const MobileBackdrop = styled.div<{ $show: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 199;

  background: rgba(45, 49, 58, 0.5);
  backdrop-filter: blur(4px);

  opacity: ${({ $show }) => ($show ? 1 : 0)};
  visibility: ${({ $show }) => ($show ? "visible" : "hidden")};
  pointer-events: ${({ $show }) => ($show ? "auto" : "none")};

  transition:
    opacity 180ms ease,
    visibility 180ms ease;

  @media ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

const Root = styled.div`
  display: flex;
  height: 100dvh;
  overflow: hidden;
  position: relative;

  /*
   * Two hand-rolled radials replaced by theme.appBackground on 2026-08-01 —
   * the token carries the redesign's three-tint version (accent / info /
   * success) and stays consistent with any other surface that needs it.
   */
  background: ${({ theme }) => theme.appBackground};

  color: ${({ theme }) => theme.color.foreground};
`;

const MainColumn = styled.div`
  flex: 1;
  min-width: 0;

  display: flex;
  flex-direction: column;
`;

const ContentArea = styled.main`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;

  position: relative;
  outline: none;

  scroll-behavior: smooth;
  overscroll-behavior: contain;

  @media ${({ theme }) => theme.media.belowMd} {
    padding-bottom: ${BOTTOM_NAV_HEIGHT};
  }
`;

const SkipLink = styled.a`
  position: absolute;
  top: -1000px;
  left: 12px;

  z-index: 200;

  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};

  border-radius: ${({ theme }) => theme.radii.sm};
  outline: 2px solid ${({ theme }) => theme.color.accent};

  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};

  box-shadow: ${({ theme }) => theme.elevation[3]};

  &:focus {
    top: 12px;
  }
`;

export function AppShell() {
  useKeyboardShortcuts(GOTO_SHORTCUTS);
  useNotifications();
  useSubscription();

  const location = useLocation();
  const user = useAuthStore(s => s.user);

  const { pushRecentPage, sidebarOpen, setSidebarOpen } = useUIStore();

  const [showWizard, setShowWizard] = useState(
    () => localStorage.getItem("ct_onboarded") !== "true",
  );

  useEffect(() => {
    pushRecentPage(location.pathname);

    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, pushRecentPage, sidebarOpen, setSidebarOpen]);

  const pageIdentity = useMemo(() => {
    const current = resolvePath(location.pathname);
    if (!current) return null;
    const title = PAGE_NAMES[location.pathname] ?? current.sub?.label ?? current.item.label;
    const Icon = current.sub?.icon ?? current.item.icon;
    return {
      title,
      // The eyebrow is the area, and only when the title is not the area itself.
      eyebrow: title === current.item.label ? undefined : current.item.label,
      icon: <Icon />,
      domain: current.item.domain,
    };
  }, [location.pathname]);

  const handleCompleteWizard = () => {
    localStorage.setItem("ct_onboarded", "true");
    trackOnce("onboarding_completed");
    setShowWizard(false);
  };

  return (
    <Root>
      <SkipLink href="#main-content">Skip to content</SkipLink>

      <MobileBackdrop
        $show={sidebarOpen}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/*
        * The Sidebar component existed but was never mounted here — the app's
        * only navigation was a flat six-link row in the TopBar, which is why
        * `theme.chrome` had zero call sites. Mounted 2026-08-01 as the primary
        * navigation for the two-level tree; TopBar now shows breadcrumbs.
        */}
      <Sidebar />

      <MainColumn>
        {user && user.email_verified === false && <EmailVerificationBanner email={user.email} />}
        <TopBar />

        <ContentArea id="main-content" tabIndex={-1}>
          <AnimatePresence mode="wait">
            {/* The nav tree lives here, the pages live in domain packages that
                cannot import it, so the shell publishes who the current page is
                and `PageContent` renders the header. */}
            <PageIdentityProvider value={pageIdentity}>
              <Outlet key={location.pathname} />
            </PageIdentityProvider>
          </AnimatePresence>
        </ContentArea>
      </MainColumn>

      <CommandPalette />
      <GlobalAddTaskDialog />
      <GlobalAssistant />
      <BottomNav />

      {showWizard && <WelcomeWizard onComplete={handleCompleteWizard} />}
    </Root>
  );
}
