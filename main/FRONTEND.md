# Frontend Starting Point (React Native)

## 1. Purpose

- Define a clean mobile app architecture that maps directly to `INIT.md` and `ARCHITECTURE.md`.
- Keep feature boundaries explicit so Posts, Events, Pings, and Services remain distinct in the UX.
- Provide a practical MVP plan for a small hackathon team.

## 2. Product Rules to Preserve in UI

- Rule: Posts are content sharing only.
- Rule: Events are scheduled and moderated through participation requests.
- Rule: Pings are urgent, short-lived, verified-user initiated.
- Rule: Services are non-urgent, structured requests with applicant selection.
- Rule: Every Event has one origin community.
- Rule: Pings exist only when a community enables them.
- Rule: Services belong to one community but are also discoverable in a dedicated Services section.

## 3. Frontend Architecture Shape

- App style: modular feature-first React Native app.
- Suggested layers:
  - `App Shell`: navigation, session bootstrap, feature flags.
  - `Feature Modules`: communities, posts, events, pings, services, profiles, proof-of-work/location.
  - `Shared Domain UI`: cards, lists, badges, moderation chips, status indicators.
  - `Data Access`: request clients, cache/state synchronization, auth token handling.
- Boundary: feature modules own their own screens/view models and do not directly mutate other feature states.

## 4. Navigation Architecture

- `Auth Flow`
  - Sign in / register
  - Document-number proof prompt (one-time, optional deferrable)
  - Onboarding questions (profiles)
  - Select Home / Office locations with pins on interactive map
- `Main App Flow`
  - Communities
  - Open Events
  - Services
  - Profile
  - Notifications/Inbox (optional MVP-lite)
- `Community Detail Flow`
  - Community feed with type filters (`Posts`, `Events`, `Pings`)
  - Members
  - Community settings (admin only)

## 5. Feature Modules

### Communities Module

- Screens:
  - community discovery
  - community detail
  - join request status
  - admin moderation queue
- Responsibilities:
  - membership state awareness (`guest`, `pending`, `member`, `admin`)
  - enforce community settings in UI (reply mode, pings enabled, publish restrictions)

### Posts Module

- Screens:
  - post feed items (inside communities)
  - post detail with comments/reactions
  - post creation/request submission
- Responsibilities:
  - render post interaction mode correctly (reactions-only, limited replies, poll mode)
  - preserve clear separation from Event/Ping/Service actions

### Events Module

- Screens:
  - event detail
  - participation request form
  - participation request status
  - open events discovery
- Responsibilities:
  - show origin community and share visibility context
  - collect requests (not direct join)
  - surface admin decisions clearly

### Pings Module

- Screens:
  - active ping list in community feed
  - ping detail with WILL HELP action and response count
  - ping creation (verified users only)
- Responsibilities:
  - urgency-first visual language
  - expiration countdown and archive behavior
  - hard separation from Services flow

### Services Module

- Screens:
  - community services list
  - global dedicated Services section
  - service detail with applications
  - creator selection flow and completion
- Responsibilities:
  - non-urgent structured request pattern
  - single selected helper in MVP
  - transition to private coordination after acceptance

### Profiles & Riddles Module

- Screens:
  - profile view/edit
  - onboarding questions
  - daily riddle (community or interest)
  - compatibility hints
- Responsibilities:
  - answer visibility controls
  - soft matching signals only

### Proof-of-Work & Location Module

- Screens:
  - one-time document-number proof status
  - location-based open event filters
- Responsibilities:
  - trust capability display (verified/unverified)
  - enforce one-time proof submission UX (no re-run after success)
  - no invasive location behavior in MVP

## 6. Client Domain State (Conceptual)

- `SessionState`: auth status, user id, proof status.
- `MembershipState`: per-community role and access status.
- `CommunitySettingsState`: reply modes, ping enablement, publish mode.
- `FeedState`: community-scoped items separated by type.
- `ModerationState`: pending join/publish/participation decisions.
- `ProfileState`: answers, visibility flags, riddle responses.
- `DiscoveryState`: open events filters, services browsing filters.
- Boundary: do not merge all content into one generic item model for MVP; keep explicit type-specific models.

## 7. Permissions and UI Gating

- `Guest`: browse public communities and open events.
- `Member`: interact according to community settings.
- `Admin`: moderation and approval actions.
- `Verified User`: create pings where enabled; access trust-sensitive actions.
- Gating behavior:
  - hide disallowed actions where possible
  - if action is shown but blocked by rule, explain why and next step

## 8. Core UX Flows to Implement First

- Create
  - create/join community
  - create post
  - create event
  - create ping (verified + enabled only)
  - create service
- Discover
  - browse community feed by type
  - browse open events with topic/location filters
  - browse Services tab
- Request/Apply/Respond
  - request event participation
  - apply to service
  - respond WILL HELP to ping
- Approve/Reject
  - community join requests
  - publish requests (if enabled)
  - event participation requests
  - service helper selection
- Complete/Expire
  - mark service completed
  - ping expiration
  - event completion status

## 9. UI Boundary Decisions (Important)

- Boundary: keep separate creation entry points for Post, Event, Ping, Service.
- Boundary: do not let Service cards appear as Event cards or vice versa.
- Boundary: in Event detail, primary CTA is always `Request to Participate`, never `Join`.
- Boundary: Ping CTA is `WILL HELP`, not application workflow.
- Boundary: Services require explicit creator selection step; no first-come assignment.

## 10. Hackathon MVP Slice

- Include:
  - auth + onboarding questions
  - communities + membership states
  - community feed with posts/events/pings sections
  - event participation requests and admin decisions
  - ping creation (verified only), response count, expiration
  - services list, applications, creator selects one helper
  - open events discovery filters (topic + rough closeness)
- Post-MVP / optional:
  - social map
  - advanced anonymous participation controls
  - points and golden comment reward mechanics
  - advanced compatibility explanations

## 11. Team Split Suggestion (Hackathon)

- Track A: Communities + Posts + feed shell.
- Track B: Events + open events discovery.
- Track C: Pings + Services workflows.
- Track D: Profiles + onboarding + proof status + shared state integration.
