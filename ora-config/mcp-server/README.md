# Ora MCP Server

MCP server giving Claude direct access to Ora infrastructure.

## Tools

- `ora_tasks_list` - List tasks from PostgreSQL
- `ora_tasks_create` - Create new task
- `ora_tasks_update` - Update task status
- `ora_decisions_log` - Log director decisions
- `ora_slack_post` - Post to Slack

## Setup

```bash
cd ora-config/mcp-server
npm install
```

## Configuration

Reads from `../../.env`:
```
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
SLACK_BOT_TOKEN=xoxb-your-token
```

## Cursor Integration

Add to MCP settings:
```json
{
  "mcpServers": {
    "ora": {
      "command": "node",
      "args": ["/path/to/prayermap/ora-config/mcp-server/index.js"]
    }
  }
}
```
