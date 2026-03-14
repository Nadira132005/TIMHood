# Community Engagement App — INIT

I want to build a community engagement app for a hackathon.

The app is centered around **communities**, where people can interact through **posts**, **events**, **pings**, and **services**, while also discovering others through lightweight profile-based social features.

---

## 1. Communities

Communities are groups created by users[^1] with configurable interaction rules and engagement features.

They are meant to feel more interactive than traditional broadcast-style groups by allowing members to participate, discover each other, and build trust around shared interests or shared local context.

Within a community, admins can enable:

- posts
- events
- polls
- pings
- community-specific engagement settings

Community members should be able to:

- react to posts and comments
- reply to posts depending on community rules
- vote in polls
- browse community content by type (posts, events, pings)
- receive invitations to join communities

Admins should be able to configure:

- whether the community is open to join or uses a waiting room[^2]
- whether members can publish directly or must request approval
- how replies behave on posts:
  - fully allowed
  - limited to one reply per user
  - disabled
- whether pings are enabled in that community
- whether the daily riddle feature is enabled in that community

Communities should support both:

- **public participation**, where the member is visible as themselves
- **anonymous participation**, where the member can interact without exposing their public identity inside that community

Some posts may support special interaction modes, such as:

- limited replies per user
- poll-only interaction
- reactions only

Admins may also highlight especially valuable comments as **golden comments**, which are pinned above others and may optionally be rewarded with points.

### Community social layer

Communities should make it easier for users to notice and connect with other relevant members. For example:

- see which friends are attending an event
- discover members with similar profile answers or riddle responses
- identify active or high-contributing members through points or recognition

---

## 2. Profiles

User profiles help turn the app from a content feed into a social discovery experience.

During onboarding, each user is shown three random personality questions. These should be lightweight, playful, and non-sensitive.

Question styles include:

- **Strict A/B choices or harmless debates**
  - “Is a hotdog technically a sandwich?”
  - “Standing up the second the airplane lands: efficient or chaotic?”

- **Harmless consumer, food, or pop-culture preferences**
  - “The ultimate road trip snack is…”
  - “If I could only eat one local Timișoara pastry forever, it would be…”

- **Absurd hypotheticals**
  - “In a high-stakes rock-paper-scissors tournament, my opening move is always…”
  - “If there was a mafia boss in town, he would surely hide at…”

These questions should draw from themes such as:

- domestic chaos and chores
- digital communication
- grocery shopping, cooking, and fast food
- city living, public transit, and local weather

The app should:

- save these answers in the user profile
- allow users to make selected answers public
- allow users to answer more questions later
- use these answers to create playful social discovery features

### Riddles and matching

Communities may optionally enable a **daily riddle / puzzle** feature.

This feature allows members to:

- answer a daily community riddle
- compare their answer with others
- see which friends responded similarly
- search other members’ public responses
- optionally make their own answer public

There can also be daily riddles for broader interest categories such as:

- math
- football
- art
- science
- computer science

Users should also be able to create their own riddles and send them to friends.

Profile answers and riddle responses can later support experiences like:

- suggesting potential friends
- highlighting members with similar answers
- showing compatibility around shared humor, habits, or interests

---

## 3. Verification and Location

Users may verify themselves during registration through ID verification[^3]. Verified users unlock additional trust-sensitive features across the app.

Verified users may also be suggested to join special communities that depend on stronger trust or location-based eligibility[^4].

The app should include an **open events** discovery section where users can browse public events and filter them by:

- topic
- rough location closeness

### Optional stretch feature

If there is time left, the app may include a map-based view of public events, similar to a lightweight social map.

This could show:

- open events on a map
- friends attending those events
- visual distinctions for participant types if the event supports roles

---

## 4. Events

Events are one of the core pillars of the app because they connect digital communities to real-world participation.

An event:

- belongs to one **origin community**
- is created by an admin of that origin community
- can be **shared into other communities**
- becomes visible in other communities only after admin approval from those communities

This means an event has one true home, but may be distributed across multiple communities when appropriate.

### Event participation

Events are **not** first-come, first-served.

Users do not directly join events. Instead, they:

- view an event
- send a **request to participate**

Participation requests must be reviewed and accepted by admins.

This makes events feel moderated and intentional, especially when communities care about relevance, trust, or limited space.

### Event features

An event should contain:

- title
- description
- location
- start time
- end time

Events may also optionally include simple participant roles, such as:

- participant
- volunteer
- helper
- photographer

If roles are enabled, users request participation for a specific role, and admins approve those requests.

Users should be able to see:

- how many people are attending
- whether friends are attending
- which community the event originated from
- in which other communities the event is visible

### Public events

Some events may be marked as **public** so they appear in the broader event discovery section, while still remaining tied to their origin community.

---

## 5. Posts

Posts are static pieces of content published inside communities.

They may represent:

- announcements
- news
- blog-style updates
- community questions
- polls

A post should contain:

- title
- description
- author
- date

Depending on configuration, a post may support:

- reactions only
- limited replies
- one reply per user
- poll interaction

Posts exist only inside communities and help keep each community active between events and other interactions.

---

## 6. Pings

A ping is an urgent request for immediate help sent inside a community.

Pings are designed for short-lived, high-attention situations and should feel very different from both posts and services.

Examples:

- asking for immediate help nearby
- requesting quick support in a local context
- alerting a trusted small community about an urgent need

### Ping rules

Pings are:

- only available in communities that explicitly allow them
- only creatable by verified users
- limited in frequency to reduce spam[^5]

This means large broad communities may disable pings, while smaller, more local or trust-based communities may choose to enable them.

### Ping content

A ping contains:

- title
- short description
- exact or GPS-derived location

### Ping interaction

Community members can respond to a ping with a lightweight **WILL HELP** action.

This allows the person who sent the ping to quickly understand:

- that the ping has been seen
- who is willing to help
- how many other people have also responded

That response count helps others decide whether more help is still needed or whether enough people have already mobilized.

Pings should be short-lived and expire quickly.

---

## 7. Services

Services are structured, non-urgent requests for help posted **within a community**.

They are inspired by community help groups such as tutoring or volunteering groups, where people post a need and others apply to help.

Services should also appear in a dedicated **Services** section for easier discovery, but each service still belongs to one community.

This keeps services socially grounded and easier to moderate, while still making them easy to browse.

### Service purpose

A service is appropriate when:

- the request is not urgent
- the creator wants to choose who helps
- the interaction is more structured than a casual post
- the request does not make sense as an event

Examples:

- tutoring
- creative help
- study assistance
- volunteer help
- practical support scheduled for later

### Service content

A service should contain:

- title
- description
- category
- preferred mode:
  - online
  - in person
  - flexible
- optional preferred location
- optional preferred time interval

### Service interaction

Users browsing a service can:

- apply for the service

The creator of the service can:

- review applications
- accept one applicant
- reject others
- stop receiving further requests
- mark the service as completed

Once a user is accepted, the service can move into a private coordination flow.

After completion:

- the creator can review the volunteer
- the volunteer can review the creator once

This creates a lightweight trust loop for future community interactions.

---

## Product boundaries

To keep the experience clear:

- **Posts** are for sharing content
- **Events** are for gathering people around a scheduled activity
- **Pings** are for urgent immediate help in communities that allow them
- **Services** are for non-urgent structured requests where the creator selects a helper

These four content types should feel clearly different in the product.

---

[^1]: Communities may be created by admins, verified users, or whichever rule is chosen for the MVP.

[^2]: Waiting room is optional per community; some communities may be freely joinable.

[^3]: Verification is intended as a trust feature for access to sensitive actions such as pings or special communities.

[^4]: Some communities may depend on stronger location or trust requirements.

[^5]: Example: a small monthly limit per user per community.
