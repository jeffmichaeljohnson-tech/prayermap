# Ora Director Review

Perform a 15-minute strategic review as the Ora Director.

## Review Process

### 1. Check Agent Status
Query PostgreSQL `ora_prayermap` schema:
- Active tasks and their status
- Agent heartbeats
- Blocked items

### 2. Review Completed Work
Check agent outbox directories for:
- Completion reports
- Progress updates
- Blocker notifications

### 3. Query Memory
Search Pinecone for:
- Recent decisions and their outcomes
- Patterns in completed work
- Recurring issues

### 4. Make Decisions
For each item requiring attention:
- Approve completed work
- Reassign blocked tasks
- Adjust priorities
- Create follow-up tasks

### 5. Update State
- Record decisions in PostgreSQL
- Store insights in Pinecone
- Post summary to Slack

## Review Template

```markdown
## Director Review - {timestamp}

### Agent Status
| Agent | Status | Current Task | Last Heartbeat |
|-------|--------|--------------|----------------|
| implementation-agent-01 | {status} | {task} | {time} |
| qa-agent-01 | {status} | {task} | {time} |

### Completed Since Last Review
- [ ] {task-id}: {description} - {outcome}

### Currently In Progress
- [ ] {task-id}: {description} - {progress}%

### Blockers
- [ ] {task-id}: {blocker description}
  - Resolution: {decision}

### Decisions Made
1. {decision} - Rationale: {why}

### New Tasks Created
- {task-id}: {description} → {agent}

### Memory Updates
- Stored: {what was stored in Pinecone}
- Updated: {PostgreSQL state changes}

### Slack Summary Posted
- Channel: #ora-prayermap-agents
- Key points: {summary}
```

## Frequency
Run this review every 15 minutes during active development sessions.
