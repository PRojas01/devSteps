# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-05

### Fixed

- Clean build output before compilation to prevent stale files from being packaged.
- Align package metadata and repository URL with the published GitHub repository.
- Add the missing `--force` option to `devsteps init`.
- Generate beginner scaffolds that satisfy DS-v1 file checks and avoid broken default scripts.
- Align DevControl launcher commands with the current DevControl CLI.
- Update generated documentation templates so onboarding starts from install, scaffold, agent injection and validation.
- Correct the repository `devsteps.yaml` identity and add the missing review step before release.
- Document the tested DevControl setup sequence: `git init`, `sp-devcontrol init`, `sp-devcontrol inject`, then `sp-devcontrol project:check`.
- Define the two supported user interaction channels: direct CLI and agentic editor through injected instructions.
- Add published setup guides for Windows, Linux, Codex, Claude Code, VS Code, Cursor, Windsurf, OpenCode and MCP.

### Added

- Production-ready README with beginner onboarding and distribution modes.
- Canonical `docs/requirements.md` and `docs/architecture.md`.
- New beginner and publishing guides.
- Initial ADR for production positioning.
- MIT license.
- Base GitHub Actions workflow for build, typecheck and tests.

### Changed

- Documentation generator now supports canonical docs and beginner/publishing guides.
- Package metadata now includes publish-oriented fields and release scripts.
