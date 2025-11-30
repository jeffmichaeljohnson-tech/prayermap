# Datadog PostgreSQL Setup - Step by Step (Your Project)

## ✅ What We Know

- **Supabase Project**: `oomrmfhvsxtxgqqthisz`
- **Database Host**: `db.oomrmfhvsxtxgqqthisz.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`

## ⚠️ What We Need

1. **Datadog user password** (you'll create this)
2. **Update config file** with real values

---

## Step 1: Create Datadog User in Supabase (5 minutes)

### 1.1 Open Supabase SQL Editor

1. Go to https://app.supabase.com
2. Select your project: **oomrmfhvsxtxgqqthisz**
3. Click **SQL Editor** in left sidebar
4. Click **"New query"**

### 1.2 Run This SQL

Copy and paste this entire block:

```sql
-- Create datadog user with password
-- ⚠️ REPLACE 'YourSecurePassword123!' with your own strong password
CREATE USER datadog WITH PASSWORD 'YourSecurePassword123!';

-- Grant monitoring permissions
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;

-- Grant access to all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;

-- Verify user was created
SELECT usename FROM pg_user WHERE usename = 'datadog';
```

### 1.3 Important

- **Replace** `'YourSecurePassword123!'` with your own strong password
- **Save this password** - you'll need it in Step 2
- Click **"Run"** button
- You should see: `datadog` in the results

**✅ Done?** Write down your password: `________________________`

---

## Step 2: Update Datadog Config File (2 minutes)

### 2.1 Edit the Config File

```bash
nano /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
```

### 2.2 Replace the Placeholder Values

Find these lines:
```yaml
  - host: <YOUR_SUPABASE_HOST>
    password: '<YOUR_DATADOG_PASSWORD>'
```

Replace with:
```yaml
  - host: db.oomrmfhvsxtxgqqthisz.supabase.co
    password: 'YourSecurePassword123!'  # ← Use the password from Step 1
```

### 2.3 Complete Config Should Look Like This

```yaml
init_config:

instances:
  - host: db.oomrmfhvsxtxgqqthisz.supabase.co
    port: 5432
    username: datadog
    password: 'YourSecurePassword123!'  # ← Your password from Step 1
    dbname: postgres
    disable_generic_tags: true
    relations:
      - relation_regex: .*
    tags:
      - 'env:production'
      - 'service:prayermap'
      - 'database:supabase'
      - 'hosting:managed'
```

### 2.4 Save and Exit

- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

---

## Step 3: Verify Config & Restart Agent (2 minutes)

### 3.1 Check Config Syntax

```bash
sudo datadog-agent configcheck
```

**Expected**: `Configuration is valid` or no errors

### 3.2 Restart Agent

```bash
sudo launchctl stop com.datadoghq.agent
sudo launchctl start com.datadoghq.agent
```

### 3.3 Wait 10 Seconds

```bash
sleep 10
```

### 3.4 Check Status

```bash
sudo datadog-agent status | grep -A 15 "postgres"
```

**✅ Success looks like**:
```
postgres
-------
  Instance ID: postgres:abc123...
  Configuration Source: file:/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
  Total Runs: 5
  Metric Samples: Last Run: 45, Total: 225
  Service Checks: Last Run: 1, Total: 5
  Average Execution Time: 234ms
```

**❌ Problem looks like**:
```
postgres
-------
  ERROR: Cannot connect to Postgres
```

---

## Step 4: Test Connection Manually (Optional but Recommended)

### 4.1 Install psql (if needed)

```bash
brew install postgresql
```

### 4.2 Test Connection

```bash
psql -h db.oomrmfhvsxtxgqqthisz.supabase.co \
     -U datadog \
     -d postgres \
     -c "SELECT * FROM pg_stat_database LIMIT 1;"
```

**When prompted**, enter the password from Step 1.

**✅ Success**: Shows database statistics  
**❌ Failure**: Shows connection error

---

## Step 5: Verify in Datadog Dashboard (2 minutes)

### 5.1 Check PostgreSQL Metrics

1. Go to https://app.datadoghq.com
2. Navigate to **Infrastructure** → **PostgreSQL**
3. Wait 5-10 minutes for metrics to appear
4. You should see:
   - Database connections graph
   - Query performance metrics
   - Table sizes

### 5.2 Check Agent Status

1. Go to **Infrastructure** → **Agent**
2. Find your Mac in the list
3. Click on it
4. Look for **PostgreSQL** integration
5. Should show **"OK"** status

---

## 🔧 Troubleshooting

### Problem: "Cannot connect to Postgres"

**Check**:
1. Password is correct (no typos)
2. Host is correct: `db.oomrmfhvsxtxgqqthisz.supabase.co`
3. Port is `5432` (not 6543)

**Test manually**:
```bash
psql -h db.oomrmfhvsxtxgqqthisz.supabase.co -U datadog -d postgres
```

### Problem: "Permission denied"

**Re-run grants in Supabase SQL Editor**:
```sql
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
```

### Problem: "No metrics appearing"

**Check**:
1. Wait 5-10 minutes (metrics take time)
2. Check agent is running: `sudo datadog-agent status`
3. Check agent logs: `sudo tail -f /opt/datadog-agent/logs/agent.log`

---

## ✅ Final Checklist

- [ ] Created `datadog` user in Supabase SQL Editor
- [ ] Updated `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml` with:
  - [ ] Host: `db.oomrmfhvsxtxgqqthisz.supabase.co`
  - [ ] Password: (your password)
- [ ] Verified config: `sudo datadog-agent configcheck`
- [ ] Restarted agent: `sudo launchctl restart com.datadoghq.agent`
- [ ] Checked status: `sudo datadog-agent status | grep postgres`
- [ ] See metrics in Datadog dashboard

---

## 📞 Need Help?

**Paste the output of**:
```bash
sudo datadog-agent status | grep -A 20 "postgres"
```

This shows exactly what's wrong.

---

**Ready? Start with Step 1!**

