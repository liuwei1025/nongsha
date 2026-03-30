# TODOS

## Add A Lightweight Interruption Surface After Core Loop Validation

**What:** Add a lightweight interruption surface after the single-user loop is proven, such as a reminder, home-screen widget, or system share/quick-capture entry point.

**Why:** The product's core failure mode happens when the user drifts into games, short videos, or other low-value defaults. If the app only works when the user remembers to open it, it may miss the exact moment it is meant to save.

**Pros:**
- Moves the product closer to the real user moment it is trying to win
- Creates a testable path for re-engagement and habit formation
- Lets the team validate whether "timely presence" matters as much as ranking quality

**Cons:**
- Adds interruption timing, permission, and annoyance risk
- Expands product surface before the core recommendation loop is fully validated
- Can amplify bad recommendations if the underlying ranking is still weak

**Context:** The current approved plan deliberately compresses v1 to `capture -> recommend -> act -> report` and keeps reminders/widgets out of scope. This TODO exists so that the idea is not lost once the core loop is stable and trusted.

**Depends on / blocked by:** Blocked on validating the core single-user loop first. The recommendation engine needs believable output before the app should proactively interrupt the user.

## Add Cloud Sync And Device Recovery After Local Model Stabilizes

**What:** Add lightweight cloud sync and multi-device recovery after the local-first model, event snapshots, and reparse rules stabilize.

**Why:** The v1 plan correctly chooses local-first PWA to keep blast radius low. But if the product becomes genuinely useful, device boundaries will become a real user pain quickly. Phone and desktop drifting apart is the kind of problem that makes a useful tool feel unreliable.

**Pros:**
- Reduces risk of data loss and device lock-in
- Makes the app feel dependable instead of disposable
- Creates a cleaner foundation for later selective sharing or collaboration

**Cons:**
- Introduces accounts, sync conflicts, merge rules, and privacy complexity
- Expands operational and security surface area before the core loop is fully proven
- Can amplify data-model mistakes across devices if introduced too early

**Context:** The current approved plan intentionally defers accounts and sync to protect the first version from overbuilding. This TODO captures the next major infrastructure step once the single-user loop is trusted and the local data model has settled.

**Depends on / blocked by:** Blocked on stabilizing local data structures, recommendation/execution event snapshots, and explicit reparse merge precedence. Sync before those are stable will multiply confusion across devices.
