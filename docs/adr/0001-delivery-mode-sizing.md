# 0001: Delivery mode sizing (`brief`, `standard`, `extended`)

## Status

accepted — 2026-11-18

## Context

The SDLC guidance defines `delivery_mode` as a routing decision about how much specification work needs, carried separately from `snc_tier`, and states it is never an authorization. Without that separation, risk tier or diff size could be read as a proxy for specification depth: a one-line authorization change would look small even though it is `extended`, and low-risk work would inherit formal documents it does not need.

## Decision

Carry `delivery_mode` (`brief`, `standard`, `extended`) in task and handoff metadata, separately from `snc_tier`. `brief`: approved low-risk, nonsensitive work with outcome, scope fence, owner, observable criteria, approval reference, and verification lane; the approved ticket or session report replaces PRD/SRS, with no new formal IDs and no walkthrough. `standard`: focused PRD; SRS only when technical decisions or contracts need explicit design. `extended`: risk-triggered by a sensitive surface, migration, capacity, failure analysis, or cross-team contract; standard core plus the triggered contracts and the applicable human gate.

Rules that hold in every mode: a sensitive change is always `extended` and keeps its technical design and human approval; a missing mode is a routing decision from approved evidence and risk, never automatic permission for the brief path; material scope growth reopens only the affected slices; diff size never selects the mode.

## Consequences

Low-risk work stops paying document tax while high-risk work cannot claim brevity. Mode is metadata, not authorization: it grants no spend, exposure, or release consent. Misclassification is recoverable by reopening the affected slices under the stronger mode.

## Source

[SDLC workflow quick reference, Delivery Mode](../sdlc-workflow-quick-reference.md).
