# School Pulse

SaaS school management platform with modular, feature-gated tools.

## Architecture

- **Supa Admin Portal** (`/admin`) — platform-owner dashboard to control schools, features, pricing, and activation
- **School Dashboard** (`/school`) — tenant-scoped school ERP with feature gating and preview mode
- **Onboarding Flow** (`/onboarding`) — school signup, feature selection, and activation request
- **Auth** (`/auth`) — login and registration

## Tech Stack

- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui
- Zustand (state management)
- TanStack Query (server state)
- React Router v6
- Framer Motion

## Getting Started

```bash
npm install
npm run dev
```

## Feature Gating

Every module is wrapped in `useFeatureAccess(featureKey)` which checks `school_feature_flags` and `school_access_state`:

- `preview` → UI visible, interactions locked
- `payment_pending` → partially blocked
- `active` → fully usable
- `suspended` → full lock
