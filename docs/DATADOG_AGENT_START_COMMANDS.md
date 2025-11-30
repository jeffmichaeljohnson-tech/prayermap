# Datadog Agent - Start and Verify Commands

## ✅ Config File Status

Your config file is correctly set up with:
- ✅ Host: `db.oomrmfhvsxtxgqqthisz.supabase.co`
- ✅ Username: `datadog`
- ✅ Password: (configured)

## 🔧 Start Agent and Check Status

Run these commands **one at a time**:

### 1. Start the Agent

```bash
sudo launchctl start com.datadoghq.agent
```

### 2. Wait for Agent to Start (15-30 seconds)

```bash
sleep 20
```

### 3. Check Agent Status

```bash
sudo datadog-agent status | grep -A 20 "postgres"
```

**Expected Output** (if working):
```
postgres
-------
  Instance ID: postgres:abc123...
  Configuration Source: file:/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
  Total Runs: X
  Metric Samples: Last Run: XX
  Service Checks: Last Run: 1
```

**If you see errors**, check the logs:

```bash
sudo tail -50 /opt/datadog-agent/logs/agent.log | grep -i "postgres\|error"
```

### 4. Verify Config Syntax

```bash
sudo datadog-agent configcheck | grep -i postgres
```

---

## 🔍 Troubleshooting

### Problem: "Connection refused" or agent not responding

**Solution**: Agent might not be fully started yet

```bash
# Check if agent process is running
ps aux | grep datadog-agent | grep -v grep

# If not running, start it
sudo launchctl start com.datadoghq.agent

# Wait longer (30 seconds)
sleep 30

# Check again
sudo datadog-agent status
```

### Problem: "Cannot connect to Postgres"

**Check**:
1. Password is correct
2. Host is correct: `db.oomrmfhvsxtxgqqthisz.supabase.co`
3. Port is `5432`

**Test connection manually**:
```bash
psql -h db.oomrmfhvsxtxgqqthisz.supabase.co -U datadog -d postgres -c "SELECT 1;"
```

### Problem: PostgreSQL integration not showing in status

**Check config file exists**:
```bash
ls -la /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
```

**Check config syntax**:
```bash
sudo datadog-agent configcheck
```

**Restart agent**:
```bash
sudo launchctl stop com.datadoghq.agent
sudo launchctl start com.datadoghq.agent
sleep 20
sudo datadog-agent status | grep postgres
```

---

## ✅ Success Checklist

- [ ] Agent is running: `ps aux | grep datadog-agent`
- [ ] Config file exists: `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml`
- [ ] Config syntax valid: `sudo datadog-agent configcheck`
- [ ] PostgreSQL shows in status: `sudo datadog-agent status | grep postgres`
- [ ] Metrics appearing: Check Datadog dashboard after 5-10 minutes

---

## 📊 Check Datadog Dashboard

After agent is running:

1. Go to https://app.datadoghq.com
2. Navigate to **Infrastructure** → **PostgreSQL**
3. Wait 5-10 minutes for metrics to appear
4. You should see database metrics

---

**Run the commands above and share the output!**

