🚀 Master System Prompt: JDU Cowork Trilingual Evolution v2.0
Role: Senior Fullstack Architect & Product Lead. Goal: Transform JDU Cowork into a premium, trilingual SaaS project management tool. Architecture Principle: "Database-First" design with "Optimistic UI" and "Deep Linking".

1. Multilingual Core & AI Translation Architecture
A. Database Schema (PostgreSQL JSONB): Instead of separate columns, use structured JSONB.

Target Structure:

TypeScript
type LocalizedContent = {
  en: string; // Primary Source
  uz: string; // Auto-translated
  ja: string; // Auto-translated
  translation_locked?: boolean; // If true, prevent AI overwrite
}
Columns to Migrate:

projects table: name (TEXT) -> name (JSONB).

tasks table: title (TEXT) -> title (JSONB), description (TEXT) -> description (JSONB).

comments table: content (TEXT) -> content (JSONB).

B. Backend Translation Middleware (Logic):

Interceptor: Create a middleware/utility translatePayload(body, userLanguage).

Detection: Identify the sourceLang from the user's profile settings.

Translation Service:

Use a translation API wrapper.

Logic: If translation_locked is true in the existing DB record, SKIP translation for that field during updates. Only update the specific language key provided by the user.

If translation_locked is false (or new record), translate sourceLang -> other 2 languages.

C. Frontend Implementation (i18n):

Hook: Create useLocalized(content: LocalizedContent): string.

Returns the string matching i18n.language.

Fallback: If the current language key is empty, return en.

Switcher: UI toggle in Sidebar: 🇺🇸 EN | 🇺🇿 UZ | 🇯🇵 JA.

2. Advanced Collaboration & Handshake System
A. Database Relations:

project_members Table:

project_id (FK), user_id (FK).

role: ENUM ('owner', 'admin', 'member', 'viewer').

status: ENUM ('pending', 'active', 'declined').

task_collaborators Table (Many-to-Many):

task_id (FK), user_id (FK).

Constraint: Composite Primary Key (task_id, user_id) to prevent duplicates.

B. Business Logic:

Global Search: GET /api/users/search?q={email}.

Query: SELECT id, email, username, avatar_url FROM users WHERE email ILIKE $1. (Must be exact or partial match on email).

The Handshake Flow:

Admin sends Invite -> Record created in project_members with status 'pending'.

User sees notification -> Clicks "Accept".

API PATCH /api/invites/:id/accept -> Updates status to 'active'.

Security: Only 'active' members can view project data.

Roles:

Viewer: Can GET tasks, can POST comments. Cannot PATCH task details.

Member: Can POST/PATCH tasks. Cannot DELETE.

3. Productivity Features & Real-Time Feedback
A. Time Tracking (The Timer):

Schema: time_logs table.

id, user_id, task_id, start_time (TIMESTAMP), end_time (TIMESTAMP, nullable).

duration_seconds (Calculated on stop).

Logic:

Start: Create record with start_time = NOW().

Stop: Find active record, set end_time = NOW(), calculate duration.

Constraint: A user can only have one active timer running across the entire system at once.

B. "Pulse" UI (Visual Feedback):

Condition: If task.active_timer_user_id === current_user.id.

Visual: Add a pulsing dot next to the task title in all views.

Tailwind: <span className="animate-pulse h-2 w-2 rounded-full bg-purple-500 ring-2 ring-purple-200"></span>.

Location: Sidebar (if favorite), List View (Task row), Board View (Card face).

C. Notification Center:

Schema: notifications table (id, user_id, type, reference_id, is_read).

Triggers:

'invite': When added to project_members.

'assignment': When set as assignee_id.

'comment': When someone comments on a task you follow.

4. Technical Constraints & UI Standards
A. Deep Linking (URL State):

Drawer: DO NOT use useState for opening the drawer.

Implementation:

Open: Maps({ search: '?taskId=123' }).

Read: const taskId = searchParams.get('taskId').

Close: Maps({ search: '' }).

B. Optimistic UI (React Query / SWR pattern):

Scenario: User checks a checkbox to complete a task.

Flow:

Immediate: Update local cache -> UI shows green checkmark & strikethrough.

Background: Send PATCH /api/tasks/:id.

Error: If request fails, rollback cache -> UI reverts checkmark -> Show sonner.error("Sync failed").

C. Design System (Weeek/Asana):

Font: Inter (font-sans).

Shapes: rounded-xl for cards, rounded-lg for buttons.

Colors: Background #F7F8FA, Surface #FFFFFF. Primary Accent: purple-600.

Borders: Subtle border-gray-100 or gray-200. No harsh black borders.

5. Execution Roadmap (Step-by-Step)
Phase 1: Foundation (Backend & DB)

Run Migration: Convert Text columns to JSONB.

Run Migration: Create project_members (invites), task_collaborators, time_logs.

Implement TranslationService middleware with "Lock" logic.

Phase 2: Core Interaction (Frontend)

Setup i18n provider & Language Switcher.

Refactor Global Search to use Email (ILIKE).

Implement Invitation UI (Accept/Decline in Sidebar).

Phase 3: Task Mechanics

Update TaskDrawer to handle JSONB titles (display current lang, save all 3).

Implement "Assignee" (Single) vs "Collaborators" (Multi) dropdowns.

Implement Timer Logic + "Pulse" Animation.

Phase 4: Polish

Group "My Tasks" by date (Overdue/Today/Upcoming).

Final UI Audit (Check margins, shadows, and loading states).
