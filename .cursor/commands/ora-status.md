# Ora Status Check

Check the status of all Ora agents and tasks for the prayermap project.

## Status Report

### 1. Query Agent Registry
```sql
SELECT agent_name, status, last_heartbeat,
       NOW() - last_heartbeat as time_since_heartbeat
FROM ora_prayermap.agents
ORDER BY agent_name;
```

### 2. Query Active Tasks
```sql
SELECT id, type, priority, title, assigned_to, status,
       NOW() - created_at as age
FROM ora_prayermap.tasks
WHERE status NOT IN ('completed', 'approved')
ORDER BY
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
    END;
```

### 3. Check File System
Scan directories:
- `.ora/projects/prayermap/agents/*/inbox/` - Pending tasks
- `.ora/projects/prayermap/agents/*/outbox/` - Agent messages
- `.ora/projects/prayermap/director/escalations/` - Blockers

### 4. Generate Status Report

```markdown
## Ora Status Report - {timestamp}

### System Health
- PostgreSQL: {connected/error}
- Pinecone: {connected/error}
- Slack: {connected/error}

### Agent Status
| Agent | Status | Task | Last Seen |
|-------|--------|------|-----------|
| implementation-agent-01 | 🟢 Active | task-xxx | 2m ago |
| qa-agent-01 | 🟡 Idle | - | 5m ago |
| research-agent-01 | 🔴 Offline | - | 2h ago |

### Task Summary
- Total Active: {count}
- Critical: {count}
- High: {count}
- Blocked: {count}

### Task Details
#### Critical Priority
- {task-id}: {title} ({status})

#### High Priority
- {task-id}: {title} ({status})

### Blockers Requiring Attention
- {task-id}: {blocker description}

### Recent Completions (Last Hour)
- {task-id}: {title} ✅
```

## Quick Actions
After reviewing status:
- `/ora-task` - Create new task
- `/ora-review` - Full director review
- Check specific agent: `cat .ora/projects/prayermap/agents/{agent}/outbox/*.json`
