# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Added a dedicated `/insights` route and supporting analytics API/query plumbing for instance-wide usage visibility.
- Added a weekly-season leaderboard experiment with a composite weekly score, season highlights, and lightweight team quests.
- Added an experiments tracker in `docs/experiments.md` to keep paused and planned product work visible.

### Changed
- Changed the leaderboard direction from a pure aggregate ranking toward a weekly-first motivation loop while keeping all-time status available.
- Changed the product structure so leaderboard and insights can evolve as separate surfaces instead of sharing one overloaded homepage.
