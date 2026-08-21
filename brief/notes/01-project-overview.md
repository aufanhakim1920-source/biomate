# Biomate — Project Overview

> **Aufan's brief, verbatim, 2026-08-21.** This is the authoritative statement of
> what Biomate is. Where it disagrees with my reading of the whiteboard photos in
> `brief/mocks/`, **this wins.**

---

## Project Overview

The goal of this project is to develop an outdoor app that promotes people to
meet new people and get out on a hike. The app should implement a matching system
similar to that of Tinder, cycling through different hiking groups with similar
interests and preferences. When someone matches with a certain group, they are
thrown into a group chat with similar members that also want to go on the hike.

**Level:** Easy to Medium

**Type of Project:** Outdoors App, Social App, Tinder matching

## Key Features

### Milestone 1: Main Matching System

Generate a Tinder Link Matching system that allows a user to swipe left and swipe
right. Users should be able to add preferences to what they're initially
interested in before going through the search feature — this includes but is not
limited to dog friendly hikes, the difficulty, hiking experience, camping, gender
and photography.

### Milestone 2: Chat Feature & Functionalities

On this hiking page, they should be able to access a button that sends them to a
calendar availability page similar to that of Lettuce Meet and a button that
enables the user to check the agenda of the hike. This includes what they'll do
on the hike and important stop points.

### Milestone 3: Trail Recorder interface

Similar to that of Ultra Trails and Strava, include a feature that enables the
user to log the progress of the trail that they hike along with the group. This
allow the user to track how far they've gone, how long it's taken, the number of
unique people they hiked with and general statistics associated with ultra trail.

## Client Information

The clients are hikers or people that want to get outdoors of all experience
levels. The aim of the app is to promote people to have greater social cohesion
by building an app that prioritizes the social feature first compared to other
systems using the matching system.

---

## ⚠️ What this corrected in my reading of the whiteboards

I read the six whiteboard photos before this arrived and got one thing
importantly wrong, worth recording so it does not get re-derived:

**You swipe on GROUPS, not on people.** "Cycling through different hiking
groups… when someone matches with a certain group, they are thrown into a group
chat." I had read the whiteboard's Tinder reference as person-to-person matching
with a 1:1 chat unlocking. It is not — a match drops you into an existing
**group** chat with several other members.

That is not a cosmetic difference. It changes the core data model: a `group`
is a first-class row that people join, the chat is per-group and not per-pair,
availability is collected across N members rather than 2, and "number of unique
people you hiked with" is only computable because participation is group-shaped.

Everything else in my whiteboard reading held up — the preference set, the
agenda page (purpose / activities / stop points), the home map with nearby
agendas, the five-icon bottom nav, and gamification (streak, levels, badges you
choose to display) as explicitly **secondary**.

## Still open

- **Phone or desktop?** The wireframes are phone-shaped, so I am assuming
  mobile-first web unless the Figma says otherwise.
- **Login.** The whiteboard's step 1 is "login", but we chose anonymous auth,
  which has no login screen. Same auth system either way — adding a real login is
  a screen, not a rework.
- **Group creation.** The brief says you swipe on groups; it does not say who
  makes them. Do users create a hike and others swipe onto it, or are groups
  formed automatically from people with matching preferences? These are different
  products and different schemas.
- Teammates' GitHub usernames, deadline, and who is building what.

Tracked in `../../docs/OPEN-QUESTIONS.md`.
