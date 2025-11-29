# Create Ora Task

Create a task for an Ora agent. This command generates a properly formatted task JSON file.

## Usage
`/ora-task <agent-type> <task-title>`

## Agent Types
- `implementation` - Code changes, new features, bug fixes
- `research` - Investigation, best practices, comparisons
- `qa` - Testing, validation, bug reporting
- `documentation` - Docs, guides, API documentation
- `infrastructure` - DevOps, deployment, CI/CD

## Task Creation Workflow

1. **Analyze the request** and determine:
   - Which agent type should handle this
   - Priority level (critical/high/medium/low)
   - Acceptance criteria
   - Related files and context

2. **Query memory** for relevant context:
   - Similar past tasks from Pinecone
   - Related decisions
   - Current agent workload from PostgreSQL

3. **Generate task JSON** with:
   - Unique ID: `task-{YYYYMMDD}-{sequence}`
   - Full context from codebase analysis
   - Clear acceptance criteria
   - File references

4. **Output the task** in the proper format

## Template
```json
{
  "id": "task-YYYYMMDD-XXX",
  "type": "{agent-type}",
  "priority": "{priority}",
  "title": "{title}",
  "description": "{detailed description}",
  "context": {
    "files": ["relevant/file/paths.ts"],
    "references": ["relevant documentation"],
    "dependencies": []
  },
  "acceptance_criteria": [
    "Criterion 1",
    "Criterion 2"
  ],
  "assigned_to": "{agent-type}-agent-01",
  "assigned_at": "{ISO timestamp}",
  "status": "assigned"
}
```

## Example
```
/ora-task implementation Add skeleton loading to PrayerCard
```

Creates a task for the implementation agent to add a skeleton loading state to the PrayerCard component.
