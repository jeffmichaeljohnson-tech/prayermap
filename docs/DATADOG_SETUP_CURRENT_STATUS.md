# Datadog Setup - Current Status & Next Steps

## ✅ What's Already Done

1. **Datadog Agent**: ✅ Installed and running
2. **API Key**: ✅ Configured (`36ac05712491e836a146bce8e1348402`)
3. **Site**: ✅ Set to `datadoghq.com` (default)
4. **PostgreSQL Config Template**: ✅ Created at `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml`

## ⚠️ What Needs to Be Done

### Step 1: Get Supabase Connection Info (5 minutes)

1. Go to https://app.supabase.com
2. Select your **PrayerMap project**
3. Navigate to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click **"URI"** tab
6. Copy the connection string

**Example connection string**:
```
postgresql://postgres:yourPassword@db.abc123xyz.supabase.co:5432/postgres
```

**From this, extract**:
- **Host**: `db.abc123xyz.supabase.co` (everything between `@` and `:5432`)
- **Port**: `5432`
- **Database**: `postgres`

**Action**: Paste your Supabase host here: `________________________`

---

### Step 2: Create Datadog User in Supabase (5 minutes)

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Create datadog user
-- ⚠️ REPLACE <STRONG_PASSWORD> with a secure password (save it!)
CREATE USER datadog WITH PASSWORD '<STRONG_PASSWORD>';

-- Grant monitoring permissions
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;

-- Grant access to all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;

-- Verify user was created
SELECT usename FROM pg_user WHERE usename = 'datadog';
```

4. **Replace `<STRONG_PASSWORD>`** with a strong password
5. Click **"Run"**
6. **Save the password** - you'll need it next!

**Action**: What password did you set? (save it securely): `________________________`

---

### Step 3: Update PostgreSQL Config File (2 minutes)

Edit the config file:

```bash
nano /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
```

**Replace these two values**:
1. `<YOUR_SUPABASE_HOST>` → Your host from Step 1
2. `<YOUR_DATADOG_PASSWORD>` → Password from Step 2

**Example** (if your host is `db.oomrmfhvsxtxgqqthisz.supabase.co`):

```yaml
init_config:

instances:
  - host: db.oomrmfhvsxtxgqqthisz.supabase.co
    port: 5432
    username: datadog
    password: 'MySecurePassword123!'
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

**Save and exit** (Ctrl+X, then Y, then Enter)

---

### Step 4: Verify Config & Restart Agent (2 minutes)

```bash
# Check config syntax
sudo datadog-agent configcheck

# Should show: "Configuration is valid"

# Restart agent
sudo launchctl stop com.datadoghq.agent
sudo launchctl start com.datadoghq.agent

# Wait 10 seconds
sleep 10

# Check status
sudo datadog-agent status | grep -A 15 "postgres"
```

**Expected Output**:
```
postgres
-------
  Instance ID: postgres:abc123...
  Configuration Source: file:/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
  Total Runs: X
  Metric Samples: Last Run: XX
  Service Checks: Last Run: 1
```

**✅ Success**: If you see "Metric Samples: Last Run: XX" (where XX > 0)

**❌ Problem**: If you see "ERROR" or "Cannot connect"

---

### Step 5: Verify in Datadog Dashboard (2 minutes)

1. Go to https://app.datadoghq.com
2. Navigate to **Infrastructure** → **PostgreSQL**
3. You should see:
   - Database overview
   - Query performance graphs
   - Connection metrics

**If you see metrics**: ✅ Setup complete!

**If you don't see metrics**: Wait 5-10 minutes, then check again

---

## 🔧 Troubleshooting

### "Cannot connect to Postgres"

**Test connection manually**:
```bash
# Install psql if needed
brew install postgresql

# Test connection (replace with your values)
psql -h db.<YOUR_HOST>.supabase.co -U datadog -d postgres -c "SELECT 1;"
```

**If this fails**:
- Check password is correct
- Check host is correct
- Check port is 5432 (not 6543)

### "Permission denied"

**Re-run grants in Supabase SQL Editor**:
```sql
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
```

### "No metrics appearing"

**Check**:
1. Wait 5-10 minutes (metrics can take time)
2. Check agent status: `sudo datadog-agent status`
3. Check agent logs: `sudo tail -f /opt/datadog-agent/logs/agent.log`

---

## 📋 Quick Checklist

- [ ] Got Supabase host from connection string
- [ ] Created `datadog` user in Supabase SQL Editor
- [ ] Updated `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml` with host and password
- [ ] Verified config: `sudo datadog-agent configcheck`
- [ ] Restarted agent: `sudo launchctl restart com.datadoghq.agent`
- [ ] Checked status: `sudo datadog-agent status | grep postgres`
- [ ] Verified metrics in Datadog dashboard

---

## 🎯 Current Config File Location

**PostgreSQL Config**: `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml`

**Edit it with**:
```bash
nano /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
```

---

## 📞 Need Help?

**Paste the output of**:
```bash
sudo datadog-agent status | grep -A 20 "postgres"
```

This will show exactly what's wrong.

---

**Ready to continue? Start with Step 1 above!**

