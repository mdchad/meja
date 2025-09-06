# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `bun install` - Install dependencies (prefer bun over npm/yarn)
- `bun run dev` - Start Vite dev server only
- `bun run tauri:dev` - Start both Vite dev server and Tauri desktop app (recommended for full development)
- `bun run build` - Build frontend for production
- `bun run tauri:build` - Build complete desktop application
- `bun run lint` - Run ESLint
- `bun run format` - Format JS/TS files with Prettier
- `bun run format:check` - Check if JS/TS files are formatted correctly
- `bun run preview` - Preview production build

### Tauri Commands
- `bun run tauri` - Access Tauri CLI directly
- Individual Tauri commands should use bun instead of npm/node per project conventions

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components + Tailwind CSS
- **Backend**: Tauri v2 (Rust)
- **State Management**: Zustand store in `src/lib/store.ts`
- **Database**: MongoDB with custom Tauri commands
- **Table Component**: TanStack Table for data visualization

### Key Files Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── ConnectionManager.tsx  # Database connection dialog
│   ├── DatabaseSidebar.tsx    # Database/collection navigator
│   └── DataTable.tsx         # Main data table with TanStack Table
├── lib/
│   ├── store.ts              # Zustand state management
│   └── utils.ts              # Utility functions
├── App.tsx                   # Main app layout (sidebar + table)
└── main.tsx                  # React entry point

src-tauri/
├── src/                      # Rust backend code
├── Cargo.toml               # Rust dependencies
└── tauri.conf.json          # Tauri configuration
```

### State Management
The app uses Zustand with a centralized store (`src/lib/store.ts`) that manages:
- Database connection state and configuration
- Selected database/collection navigation
- Table data, pagination, and loading states
- Query execution and filtering via JSON queries

### Database Integration
MongoDB integration through custom Tauri commands:
- `mongodb_connect` - Establish database connection
- `mongodb_find_documents` - Query documents with filtering/pagination
- `mongodb_count_documents` - Get document counts
- All database operations are async and handle connection via the Zustand store

### UI Patterns
- Uses shadcn/ui components for consistent design system
- Tailwind CSS with custom theme configuration
- Grid-based layout: fixed sidebar (280px) + flexible main content area
- Tauri-specific drag region in header for window controls

### Development Notes
- Project uses Bun as primary package manager and runtime
- Tauri app has overlay title bar style for modern desktop appearance
- All database queries use JSON format for MongoDB filter syntax
- Error handling throughout with user-friendly error messages in UI