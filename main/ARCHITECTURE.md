## 1. Communities

### 1. Purpose

- Communities are the primary trust and moderation container for all social activity.
- They exist to let people interact under shared rules, not in a global unmoderated feed.
- They solve membership trust, local norms, and content governance.

### 2. Architectural Role

- Role: **Core domain**.
- Depends on: Profiles (for discovery hints), Verification/Location (for trust-gated entry), Posts/Events/Pings/Services as contained content types.
- Depended on by: Posts, Events, Pings, Services (all anchored to community context).

### 3. Main Domain Entities

- `Community`: social container with identity and settings.
- `CommunitySettings`: configuration of entry, posting, replies, pings, and optional features.
- `CommunityMembership`: user-to-community relationship with role and status.
- `JoinRequest`: pending access request when waiting room is enabled.
- `CommunityInvite`: invitation from existing members/admins.
- `PublishRequest`: moderation object for member-submitted content needing approval.
- `CommunityRecognition` (optional): points/highlight records such as golden comments.

### 4. State and Lifecycle

- Community lifecycle: `active` -> `restricted` -> `archived`.
- Membership lifecycle: `invited/pending` -> `active` -> `blocked/left`.
- Join request lifecycle: `submitted` -> `approved/rejected/expired`.
- Publish request lifecycle: `submitted` -> `approved/rejected`.
- Rule: community settings are authoritative at interaction time.

### 5. Permissions and Actors

- `Guest`: discover public communities, request join if allowed.
- `Member`: consume content, interact per settings.
- `Admin`: moderate members/content, approve join/publish requests, configure community.
- `Owner`: all admin actions plus admin governance.
- `Verified user`: may get extra rights (for example ping creation where enabled).

### 6. Relationships and Boundaries

- Communities own Posts, Pings, Services, and Event visibility context.
- Event ownership boundary: event has one origin community even if shared elsewhere.
- Boundary: anonymous participation is scoped to community context only, not global identity.
- Boundary: moderation decisions are community-local and do not globally ban users by default.

### 7. Core User Flows

- Create: user creates community -> configures rules -> invites members.
- Discover: user browses communities -> requests join or accepts invite.
- Request/apply/respond: member submits content request when direct publishing is off.
- Approve/reject: admin processes join and publish requests.
- Complete/expire: requests resolve; stale pending requests expire.

### 8. Architecture Notes

- Rule: communities are the primary moderation layer.
- Trust boundary: membership status gates all downstream actions.
- Visibility rule: content inherits community visibility and member role.
- Hackathon caution: anonymous mode plus moderation/audit can get complex; keep identity masking simple in MVP.

### 9. MVP Scope Recommendation

- Include: community creation, roles, waiting room, basic config toggles, invitations, simple moderation queue.
- Post-MVP: advanced reputation systems, rich anonymity controls, nuanced moderation automation.

### 10. Candidate Data Model Shape

- `Community`: group identity and scope.
- `CommunitySettings`: behavior toggles and participation rules.
- `CommunityMembership`: role/status per user.
- `JoinRequest`: access moderation object.
- `CommunityInvite`: invitation object.
- `PublishRequest`: approval object for member-submitted content.
- `CommunityRecognition` (optional): golden comment/points markers.

---

## 2. Profiles

### 1. Purpose

- Profiles provide lightweight social context and matching signals.
- They exist to improve member discovery without requiring sensitive personal data.
- They solve “who should I connect with” in a playful, low-pressure way.

### 2. Architectural Role

- Role: **Supporting domain**.
- Depends on: Communities (context for social discovery), optional Riddle features.
- Depended on by: Communities (similar-member hints), Events (friend/similarity overlays).

### 3. Main Domain Entities

- `Profile`: user-facing social identity card.
- `Question`: reusable prompt for onboarding or later answering.
- `Answer`: user response with visibility choice.
- `Riddle`: time-based prompt in community or interest scope.
- `RiddleResponse`: user response tied to a riddle.
- `CompatibilitySignal` (optional): computed affinity hint.

### 4. State and Lifecycle

- Answer lifecycle: `drafted` -> `saved` -> `visible/hidden` -> `deleted`.
- Riddle lifecycle: `scheduled` -> `active` -> `closed`.
- Compatibility lifecycle: `computed` -> `stale` -> `recomputed`.
- Rule: visibility state controls discoverability immediately.

### 5. Permissions and Actors

- `User`: edit own profile, answer questions, set answer visibility, create friend riddles.
- `Member`: view others’ public answers in allowed contexts.
- `Admin`: moderate inappropriate user-generated riddles if enabled.
- Boundary: profile signals inform discovery but should not gate core access.

### 6. Relationships and Boundaries

- Profile is user-owned, not community-owned.
- Answers are user-owned; visibility determines where they can be surfaced.
- Community riddles belong to community context; interest riddles belong to global category context.
- Boundary: matching is advisory and “soft,” not deterministic or exclusionary.

### 7. Core User Flows

- Create: onboarding presents 3 questions -> user answers -> profile starts populated.
- Discover: member browses public answers/similarity hints.
- Request/apply/respond: user opts into riddles and submits responses.
- Approve/reject: only needed for moderated user-generated riddles.
- Complete/expire: daily riddle closes and results freeze.

### 8. Architecture Notes

- Privacy concern: answer-level visibility must be explicit and reversible.
- Trust boundary: avoid exposing private answers in compatibility explanations.
- Hackathon caution: overbuilding matching logic is risky; keep scoring simple and transparent.

### 9. MVP Scope Recommendation

- Include: onboarding questions, answer visibility toggle, simple similarity hints, one daily riddle mode.
- Post-MVP: richer compatibility models, advanced friend recommendation ranking, complex riddle moderation workflows.

### 10. Candidate Data Model Shape

- `Profile`: public user persona.
- `Question`: prompt catalog item.
- `Answer`: response with visibility.
- `Riddle`: scheduled puzzle prompt.
- `RiddleResponse`: answer submission.
- `CompatibilitySignal` (optional): lightweight similarity artifact.

---

## 3. Verification and Location

### 1. Purpose

- Adds trust-sensitive capability and location-aware discovery.
- Exists to unlock actions requiring stronger confidence (for example ping creation) and to improve open event relevance.
- Solves abuse risk and discovery noise.

### 2. Architectural Role

- Role: **Cross-cutting capability**.
- Depends on: User identity foundation and event/community metadata.
- Depended on by: Communities (eligibility), Pings (verified-only creation), Events discovery.

### 3. Main Domain Entities

- `VerificationStatus`: user trust state.
- `LocationEligibilityRule`: community rule for location/trust-sensitive access.
- `OpenEventListing`: projection of public events for discovery.
- `ProximityPreference`: user-selected distance preference for browsing.

### 4. State and Lifecycle

- Verification lifecycle: `unverified` -> `pending` -> `verified/failed` -> `revoked` (optional).
- Eligibility lifecycle: `eligible/ineligible` evaluated at interaction time.
- Open listing lifecycle mirrors event visibility lifecycle.
- Rule: verification is a capability flag, not a social ranking score.

### 5. Permissions and Actors

- `User`: starts verification, uses location-based discovery.
- `Verified user`: can access restricted capabilities.
- `Admin`: defines community trust/location constraints.
- `System`: evaluates eligibility against current rules.

### 6. Relationships and Boundaries

- Verification is user-level and reusable across communities.
- Location eligibility is community-level policy.
- Open event discovery is cross-community but respects event public flag and moderation.
- Boundary: verification does not imply automatic admission to restricted communities.

### 7. Core User Flows

- Create: user submits verification -> status updates.
- Discover: user opens open-events section -> filters by topic and closeness.
- Request/apply/respond: user requests join to trust-sensitive community.
- Approve/reject: community admins decide final access.
- Complete/expire: verification can be renewed or revoked (post-MVP).

### 8. Architecture Notes

- Trust boundary: separate “verified” from community role permissions.
- Privacy concern: location should be used for relevance, not persistent tracking by default.
- Hackathon caution: full identity-verification integrations can consume hackathon time; use a simplified trust flag for MVP demo realism.

### 9. MVP Scope Recommendation

- Include: binary verified status, open-event filtering by rough distance/topic, optional special-community suggestion.
- Post-MVP: advanced location-eligibility logic, map overlays, verification lifecycle complexity.

### 10. Candidate Data Model Shape

- `VerificationStatus`: trust capability record per user.
- `LocationEligibilityRule`: community access constraints.
- `OpenEventListing`: discoverable public event view.
- `ProximityPreference`: user filter preference.

---

## 4. Events

### 1. Purpose

- Events coordinate scheduled, moderated real-world participation.
- They exist to move communities from discussion into action.
- They solve trusted participation and cross-community collaboration.

### 2. Architectural Role

- Role: **Core domain**.
- Depends on: Communities, Profiles (friend/similarity overlays), Verification/Location for discovery/eligibility.
- Depended on by: Community engagement metrics and discovery surfaces.

### 3. Main Domain Entities

- `Event`: scheduled activity with one origin community.
- `EventShare`: visibility request from origin event into another community.
- `EventParticipationRequest`: user request to join an event.
- `EventRole` (optional): role bucket for participation type.
- `EventParticipant`: accepted participant record.
- `EventModerationDecision`: approval/rejection artifact.

### 4. State and Lifecycle

- Event lifecycle: `draft` -> `published` -> `ongoing` -> `completed/cancelled`.
- Share lifecycle: `requested` -> `approved/rejected`.
- Participation lifecycle: `requested` -> `accepted/rejected/withdrawn`.
- Rule: users do not directly join; all participation is request + admin decision.
- Rule: event has exactly one origin community.

### 5. Permissions and Actors

- `Origin admin`: creates event, manages participation, manages shares.
- `Target community admin`: approves/rejects incoming event shares.
- `Member/user`: discovers event and submits participation request.
- `Participant`: accepted attendee with optional role assignment.
- Boundary: accepted status is event-specific, not equivalent to community membership.

### 6. Relationships and Boundaries

- Ownership: event belongs to creator within one origin community.
- Visibility: share does not transfer ownership; it grants visibility in target community.
- Boundary: event is scheduled moderated participation, not a post thread, ping, or service request.
- Boundary: public event discovery extends reach but does not bypass moderation.

### 7. Core User Flows

- Create: admin creates event in origin community.
- Discover: users see event via origin community, approved shares, or public discovery.
- Request/apply/respond: user submits participation request (optionally role-specific).
- Approve/reject: admins accept or reject requests.
- Complete/expire: event ends; participation freezes; optional post-event feedback phase.

### 8. Architecture Notes

- Moderation point: two approval layers can exist (share approval and participation approval).
- Cross-community concern: keep origin traceability visible everywhere event appears.
- Visibility rule: event public visibility is additive, not ownership-changing.
- Hackathon caution: complex multi-role capacity planning is optional; start with simple role labels.

### 9. MVP Scope Recommendation

- Include: origin community rule, share approval, participation requests with admin decisions, public toggle, attendance count.
- Post-MVP: advanced role capacity workflows, nuanced post-event bilateral ratings, complex lifecycle automations.

### 10. Candidate Data Model Shape

- `Event`: scheduled activity object.
- `EventShare`: cross-community visibility approval object.
- `EventParticipationRequest`: moderated join request.
- `EventParticipant`: accepted participation record.
- `EventRole` (optional): participation categories.
- `EventModerationDecision`: moderation outcome record.

---

## 5. Posts

### 1. Purpose

- Posts are community-scoped content sharing units.
- They exist to maintain ongoing communication between events and help requests.
- They solve announcements, updates, and conversational prompts.

### 2. Architectural Role

- Role: **Core domain**.
- Depends on: Communities (scope, rules), Profiles (author identity display mode).
- Depended on by: Community engagement and moderation surfaces.

### 3. Main Domain Entities

- `Post`: content item in a community.
- `PostInteractionMode`: behavior rule for each post (reactions-only, limited replies, etc.).
- `Comment`: reply unit bound to a post.
- `Reaction`: lightweight signal on post/comment.
- `Poll` (optional): structured vote attached to post.
- `GoldenComment` (optional): admin-highlighted comment marker.

### 4. State and Lifecycle

- Post lifecycle: `draft` -> `published` -> `locked/archived`.
- Comment lifecycle: `published` -> `hidden/removed`.
- Poll lifecycle: `open` -> `closed`.
- Rule: post interaction follows both community defaults and per-post constraints.

### 5. Permissions and Actors

- `Member`: create/interact if community permits.
- `Admin`: moderate, pin/highlight, enforce rules.
- `Owner`: escalated moderation authority.
- `Anonymous participant` (if enabled): interacts with masked community identity.
- Boundary: post authorship remains accountable to admins even with anonymous display.

### 6. Relationships and Boundaries

- Posts belong to one community only.
- Comments and reactions belong to a post.
- Poll belongs to a post, not a standalone content type.
- Boundary: post is content sharing, not event participation or help-request workflow.

### 7. Core User Flows

- Create: member/admin publishes post (or submits publish request if required).
- Discover: members browse by content type.
- Request/apply/respond: members comment/react/vote per interaction mode.
- Approve/reject: admins moderate posts/comments.
- Complete/expire: poll closes; post can be locked or archived.

### 8. Architecture Notes

- Moderation concern: per-community and per-post interaction rules must both be enforced.
- Visibility rule: post discoverability follows community membership/visibility policy.
- Hackathon caution: advanced per-post rule combinations can create edge cases; keep combinations limited in MVP.

### 9. MVP Scope Recommendation

- Include: post creation, reactions, comments, simple interaction mode toggle, basic moderation.
- Post-MVP: golden comments with rewards, rich poll variants, advanced anonymity behavior.

### 10. Candidate Data Model Shape

- `Post`: shared content unit.
- `PostInteractionMode`: interaction constraint descriptor.
- `Comment`: textual response.
- `Reaction`: lightweight response.
- `Poll` (optional): vote structure.
- `GoldenComment` (optional): admin highlight.

---

## 6. Pings

### 1. Purpose

- Pings are urgent, short-lived community help alerts.
- They exist for immediate mobilization and quick visibility.
- They solve time-sensitive requests that do not fit events or services.

### 2. Architectural Role

- Role: **Core domain**.
- Depends on: Communities (feature enablement), Verification (creator eligibility), optional Location.
- Depended on by: urgent assistance workflows and community trust perception.

### 3. Main Domain Entities

- `Ping`: urgent request object.
- `PingResponse`: lightweight “WILL HELP” signal.
- `PingExpiryPolicy`: rule for automatic closure/expiration.
- `PingQuota` (optional): anti-spam frequency guard.

### 4. State and Lifecycle

- Ping lifecycle: `active` -> `resolved/expired`.
- Response lifecycle: `expressed` -> `withdrawn` (optional).
- Rule: pings are short-lived and must expire quickly.
- Rule: only verified users can create pings.
- Rule: pings available only in communities where enabled.

### 5. Permissions and Actors

- `Verified member`: can create ping in eligible community.
- `Member`: can respond with “WILL HELP” and view response count.
- `Admin`: can remove misuse and tune ping settings.
- Boundary: response is intent to help, not assignment to a structured workflow.

### 6. Relationships and Boundaries

- Ping belongs to one community.
- Ping may contain location context for urgency.
- Boundary: ping is urgent and short-lived; not for non-urgent matching (Services) and not for scheduled attendance (Events).
- Boundary: ping interaction is intentionally lightweight, unlike application-based services.

### 7. Core User Flows

- Create: verified member posts urgent ping.
- Discover: members see active pings in community feed.
- Request/apply/respond: member taps “WILL HELP”; count updates.
- Approve/reject: generally no per-response approval in MVP; admin can moderate abuse.
- Complete/expire: ping auto-expires or sender marks resolved.

### 8. Architecture Notes

- Trust boundary: verified-only creation reduces abuse in urgent channel.
- Visibility rule: only active pings should be prominently surfaced.
- Discoverability: response count supports collective coordination.
- Hackathon caution: avoid complex dispatch/escalation systems in MVP.

### 9. MVP Scope Recommendation

- Include: ping enable toggle per community, verified-only creation, WILL HELP responses, response count, auto-expire.
- Post-MVP: advanced throttling, geofenced ping audiences, urgency ranking.

### 10. Candidate Data Model Shape

- `Ping`: urgent help request.
- `PingResponse`: member willingness signal.
- `PingExpiryPolicy`: short-lived lifecycle rule.
- `PingQuota` (optional): anti-spam constraints.

---

## 7. Services

### 1. Purpose

- Services are non-urgent, structured help requests with applicant selection.
- They exist for planned assistance where requester chooses a helper.
- They solve needs that are too structured for posts and not urgent enough for pings.

### 2. Architectural Role

- Role: **Core domain**.
- Depends on: Communities (ownership/moderation), Profiles (optional helper context).
- Depended on by: trust loop through completion and mutual review.

### 3. Main Domain Entities

- `Service`: non-urgent request owned by one creator in one community.
- `ServiceApplication`: helper application to a service.
- `ServiceSelection`: creator decision selecting one helper.
- `ServiceCoordination`: private follow-up context after acceptance.
- `ServiceReview`: post-completion feedback artifact.

### 4. State and Lifecycle

- Service lifecycle: `open` -> `in_selection` -> `matched` -> `completed/cancelled`.
- Application lifecycle: `submitted` -> `accepted/rejected/withdrawn`.
- Review lifecycle: `available` -> `submitted`.
- Rule: service belongs to one community.
- Rule: creator selects one helper in MVP.

### 5. Permissions and Actors

- `Creator/requester`: creates service, reviews applications, accepts one helper, closes/completes.
- `Applicant/helper`: applies and coordinates if selected.
- `Admin`: moderate misuse or policy violations.
- Boundary: acceptance is creator-driven, not first-come or admin-assigned by default.

### 6. Relationships and Boundaries

- Ownership: service is community-owned context + creator-managed selection.
- Discovery: appears both in source community and dedicated Services section.
- Boundary: service is non-urgent and structured; do not allow service flows to mimic event attendance or ping urgency.
- Boundary: one selected helper in MVP keeps workflow distinct and simple.

### 7. Core User Flows

- Create: requester posts service with category/mode/preferences.
- Discover: users browse service feed globally and in community context.
- Request/apply/respond: applicants submit help applications.
- Approve/reject: creator accepts one applicant and rejects/halts others.
- Complete/expire: service marked completed; one-time reviews become available.

### 8. Architecture Notes

- Moderation point: service quality and misuse should be community-moderated.
- Visibility rule: dedicated Services section is a discoverability surface, not ownership transfer.
- Trust concern: lightweight post-completion review supports future selection confidence.
- Hackathon caution: avoid multi-helper workflows and negotiation-heavy state machines in MVP.

### 9. MVP Scope Recommendation

- Include: service creation, applications, single-helper selection, close/completion, one-time bilateral review.
- Post-MVP: multiple helpers, recommendation/ranking, richer scheduling and milestone tracking.

### 10. Candidate Data Model Shape

- `Service`: structured help request.
- `ServiceApplication`: applicant intent object.
- `ServiceSelection`: accepted helper decision.
- `ServiceCoordination`: private matched interaction context.
- `ServiceReview`: completion feedback artifact.

---

## System-wide Architecture Summary

- The architecture is community-centric: communities define trust, moderation, and visibility boundaries.
- Content domains are intentionally distinct:
  - Posts = share content.
  - Events = scheduled moderated participation.
  - Pings = urgent short-lived verified alerts.
  - Services = non-urgent structured helper selection.
- Profiles and Verification/Location are enabling capabilities, not primary content domains.
- Cross-community behavior is tightly scoped: only Events are shareable across communities, and only via target-admin approval.

## MVP Cut Recommendation

- Build first: Communities (membership/moderation toggles), Posts (basic interactions), Events (origin + participation requests + approval), Pings (verified-only + expire + `WILL HELP`), Services (single-helper selection), Profiles (onboarding answers + visibility), Verification flag (simple trust gate), Riddle-based lightweight discovery (show users how many people answered similarly and allow friend requests).
- Defer to post-MVP: advanced matching, complex event roles, map-based social view, deep reputation systems, complex anonymity and anti-abuse automation, recommendation algorithms based on long-term profile scoring.

### Lightweight Social Discovery in MVP

After answering a riddle, users may see how many other members gave the same or a similar answer. If those members allow discovery, the user can view them and send a friend request.

This should remain a lightweight discovery feature rather than a full matching system. In MVP, it is enough to:

- compare answer similarity within the same riddle
- show a small set or count of similar responders
- allow friend requests only when profile visibility allows it

## Ambiguities That Still Need Product Decisions

- Should community admins or only owners create new admins? - Owners
- Should anonymous participation be enabled per community or per content type? - Per community
- For events shared across communities, who can edit event details after share approval? - You can change the details, no problems
- For pings, can creators manually close early, or only auto-expire? - creators can manually close
- For services, should creator be allowed to reopen after selecting and then cancelling a helper? - allow reopen
- What is the exact review policy scope: private/internal only or user-visible reputation? - user visible reputation
