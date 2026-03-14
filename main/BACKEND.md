# Backend Starting Point (ExpressJS + MongoDB)

## 1. Purpose
- Define a modular backend architecture that preserves the product boundaries from `INIT.md`.
- Provide a realistic MVP backend shape for a hackathon team without overengineering.
- Ensure moderation, trust, and ownership rules are explicit and enforceable.

## 2. System Architecture Style
- Style: modular monolith using ExpressJS with MongoDB.
- Reasoning:
  - fast iteration for hackathon speed
  - clear module boundaries without microservice overhead
  - one deployable unit, one operational surface
- Boundary: modules communicate through internal service contracts and domain events, not direct collection coupling.

## 3. Domain Modules

### Identity & Access
- Responsibilities:
  - authentication and session identity
  - actor role resolution (guest/member/admin/owner/verified)
  - permission guard decisions

### Communities
- Responsibilities:
  - community lifecycle and settings
  - membership states and invitations
  - join request processing
  - publish request governance

### Posts
- Responsibilities:
  - post lifecycle inside community scope
  - comment/reaction behavior under community and post rules
  - poll interaction mode
  - golden comment moderation markers (optional MVP-lite)

### Events
- Responsibilities:
  - event lifecycle with one origin community
  - event sharing approval into other communities
  - participation request moderation
  - participant visibility and attendance projections

### Pings
- Responsibilities:
  - urgent ping creation (verified users only)
  - WILL HELP response tracking
  - expiration handling and archival

### Services
- Responsibilities:
  - non-urgent request posting in a community
  - application intake
  - creator selection of one helper in MVP
  - completion and one-time review loop

### Profiles & Riddles
- Responsibilities:
  - onboarding questions and answer storage
  - answer visibility policy
  - daily riddle participation (community/global interest scope)
  - compatibility signal generation (soft, optional)

### Verification & Discovery
- Responsibilities:
  - one-time document-number proof workflow
  - user location capture (`home` required, `work` optional via pin/maps input)
  - open vs restricted community eligibility checks via spatial policies
  - open events discovery projection
  - proximity/topic filtering support
  - location eligibility checks for trust-sensitive/restricted communities

### Moderation & Notifications
- Responsibilities:
  - moderation queue aggregation (joins, publish requests, event participation, reports)
  - user-facing status updates for approvals/rejections

## 4. Core Domain Rules (Enforced Server-side)
- Rule: Events have exactly one origin community.
- Rule: Event shares require target community admin approval.
- Rule: Event participation is request-based and admin-approved.
- Rule: Pings are available only if enabled by community settings.
- Rule: Only verified users can create pings.
- Rule: Verified status is obtained by submitting a document number once.
- Rule: Verification is one-time and immutable after success.
- Rule: No dedicated verification trace/session logging is stored.
- Rule: Pings are short-lived and expire quickly.
- Rule: A service belongs to one community.
- Rule: Services are non-urgent and creator selects one helper in MVP.
- Rule: Communities can be `open` or `restricted`.
- Rule: Restricted community eligibility is evaluated using community access policy + user home/work locations.
- Rule: Posts, Events, Pings, Services remain separate content domains.

## 5. Conceptual Data Model Shape (MongoDB Collections)
- `users`: account identity and trust flags.
- `user_locations`: verified user home/work map points for access-policy checks.
- `profiles`: public profile fields and social preferences.
- `profile_answers`: onboarding and optional answer records with visibility.
- `communities`: community identity and governance settings.
- `community_access_policies`: restricted community trust/spatial eligibility policies.
- `community_memberships`: role/status per user and community.
- `community_invites`: invitation lifecycle records.
- `join_requests`: membership approval queue objects.
- `publish_requests`: member content approval objects.
- `posts`: community post content.
- `post_comments`: comments scoped to posts.
- `post_reactions`: reactions scoped to posts/comments.
- `polls` / `poll_votes` (optional): poll structures and votes.
- `events`: event records with origin community and visibility state.
- `event_shares`: pending/approved/rejected cross-community visibility requests.
- `event_participation_requests`: moderated participation intent.
- `event_participants`: accepted participants and optional role.
- `pings`: urgent short-lived requests.
- `ping_responses`: WILL HELP intent records.
- `services`: non-urgent requests tied to one community.
- `service_applications`: applicant records.
- `service_reviews`: post-completion trust feedback.
- `riddles` / `riddle_responses`: puzzle prompts and responses.
- `notifications`: user-targeted workflow updates.
- `audit_logs`: moderation and trust-sensitive action records.

## 6. Lifecycle and State Machines

### Communities
- `active` -> `restricted` -> `archived`.
- membership: `pending/invited` -> `active` -> `blocked/left`.

### Events
- event: `draft` -> `published` -> `ongoing` -> `completed/cancelled`.
- participation request: `requested` -> `accepted/rejected/withdrawn`.
- share request: `requested` -> `approved/rejected`.

### Pings
- ping: `active` -> `resolved/expired`.

### Services
- service: `open` -> `in_selection` -> `matched` -> `completed/cancelled`.
- application: `submitted` -> `accepted/rejected/withdrawn`.

### Posts
- post: `draft` -> `published` -> `locked/archived`.

## 7. Permission Model
- `Guest`:
  - browse public communities and open events
  - cannot post/request sensitive actions
- `Member`:
  - interact in joined communities under settings
  - can apply/request/respond according to feature rules
- `Admin`:
  - moderate membership and content requests
  - approve/reject event participation and event shares (target community)
  - configure community settings
- `Owner`:
  - all admin capabilities plus role governance
- `Verified user`:
  - unlocks trust-sensitive actions (notably ping creation)
- `Restricted-community candidate`:
  - must satisfy verification and spatial policy checks before joining restricted communities
- Boundary: permission checks combine actor role + membership state + feature settings + trust status.

## 8. Module Boundaries and Ownership
- Community-scoped ownership:
  - Posts, Pings, Services, Event visibility context
- User-owned objects:
  - Profile, profile answers, service applications, participation requests, user locations
- Event ownership:
  - creator + origin community
  - share approvals do not transfer ownership
- Access policy ownership:
  - community-owned policy rules evaluate user-owned location/verification context
- Boundary: Services discovery list is a projection; service ownership remains in source community.

## 9. Core Interaction Flows (Backend View)
- Create
  - community creation, post creation/request, event creation, ping creation, service creation, one-time document-number proof, user location save
- Discover
  - community feeds by type, open events listing, dedicated services listing
- Request/Apply/Respond
  - join requests, event participation requests, service applications, ping WILL HELP responses, restricted-community eligibility checks
- Approve/Reject
  - admin moderation actions across queued decisions
- Complete/Expire
  - event completion, service completion, ping expiration, stale request expiration

## 10. Read Model / Query Projections
- `CommunityFeedProjection`:
  - merged timeline for posts/events/pings with type labels
- `OpenEventsProjection`:
  - only public events with discovery filters
- `ServicesDiscoveryProjection`:
  - services across communities with community context attached
- `ModerationInboxProjection`:
  - pending items for community admins by decision type
- Hackathon caution: keep projections simple and denormalized enough for fast read performance.

## 11. Cross-cutting Concerns
- Moderation:
  - every approval/rejection is auditable
  - moderation status must be visible to requester
- Privacy:
  - answer visibility controls are enforced server-side
  - location usage should be relevance-oriented, not tracking-oriented
- Trust:
  - verified status is a capability flag, not a reputation score
  - verification requires one-time document number submission and then locks
- Discoverability:
  - dedicated surfaces for Open Events and Services
  - community feed remains the core engagement surface

## 12. Hackathon MVP Scope
- Include:
  - auth + basic role model
  - one-time document-number verification flow (write-once)
  - user home location capture (+ optional work location)
  - communities + memberships + waiting room
  - open/restricted community mode with basic access-policy evaluation
  - posts with basic comments/reactions
  - events with participation requests + approvals + public discovery
  - pings with verified-only creation + WILL HELP + expiration
  - services with applications + single-helper selection + completion
  - profile onboarding answers + visibility
- Post-MVP / optional:
  - advanced anonymity controls
  - map-based event visualization
  - rich reputation/points systems
  - advanced compatibility scoring and recommendation ranking

## 13. Delivery Plan (Hackathon Practical)
- Phase 1:
  - identity, communities, memberships, permission guard baseline
- Phase 2:
  - posts + events (core engagement and moderation mechanics)
- Phase 3:
  - pings + services (distinct help workflows)
- Phase 4:
  - profile onboarding + open-events discovery polish + moderation inbox refinements
