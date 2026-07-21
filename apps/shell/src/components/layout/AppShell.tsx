import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import styled from "styled-components";
import { BOTTOM_NAV_HEIGHT } from "@aios/shared/theme/layout";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

import { CommandPalette } from "@/components/CommandPalette";
import { GlobalAddTaskDialog } from "@/components/GlobalAddTaskDialog";
import { GlobalAssistant } from "@/components/assistant/GlobalAssistant";
import { WelcomeWizard } from "@/components/onboarding/WelcomeWizard";

import { useKeyboardShortcuts } from "@aios/shared/hooks/useKeyboardShortcuts";
import { GOTO_SHORTCUTS } from "@/config/navigation";
import { useNotifications } from "@aios/shared/hooks/useNotifications";
import { useSubscription } from "@aios/shared/hooks/useSubscription";
import { useUIStore } from "@aios/shared/stores/uiStore";
import { useAuthStore } from "@aios/shared/stores/authStore";
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

  @media (min-width: 769px) {
    display: none;
  }
`;

const Root = styled.div`
  display: flex;
  height: 100dvh;
  overflow: hidden;
  position: relative;

  background:
    radial-gradient(
      ellipse 80% 60% at 90% -10%,
      ${({ theme }) => `${theme.color.accent}12`},
      transparent 58%
    ),
    radial-gradient(
      ellipse 70% 50% at -10% 105%,
      ${({ theme }) => `${theme.color.primary}12`},
      transparent 55%
    ),
    ${({ theme }) => theme.color.background};

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

  @media (max-width: 768px) {
    padding-bottom: ${BOTTOM_NAV_HEIGHT};
  }
`;

const SkipLink = styled.a`
  position: absolute;
  top: -1000px;
  left: 12px;

  z-index: 200;

  padding: 8px 16px;

  border-radius: 8px;
  outline: 2px solid ${({ theme }) => theme.color.accent};

  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};

  box-shadow: 0 4px 16px rgba(45, 49, 58, 0.2);

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
    () => localStorage.getItem("aios_onboarded") !== "true",
  );

  useEffect(() => {
    pushRecentPage(location.pathname);

    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, pushRecentPage, sidebarOpen, setSidebarOpen]);

  const handleCompleteWizard = () => {
    localStorage.setItem("aios_onboarded", "true");
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

      <Sidebar />

      <MainColumn>
        {user && user.email_verified === false && <EmailVerificationBanner email={user.email} />}
        <TopBar />

        <ContentArea id="main-content" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <Outlet key={location.pathname} />
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
