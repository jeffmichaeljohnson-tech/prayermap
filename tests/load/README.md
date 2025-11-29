# Load Testing with K6

## Installation

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Running Tests

```bash
# Default run
k6 run tests/load/k6-prayers.js

# With custom VUs and duration
k6 run --vus 100 --duration 60s tests/load/k6-prayers.js

# With environment variables
k6 run -e SUPABASE_URL=https://xxx.supabase.co -e SUPABASE_ANON_KEY=xxx tests/load/k6-prayers.js
```

## Thresholds

- P95 response time: < 500ms
- Error rate: < 1%

## Interpreting Results

- **Good**: P95 < 200ms, Error rate < 0.1%
- **Acceptable**: P95 < 500ms, Error rate < 1%
- **Needs Work**: P95 > 500ms or Error rate > 1%
