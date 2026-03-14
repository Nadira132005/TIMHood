# Backend Schema (ExpressJS + MongoDB)

This schema is aligned to `INIT.md` and `ARCHITECTURE.md` and preserves the product boundaries:
- Posts = content sharing.
- Events = scheduled activities with moderated participation.
- Pings = urgent short-lived help requests.
- Services = non-urgent structured help requests with applicant selection.

## 1. Schema Conventions

### 1.1 Common document fields
All primary collections should include:

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `created_at` | Date | Creation time |
| `updated_at` | Date | Last update time |

Optional in moderation-sensitive collections:

| Field | Type | Notes |
|---|---|---|
| `deleted_at` | Date/null | Soft-delete marker |
| `version` | Number | Optimistic concurrency counter |

### 1.2 Reference pattern
- Cross-collection relations use ObjectId references.
- Core ownership references are explicit (`community_id`, `creator_user_id`, `origin_community_id`).
- Derived read fields (counts, names) may be denormalized for performance.

### 1.3 Time and geospatial standards
- Store timestamps in UTC.
- Location points use GeoJSON `Point`.
- Use `2dsphere` indexes for geospatial queries.

## 2. Enum Catalog

### 2.1 Roles and membership
- `community_role`: `owner`, `admin`, `member`
- `membership_status`: `invited`, `pending`, `active`, `blocked`, `left`

### 2.2 Visibility and identity
- `community_visibility`: `public`, `private`
- `answer_visibility`: `public`, `friends`, `private`
- `author_visibility`: `public`, `anonymous`

### 2.3 Moderation statuses
- `decision_status`: `submitted`, `approved`, `rejected`, `withdrawn`, `expired`
- `content_moderation_status`: `published`, `hidden`, `removed`, `archived`

### 2.4 Domain lifecycles
- `community_state`: `active`, `restricted`, `archived`
- `event_state`: `draft`, `published`, `ongoing`, `completed`, `cancelled`
- `event_share_state`: `requested`, `approved`, `rejected`, `revoked`
- `event_request_state`: `requested`, `accepted`, `rejected`, `withdrawn`, `cancelled`
- `ping_state`: `active`, `resolved`, `expired`, `removed`
- `service_state`: `open`, `in_selection`, `matched`, `completed`, `cancelled`, `expired`
- `service_application_state`: `submitted`, `accepted`, `rejected`, `withdrawn`
- `riddle_state`: `scheduled`, `active`, `closed`, `cancelled`
- `verification_state`: `unverified`, `verified`

### 2.5 Interaction modes
- `reply_mode`: `fully_allowed`, `one_reply_per_user`, `disabled`
- `post_interaction_mode`: `normal`, `reactions_only`, `limited_replies`, `one_reply_per_user`, `poll_only`
- `publish_mode`: `direct`, `approval_required`
- `service_mode`: `online`, `in_person`, `flexible`
- `community_access_mode`: `open`, `restricted`

### 2.6 Location and verification enums
- `location_input_source`: `pin_drop`, `maps_place_input`
- `location_match_scope`: `home`, `work`, `home_or_work`

## 3. Identity, Profile, Verification

## 3.1 `users`
Purpose: account identity and trust flags.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `email` | String | yes | unique, normalized |
| `phone` | String | no | optional |
| `password_hash` | String | yes | or external auth credential reference |
| `account_status` | String | yes | `active`, `disabled` |
| `document_number_encrypted` | String | no | required to become verified |
| `document_number_hash` | String | no | deterministic hash for uniqueness checks |
| `verification_state` | String | yes | from enum |
| `verified_at` | Date | no | set when `verification_state=verified` |
| `verification_locked_at` | Date | no | one-time verification lock timestamp |
| `last_seen_at` | Date | no | activity marker |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `email`
- unique sparse: `document_number_hash`
- index: `verification_state`

## 3.2 `profiles`
Purpose: user-owned social profile for discovery.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | unique reference to `users` |
| `display_name` | String | yes | |
| `handle` | String | no | unique if used |
| `avatar_url` | String | no | |
| `bio` | String | no | short text |
| `visibility_level` | String | yes | `public`, `friends`, `private` |
| `interests` | Array<String> | no | |
| `onboarding_completed` | Boolean | yes | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `user_id`
- unique sparse: `handle`

## 3.3 `friendships`
Purpose: support friend-based discovery and attendance overlays.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `user_low_id` | ObjectId | yes | deterministic lower ObjectId |
| `user_high_id` | ObjectId | yes | deterministic higher ObjectId |
| `requested_by_user_id` | ObjectId | yes | |
| `status` | String | yes | `pending`, `accepted`, `blocked` |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(user_low_id, user_high_id)`
- index: `(status, user_low_id)`
- index: `(status, user_high_id)`

## 3.4 `questions`
Purpose: onboarding and profile-extension question bank.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `scope` | String | yes | `onboarding`, `profile_extension`, `riddle_template` |
| `style` | String | yes | `ab`, `preference`, `absurd` |
| `topic` | String | yes | aligned with INIT topics |
| `prompt` | String | yes | |
| `answer_format` | String | yes | `single_choice`, `multi_choice`, `short_text` |
| `options` | Array<String> | no | required for choice formats |
| `source` | String | yes | `editorial`, `ai` |
| `is_active` | Boolean | yes | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(scope, is_active)`
- index: `(topic, is_active)`

## 3.5 `profile_answers`
Purpose: user answers with per-answer visibility.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `question_id` | ObjectId | yes | |
| `answer_payload` | Mixed | yes | option ids or text |
| `visibility` | String | yes | `public`, `friends`, `private` |
| `origin` | String | yes | `onboarding`, `manual`, `riddle` |
| `riddle_id` | ObjectId | no | set when origin is `riddle` |
| `community_id` | ObjectId | no | set for community riddle context |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(user_id, created_at desc)`
- index: `(question_id, user_id)`
- index: `(visibility, community_id)`

## 3.6 `user_locations`
Purpose: user-provided spatial anchors for community access policies and discovery filters.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | unique |
| `home_location_point` | GeoJSON Point | yes | required for spatially restricted communities |
| `home_location_label` | String | no | user-readable address text |
| `home_place_id` | String | no | Google Maps place id if available |
| `home_input_source` | String | yes | `pin_drop`, `maps_place_input` |
| `work_location_point` | GeoJSON Point | no | optional |
| `work_location_label` | String | no | optional |
| `work_place_id` | String | no | optional Google Maps place id |
| `work_input_source` | String | no | `pin_drop`, `maps_place_input` |
| `is_active` | Boolean | yes | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `user_id`
- 2dsphere: `home_location_point`
- 2dsphere sparse: `work_location_point`

## 4. Community Domain

## 4.1 `communities`
Purpose: primary trust and moderation container.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `name` | String | yes | |
| `slug` | String | yes | unique |
| `description` | String | no | |
| `created_by_user_id` | ObjectId | yes | |
| `visibility` | String | yes | `public`, `private` |
| `state` | String | yes | `active`, `restricted`, `archived` |
| `members_count` | Number | yes | denormalized |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `slug`
- index: `(visibility, state)`

## 4.2 `community_settings`
Purpose: configurable behavior and feature toggles.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | unique |
| `waiting_room_enabled` | Boolean | yes | |
| `access_mode` | String | yes | `open`, `restricted` |
| `publish_mode` | String | yes | `direct`, `approval_required` |
| `reply_mode` | String | yes | from enum |
| `allow_anonymous_participation` | Boolean | yes | |
| `posts_enabled` | Boolean | yes | |
| `events_enabled` | Boolean | yes | |
| `polls_enabled` | Boolean | yes | |
| `pings_enabled` | Boolean | yes | |
| `services_enabled` | Boolean | yes | |
| `daily_riddle_enabled` | Boolean | yes | |
| `ping_monthly_limit_per_user` | Number | no | anti-spam |
| `updated_by_user_id` | ObjectId | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `community_id`

## 4.3 `community_memberships`
Purpose: role/status per user in each community.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `role` | String | yes | `owner`, `admin`, `member` |
| `status` | String | yes | from membership enum |
| `anonymous_alias` | String | no | for community-scoped anonymity |
| `invited_by_user_id` | ObjectId | no | |
| `approved_by_user_id` | ObjectId | no | |
| `joined_at` | Date | no | when active |
| `left_at` | Date | no | when left |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(community_id, user_id)`
- index: `(user_id, status)`
- index: `(community_id, role, status)`

## 4.4 `community_invites`
Purpose: explicit invitations to join.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `inviter_user_id` | ObjectId | yes | |
| `invitee_user_id` | ObjectId | yes | |
| `status` | String | yes | `pending`, `accepted`, `declined`, `expired`, `revoked` |
| `expires_at` | Date | yes | |
| `responded_at` | Date | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(invitee_user_id, status, created_at desc)`
- index: `(community_id, status)`

## 4.5 `join_requests`
Purpose: waiting-room membership approvals.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `requester_user_id` | ObjectId | yes | |
| `message` | String | no | |
| `status` | String | yes | from decision enum |
| `decided_by_user_id` | ObjectId | no | |
| `decided_at` | Date | no | |
| `decision_reason` | String | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(community_id, status, created_at asc)`
- index: `(requester_user_id, status)`

## 4.6 `publish_requests`
Purpose: member-submitted content pending approval.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `requester_user_id` | ObjectId | yes | |
| `content_type` | String | yes | `post`, `event`, `ping`, `service` |
| `payload_snapshot` | Mixed | yes | immutable submission payload |
| `status` | String | yes | from decision enum |
| `created_content_type` | String | no | populated when approved |
| `created_content_id` | ObjectId | no | populated when approved |
| `decided_by_user_id` | ObjectId | no | |
| `decided_at` | Date | no | |
| `decision_reason` | String | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(community_id, status, created_at asc)`
- index: `(requester_user_id, status, created_at desc)`

## 4.7 `community_access_policies`
Purpose: trust + spatial eligibility for restricted communities.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | unique |
| `requires_verification` | Boolean | yes | |
| `location_match_scope` | String | yes | `home`, `work`, `home_or_work` |
| `eligibility_mode` | String | yes | `none`, `city`, `radius`, `polygon` |
| `city_codes` | Array<String> | no | used when mode `city` |
| `center_point` | GeoJSON Point | no | used when mode `radius` |
| `radius_km` | Number | no | used when mode `radius` |
| `polygon` | GeoJSON Polygon | no | used when mode `polygon` |
| `is_active` | Boolean | yes | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `community_id`
- 2dsphere: `center_point`
- 2dsphere: `polygon`

## 4.8 `community_recognitions` (optional / post-MVP)
Purpose: points and recognition events (golden comments, attendance awards).

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `source_type` | String | yes | `golden_comment`, `event_attendance`, `admin_award` |
| `source_id` | ObjectId | yes | |
| `points_delta` | Number | yes | positive or negative |
| `note` | String | no | |
| `awarded_by_user_id` | ObjectId | yes | |
| `awarded_at` | Date | yes | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(community_id, user_id, awarded_at desc)`

## 5. Posts Domain

## 5.1 `posts`
Purpose: static community content.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `author_user_id` | ObjectId | yes | |
| `author_visibility` | String | yes | `public`, `anonymous` |
| `title` | String | yes | |
| `description` | String | yes | |
| `content_kind` | String | yes | `announcement`, `news`, `blog`, `question`, `poll` |
| `interaction_mode` | String | yes | from post interaction enum |
| `max_replies_per_user` | Number | no | used when `limited_replies` |
| `status` | String | yes | content moderation status |
| `reactions_count` | Number | yes | denormalized |
| `comments_count` | Number | yes | denormalized |
| `poll_id` | ObjectId | no | set when poll post |
| `published_at` | Date | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(community_id, status, created_at desc)`
- index: `(author_user_id, created_at desc)`

## 5.2 `post_comments`
Purpose: replies on posts.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `post_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `author_user_id` | ObjectId | yes | |
| `author_visibility` | String | yes | |
| `parent_comment_id` | ObjectId | no | nullable for root comments |
| `body` | String | yes | |
| `status` | String | yes | `visible`, `hidden`, `removed` |
| `is_golden` | Boolean | yes | |
| `golden_by_user_id` | ObjectId | no | |
| `golden_at` | Date | no | |
| `reactions_count` | Number | yes | denormalized |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(post_id, status, created_at asc)`
- index: `(community_id, created_at desc)`
- index: `(post_id, author_user_id, created_at asc)` for reply-limit checks

## 5.3 `post_reactions`
Purpose: reactions on posts and comments.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `target_type` | String | yes | `post`, `comment` |
| `target_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `reaction_type` | String | yes | app-defined reaction keys |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(target_type, target_id, user_id)` one active reaction per user/target
- index: `(target_type, target_id, reaction_type)`

## 5.4 `polls`
Purpose: poll object linked to a post.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `post_id` | ObjectId | yes | unique |
| `question` | String | yes | |
| `options` | Array<Object> | yes | each option has `option_id`, `label` |
| `allow_multi_select` | Boolean | yes | |
| `status` | String | yes | `open`, `closed` |
| `closes_at` | Date | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `post_id`
- index: `(status, closes_at)`

## 5.5 `poll_votes`
Purpose: user vote per poll.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `poll_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `option_ids` | Array<String> | yes | selected option ids |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(poll_id, user_id)`
- index: `(poll_id, created_at asc)`

## 6. Events Domain

## 6.1 `events`
Purpose: scheduled activities with one origin community.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `origin_community_id` | ObjectId | yes | immutable after publish |
| `creator_user_id` | ObjectId | yes | must be admin/owner of origin community |
| `title` | String | yes | |
| `description` | String | yes | |
| `topic` | String | no | used in discovery filters |
| `location_point` | GeoJSON Point | yes | |
| `location_label` | String | yes | |
| `start_at` | Date | yes | |
| `end_at` | Date | yes | |
| `is_public` | Boolean | yes | open discovery toggle |
| `status` | String | yes | from event state enum |
| `roles_enabled` | Boolean | yes | |
| `participants_count` | Number | yes | accepted participants |
| `requests_count` | Number | yes | pending + handled requests count |
| `visible_in_community_ids` | Array<ObjectId> | yes | includes origin and approved shares |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(origin_community_id, status, start_at asc)`
- index: `(is_public, status, start_at asc)`
- 2dsphere: `location_point`
- index: `(visible_in_community_ids, status, start_at asc)`

## 6.2 `event_roles`
Purpose: optional role slots for event participation.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `event_id` | ObjectId | yes | |
| `name` | String | yes | example: participant, helper |
| `capacity` | Number | no | nullable means unlimited |
| `accepted_count` | Number | yes | denormalized |
| `status` | String | yes | `active`, `closed` |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(event_id, name)`
- index: `(event_id, status)`

## 6.3 `event_shares`
Purpose: visibility requests from origin event to target communities.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `event_id` | ObjectId | yes | |
| `origin_community_id` | ObjectId | yes | |
| `target_community_id` | ObjectId | yes | |
| `requested_by_user_id` | ObjectId | yes | origin admin |
| `status` | String | yes | from event share enum |
| `decided_by_user_id` | ObjectId | no | target community admin |
| `decided_at` | Date | no | |
| `decision_reason` | String | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(event_id, target_community_id)`
- index: `(target_community_id, status, created_at asc)`

## 6.4 `event_participation_requests`
Purpose: moderated event join requests.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `event_id` | ObjectId | yes | |
| `requester_user_id` | ObjectId | yes | |
| `requested_role_id` | ObjectId | no | nullable if roles disabled |
| `message` | String | no | optional context |
| `status` | String | yes | from event request enum |
| `decided_by_user_id` | ObjectId | no | event admin |
| `decided_at` | Date | no | |
| `decision_reason` | String | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(event_id, status, created_at asc)`
- index: `(requester_user_id, status, created_at desc)`
- unique logical rule: one active request per `(event_id, requester_user_id)`

## 6.5 `event_participants`
Purpose: accepted participants and attendance state.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `event_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `role_id` | ObjectId | no | |
| `source_request_id` | ObjectId | yes | accepted request ref |
| `status` | String | yes | `accepted`, `checked_in`, `cancelled` |
| `accepted_by_user_id` | ObjectId | yes | |
| `accepted_at` | Date | yes | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(event_id, user_id)`
- index: `(event_id, status)`
- index: `(user_id, status, accepted_at desc)`

## 7. Pings Domain

## 7.1 `pings`
Purpose: urgent short-lived community help request.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `creator_user_id` | ObjectId | yes | must be verified user |
| `title` | String | yes | |
| `description` | String | yes | short body |
| `location_point` | GeoJSON Point | yes | exact or GPS-derived |
| `location_label` | String | no | human-readable |
| `status` | String | yes | from ping state enum |
| `responses_count` | Number | yes | denormalized WILL HELP count |
| `expires_at` | Date | yes | short-lived expiry |
| `resolved_at` | Date | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(community_id, status, created_at desc)`
- index: `(creator_user_id, created_at desc)` for rate-limit checks
- 2dsphere: `location_point`
- TTL: `expires_at` for archival/delete policy

## 7.2 `ping_responses`
Purpose: member WILL HELP responses.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `ping_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `responder_user_id` | ObjectId | yes | |
| `status` | String | yes | `will_help`, `withdrawn` |
| `responded_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(ping_id, responder_user_id)`
- index: `(ping_id, status, responded_at asc)`

## 7.3 `ping_quota_usage` (optional)
Purpose: pre-aggregated anti-spam counters by month.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `year_month` | String | yes | `YYYY-MM` |
| `created_count` | Number | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(community_id, user_id, year_month)`

## 8. Services Domain

## 8.1 `services`
Purpose: non-urgent structured help request in one community.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | owner context |
| `creator_user_id` | ObjectId | yes | requester |
| `title` | String | yes | |
| `description` | String | yes | |
| `category` | String | yes | |
| `preferred_mode` | String | yes | from service mode enum |
| `preferred_location_label` | String | no | |
| `preferred_location_point` | GeoJSON Point | no | optional |
| `preferred_time_start` | Date | no | |
| `preferred_time_end` | Date | no | |
| `status` | String | yes | from service state enum |
| `accepts_new_applications` | Boolean | yes | |
| `applications_count` | Number | yes | denormalized |
| `selected_application_id` | ObjectId | no | MVP single helper |
| `selected_helper_user_id` | ObjectId | no | MVP single helper |
| `completed_at` | Date | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(community_id, status, created_at desc)`
- index: `(status, created_at desc)` for dedicated Services section
- 2dsphere sparse: `preferred_location_point`

## 8.2 `service_applications`
Purpose: users apply to help on a service.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `service_id` | ObjectId | yes | |
| `community_id` | ObjectId | yes | |
| `applicant_user_id` | ObjectId | yes | |
| `message` | String | no | |
| `status` | String | yes | from service application enum |
| `decided_by_user_id` | ObjectId | no | service creator/admin |
| `decided_at` | Date | no | |
| `decision_reason` | String | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(service_id, applicant_user_id)`
- index: `(service_id, status, created_at asc)`
- index: `(applicant_user_id, status, created_at desc)`

## 8.3 `service_reviews`
Purpose: one-time post-completion trust loop.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `service_id` | ObjectId | yes | |
| `reviewer_user_id` | ObjectId | yes | creator or selected helper |
| `reviewee_user_id` | ObjectId | yes | counterpart |
| `reviewer_role` | String | yes | `creator`, `helper` |
| `score` | Number | yes | bounded rating |
| `comment` | String | no | |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(service_id, reviewer_user_id)` one review per side
- index: `(reviewee_user_id, created_at desc)`

## 9. Riddles and Matching

## 9.1 `riddles`
Purpose: daily puzzle prompts in community or interest scope.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `creator_type` | String | yes | `system`, `user` |
| `creator_user_id` | ObjectId | no | required for user-created |
| `scope` | String | yes | `community`, `interest`, `friend_direct` |
| `community_id` | ObjectId | no | for community scope |
| `interest_tag` | String | no | for interest scope |
| `prompt` | String | yes | |
| `answer_format` | String | yes | choice/text |
| `options` | Array<String> | no | for choice formats |
| `status` | String | yes | from riddle state enum |
| `publish_at` | Date | yes | |
| `close_at` | Date | yes | |
| `moderation_status` | String | yes | `approved`, `rejected`, `pending` for user-created |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(scope, status, publish_at asc)`
- index: `(community_id, status, publish_at desc)`
- index: `(interest_tag, status, publish_at desc)`

## 9.2 `riddle_responses`
Purpose: user answers for riddles.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `riddle_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `answer_payload` | Mixed | yes | |
| `visibility` | String | yes | `public`, `friends`, `private` |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- unique: `(riddle_id, user_id)`
- index: `(riddle_id, visibility)`
- index: `(user_id, created_at desc)`

## 9.3 `compatibility_snapshots` (optional / post-MVP)
Purpose: cached soft-match scores for discovery.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | |
| `other_user_id` | ObjectId | yes | |
| `community_id` | ObjectId | no | optional scoped variant |
| `score` | Number | yes | |
| `explanation_keys` | Array<String> | yes | non-sensitive explanation tokens |
| `computed_at` | Date | yes | |
| `expires_at` | Date | yes | recompute threshold |

Indexes:
- unique: `(user_id, other_user_id, community_id)`
- index: `(user_id, community_id, score desc)`

## 10. Notifications and Audit

## 10.1 `notifications`
Purpose: workflow state updates to users.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `user_id` | ObjectId | yes | recipient |
| `type` | String | yes | domain event type |
| `actor_user_id` | ObjectId | no | initiator |
| `entity_type` | String | yes | `community`, `event`, `service`, etc. |
| `entity_id` | ObjectId | yes | |
| `payload` | Mixed | yes | compact UI payload |
| `read_at` | Date | no | null means unread |
| `created_at` | Date | yes | |
| `updated_at` | Date | yes | |

Indexes:
- index: `(user_id, read_at, created_at desc)`

## 10.2 `audit_logs`
Purpose: moderation and trust-sensitive action traceability.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `actor_user_id` | ObjectId | yes | who acted |
| `action_type` | String | yes | e.g. approve_join_request |
| `entity_type` | String | yes | target collection type |
| `entity_id` | ObjectId | yes | target id |
| `community_id` | ObjectId | no | set for community-scoped actions |
| `metadata` | Mixed | yes | decision reason, transition details |
| `created_at` | Date | yes | |

Indexes:
- index: `(community_id, created_at desc)`
- index: `(entity_type, entity_id, created_at desc)`
- index: `(actor_user_id, created_at desc)`

## 11. Query Projections (Read Models)

These collections are optional in MVP and can be replaced by on-demand queries.

## 11.1 `community_feed_items` (optional)
Purpose: flattened feed projection for posts, events, pings.

Key fields:
- `community_id`
- `item_type` (`post`, `event`, `ping`)
- `item_id`
- `published_at`
- `visibility_flags`

Primary index:
- `(community_id, published_at desc)`

## 11.2 `open_events_projection` (optional)
Purpose: public event discovery optimization.

Key fields:
- `event_id`
- `topic`
- `location_point`
- `start_at`
- `is_public`

Primary indexes:
- `(is_public, start_at asc)`
- `2dsphere(location_point)`

## 11.3 `services_discovery_projection` (optional)
Purpose: dedicated Services section listing.

Key fields:
- `service_id`
- `community_id`
- `category`
- `status`
- `created_at`

Primary index:
- `(status, created_at desc)`

## 12. Cross-Domain Invariants

- Rule: each Event has exactly one `origin_community_id`.
- Rule: Event visibility in another community requires approved `event_share`.
- Rule: Users never directly join events; they must create `event_participation_request`.
- Rule: `event_participant` can only be created from an accepted participation request.
- Rule: Ping creation requires `users.verification_state=verified` and `community_settings.pings_enabled=true`.
- Rule: Pings must have short `expires_at` and transition to `expired` automatically.
- Rule: each Service belongs to one `community_id` and must not be re-assigned cross-community.
- Rule: Service MVP allows one selected helper only (`selected_helper_user_id` singular).
- Rule: Posts/Events/Pings/Services are separate collections and should not collapse into one polymorphic write model.
- Rule: If `community_settings.publish_mode=approval_required`, member-authored content must pass through `publish_requests`.
- Rule: answer and riddle visibility controls must be enforced in read queries.
- Rule: Verification requires document number submission and is a one-time action.
- Rule: Once `users.verification_state=verified`, document number and verification state are immutable.
- Rule: Verification flow does not create dedicated verification trace/session records.
- Rule: `community_settings.access_mode=restricted` requires an active `community_access_policies` document.
- Rule: For restricted communities, eligibility checks use `user_locations` and policy `location_match_scope`.
- Rule: Open communities (`community_settings.access_mode=open`) bypass spatial eligibility checks.

## 13. State Transition Matrix (Authoritative)

### 13.1 Communities
- `communities.state`: `active -> restricted -> archived`
- `community_memberships.status`: `invited/pending -> active -> blocked/left`

### 13.2 Events
- `events.status`: `draft -> published -> ongoing -> completed/cancelled`
- `event_shares.status`: `requested -> approved/rejected -> revoked`
- `event_participation_requests.status`: `requested -> accepted/rejected/withdrawn`

### 13.3 Pings
- `pings.status`: `active -> resolved/expired -> removed`

### 13.4 Services
- `services.status`: `open -> in_selection -> matched -> completed/cancelled/expired`
- `service_applications.status`: `submitted -> accepted/rejected/withdrawn`

### 13.5 Posts and Riddles
- `posts.status`: `published -> hidden/removed/archived`
- `riddles.status`: `scheduled -> active -> closed/cancelled`

## 14. MVP vs Post-MVP Schema Cut

### 14.1 MVP required collections
- `users`
- `profiles`
- `questions`
- `profile_answers`
- `user_locations`
- `communities`
- `community_settings`
- `community_memberships`
- `community_invites`
- `join_requests`
- `publish_requests`
- `community_access_policies`
- `posts`
- `post_comments`
- `post_reactions`
- `polls`
- `poll_votes`
- `events`
- `event_shares`
- `event_participation_requests`
- `event_participants`
- `pings`
- `ping_responses`
- `services`
- `service_applications`
- `service_reviews`
- `riddles`
- `riddle_responses`
- `notifications`
- `audit_logs`

### 14.2 Post-MVP / optional collections
- `friendships` (if not needed day one)
- `community_recognitions`
- `ping_quota_usage`
- `compatibility_snapshots`
- projection collections (`community_feed_items`, `open_events_projection`, `services_discovery_projection`)
