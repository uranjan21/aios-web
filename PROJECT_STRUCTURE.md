# Project Structure Overview

This document outlines the folder structure and core file responsibilities of the **AiOs** web application. The application is a unified AI operating system with both frontend and backend components.

## Root Directory

```text
aios-web/
├── backend/                # Python 3.11+ FastAPI and SQLModel Backend
│   ├── alembic/            # Database migrations
│   ├── app/
│   │   ├── api/            # API endpoints (auth, chat, and areas/)
│   │   ├── core/           # Config and security
│   │   ├── db/             # DB session management
│   │   ├── models/         # SQLModel database models
│   │   └── services/       # Services (finance, insights, notifications)
├── frontend/               # The main React frontend application
├── ledgr-ui/               # Reusable React component library
├── docker-compose.yml      # Docker compose configuration for running services locally
├── setup.sh                # Script to setup the development environment
├── run.sh                  # Shell script to run application
├── CLAUDE.md               # Claude/Agentic instructions and shortcuts
├── MEMORY.md               # Project specific memory and context for agents
├── PROJECT.md              # Core project definition and layout conventions
└── PROJECT_STRUCTURE.md    # This file!
```

## Frontend Directory (`/frontend`)

The frontend is a React Single Page Application (SPA) built with Vite, TypeScript, and TailwindCSS.

```text
frontend/
├── package.json            # Project metadata and npm dependencies
├── vite.config.ts          # Vite bundler configuration
├── tsconfig.json           # TypeScript configuration
├── index.html              # Entry HTML file
├── public/                 # Static assets (images, favicons, etc.)
└── src/                    # Main source code
```

### Source Directory (`/frontend/src`)

The `/src` folder holds the core application logic, UI, and state management.

```text
src/
├── main.tsx                # Entry point: renders the React app to the DOM
├── App.tsx                 # Root application component
├── router.tsx              # Application routing definitions (React Router)
├── index.css               # Minimal CSS reset for pre-rendering
│
├── api/                    # API client logic, data fetching functions, and service integrations
│
├── components/             # Reusable UI components
│   ├── layout/             # Layout components (AppShell, Sidebar, TopBar, BottomNav)
│   ├── ui/                 # Generic, reusable UI elements (Buttons, Inputs, Dialogs)
│   └── ...                 # Feature-specific components (e.g., CommandPalette)
│
├── pages/                  # Route-level page components
│   ├── areas/              # Specialized feature area pages (Finance, Health, Career, etc.)
│   ├── guide/              # App documentation and feature guides
│   ├── DashboardPage.tsx   # Main dashboard view
│   ├── ChatPage.tsx        # Chat interface with AI agents
│   ├── AgentsPage.tsx      # Agent management and discovery
│   └── ...                 # System pages (Settings, Integrations, Login)
│
├── stores/                 # Global state management (Zustand)
│   ├── authStore.ts        # Authentication state
│   ├── uiStore.ts          # UI state (theme, sidebar open/close)
│   └── ...
│
├── theme/                  # Global theme definitions and custom tokens
│
├── hooks/                  # Custom React hooks
│   ├── useKeyboardShortcuts.ts # Global keyboard shortcut listener
│   ├── useNotifications.ts     # Global notification handler
│   └── ...
│
├── lib/                    # Utility functions and library wrappers
│   └── utils.ts            # Common helpers (e.g., classname merging `cn()`)
│
└── types/                  # TypeScript interface and type definitions
```

## Key Files Explained

- **`src/router.tsx`**: Defines all the accessible URLs in the application. Uses lazy loading for code splitting to improve initial load times. Also handles authentication checks via `<RequireAuth>`.
- **`src/components/layout/AppShell.tsx`**: The main layout wrapper for authenticated users. It incorporates the Sidebar, TopBar, BottomNav, and main content area.
- **`src/components/layout/Sidebar.tsx`**: The primary navigation component. It reads from `uiStore` to determine if it should be collapsed or expanded, and highlights the active route.
- **`src/index.css`**: Minimal CSS reset for pre-rendering. Styling and theming is handled via theme files.
- **`src/stores/uiStore.ts`**: A Zustand store managing the UI state, such as which theme is active or if the sidebar is expanded.
