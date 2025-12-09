# Chronos Task Manager

A beautiful, modular, and scalable multi-tenant Todo application built with React 19, TypeScript, and Tailwind CSS. Designed with a SQL-compliant relational schema, "Gmail-style" calendar navigation, and robust state management.

## 🚀 Features

### Core Functionality
- **Multi-Tenancy**: Complete workspace isolation. The authentication flow supports Tenant Slug resolution followed by User Authentication.
- **Smart Navigation**:
    - **Gmail-style Sidebar**: Mini-calendar for rapid date navigation, filtering by list/category, and quick views (Today, Upcoming, All).
    - **Master-Detail View**: Seamless in-screen transitions between the task list and detailed task view (no intrusive modals).
    - **Mobile Optimized**: Fully responsive sidebar with specific mobile drawer behavior and touch optimizations.

### Task Management
- **Rich Editing**: Dedicated task detail screen with a **Markdown Editor** (Write/Preview tabs) for descriptions.
- **Prioritization**: Visual priority indicators (Low, Medium, High).
- **Categories**: Color-coded lists/categories that can be created dynamically.
- **Advanced Interaction**:
    - `Shift + Click` Delete for "Force Delete" (skips confirmation).
    - Keyboard navigation support.

### Architecture & Tech
- **SQL-Compliant Schema**: Data types (`User`, `Tenant`, `Todo`) are designed to mirror a real relational database structure, ensuring easy migration to a backend.
- **Mock API Service**: A robust `ApiService` class that simulates network latency (`await delay()`) and handles LocalStorage persistence.
- **Animations**: Fluid layout transitions using `framer-motion`.

## 🛠 Tech Stack

- **Frontend Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Markdown**: Marked
- **Testing**: Vitest + React Testing Library

## 📂 Project Structure

```
/
├── components/          # UI Components
│   ├── AuthScreen.tsx       # Multi-step Login/Register flow
│   ├── Sidebar.tsx          # Main Navigation & Calendar
│   ├── TaskDetailScreen.tsx # Integrated Editor & View Logic
│   ├── TodoItem.tsx         # List Item Component
│   └── ...
├── services/            # Data Layer
│   └── api.ts               # Simulates Backend + LocalStorage
├── hooks/               # Custom React Hooks
│   └── useTodos.ts          # State Management & API Integration
├── types.ts             # SQL-Mirrored TypeScript Interfaces
├── App.tsx              # Root Layout & Router Logic
└── index.tsx            # Entry Point
```

## 🧪 Testing

The project is fully instrumented with **Vitest**.

### Test Suites
1.  **Unit Tests (`services/api.test.ts`)**: Verifies business logic, auth flows, and CRUD operations.
2.  **Component Tests (`components/TodoItem.test.tsx`)**: Checks rendering, user interactions, and conditional styling.
3.  **Integration Tests (`hooks/useTodos.test.ts`)**: Ensures the hook correctly manages state updates and side effects.

### Running Tests
(Assuming a standard Node environment setup)
```bash
npm run test
```

## 🔐 Authentication Flow

1.  **Workspace Identification**: User enters a workspace slug (e.g., `acme` or `demo`).
2.  **User Authentication**: User enters email/password for that specific workspace.
3.  **Workspace Creation**: New users can create a workspace using the invite key: `chronos-beta`.

## 💾 Data Persistence

All data is persisted to the browser's `localStorage` using the following keys:
- `chronos_tenants`
- `chronos_users`
- `chronos_categories`
- `chronos_todos`
- `chronos_session`

To reset the app, simply clear your browser's application storage.
