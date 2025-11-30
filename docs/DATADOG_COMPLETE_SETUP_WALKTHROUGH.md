# Complete Datadog Setup Walkthrough - Step by Step

> **Interactive guide** to set up Datadog for PrayerMap. We'll verify each step before moving to the next.

---

## 🎯 What We're Setting Up

1. **Datadog RUM** (Real User Monitoring) - Frontend monitoring ✅ Already configured in code
2. **Datadog Agent** - Backend/database monitoring ⚠️ Needs configuration
3. **PostgreSQL Integration** - Database performance monitoring ⚠️ Needs setup

---

## ✅ Current Status Check

**Agent Status**: ✅ Installed and running  
**Config Location**: `/opt/datadog-agent/etc/datadog.yaml`  
**PostgreSQL Config**: ⚠️ Not configured yet

---

## Step 1: Get Your Datadog API Key

### Where to Find It

1. Go to https://app.datadoghq.com
2. Click your **profile icon** (bottom left)
3. Select **Organization Settings**
4. Go to **API Keys** tab
5. Copy your **API Key** (starts with something like `abc123...`)

**⚠️ Important**: This is different from:
- ❌ Application ID (for RUM)
- ❌ Client Token (for RUM)
- ✅ **API Key** (for Agent)

### Verify You Have It

**Question**: Do you have your Datadog API Key? (Yes/No)

---

## Step 2: Configure Datadog Agent Main Config

### Check Current Config

Let's see what's already configured:

```bash
# Check if API key is set
grep -E "api_key|site" /opt/datadog-agent/etc/datadog.yaml
```

### Set API Key

**Option A: Edit Config File Directly**

```bash
# Backup current config
sudo cp /opt/datadog-agent/etc/datadog.yaml /opt/datadog-agent/etc/datadog.yaml.backup

# Edit config
sudo nano /opt/datadog-agent/etc/datadog.yaml
```

Look for these lines and update them:

```yaml
## @param api_key - string - required
## Your Datadog API key
#
api_key: <YOUR_API_KEY_HERE>

## @param site - string - optional - default: datadoghq.com
## The site of the Datadog intake to send Agent data to.
## Defaults to 'datadoghq.com', set to 'datadoghq.eu' for EU, 'us3.datadoghq.com' for US3,
## 'us5.datadoghq.com' for US5, 'ap1.datadoghq.com' for AP1, 'ddog-gov.com' for US1-FED
#
site: datadoghq.com

## @param logs_enabled - boolean - optional - default: false
## Enable log collection
#
logs_enabled: true
```

**Option B: Use Environment Variable (Easier)**

```bash
# Set API key as environment variable
export DD_API_KEY="<YOUR_API_KEY_HERE>"
export DD_SITE="datadoghq.com"

# Restart agent (it will pick up env vars)
sudo launchctl stop com.datadoghq.agent
sudo launchctl start com.datadoghq.agent
```

### Verify API Key is Set

```bash
# Check agent status
sudo datadog-agent status | grep -A 5 "API Keys status"
```

**Expected Output**: Should show "API key ending in ..." (last 4 characters)

**Question**: Did the API key get set correctly? (Yes/No)

---

## Step 3: Get Supabase Database Connection Info

### From Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your **PrayerMap project**
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click **"URI"** tab (NOT "Session mode" or "Transaction mode")
6. Copy the connection string

**Format should be**:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Extract Connection Details

From that connection string, extract:
- **Host**: `db.[PROJECT-REF].supabase.co` (everything between `@` and `:5432`)
- **Port**: `5432` (direct connection, NOT 6543)
- **Database**: `postgres`
- **Username**: `postgres` (for now, we'll create `datadog` user next)

**Example**:
```
Connection String: postgresql://postgres:myPassword123@db.abc123xyz.supabase.co:5432/postgres

Host: db.abc123xyz.supabase.co
Port: 5432
Database: postgres
Username: postgres
```

**Question**: What's your Supabase host? (paste it here)

---

## Step 4: Create Datadog Read-Only User in Supabase

### Open Supabase SQL Editor

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**

### Run This SQL Script

Copy and paste this entire script (from `supabase/datadog_user_setup.sql`):

```sql
-- Create datadog user with strong password
-- ⚠️ REPLACE <STRONG_PASSWORD_HERE> with a secure password
CREATE USER datadog WITH PASSWORD '<STRONG_PASSWORD_HERE>';

-- Grant monitoring permissions
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;

-- Grant access to all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;

-- Verify user was created
SELECT usename FROM pg_user WHERE usename = 'datadog';
```

**⚠️ Important**: 
- Replace `<STRONG_PASSWORD_HERE>` with a strong password
- **SAVE THIS PASSWORD** - you'll need it for the Agent config
- Example password: `Datadog2024!Monitoring`

### Verify User Creation

Run this query:

```sql
SELECT 
    usename,
    usecreatedb,
    usesuper
FROM pg_user 
WHERE usename = 'datadog';
```

**Expected Output**: Should show one row with `usename = 'datadog'`, `usecreatedb = f`, `usesuper = f`

**Question**: Did the user get created successfully? (Yes/No)

---

## Step 5: Test Database Connection

### Test from Your Mac

```bash
# Install psql if you don't have it
brew install postgresql

# Test connection (replace with your values)
psql -h db.<YOUR_PROJECT_REF>.supabase.co \
     -U datadog \
     -d postgres \
     -c "SELECT * FROM pg_stat_database LIMIT 1;"
```

When prompted, enter the password you set in Step 4.

**Expected Output**: Should show database statistics, not an error.

**Question**: Did the connection test work? (Yes/No)

---

## Step 6: Create PostgreSQL Configuration File

### Create Config Directory

```bash
# Create postgres config directory
sudo mkdir -p /opt/datadog-agent/etc/conf.d/postgres.d

# Set permissions
sudo chown $(whoami):staff /opt/datadog-agent/etc/conf.d/postgres.d
```

### Create Configuration File

Create `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml`:

```bash
sudo nano /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
```

### Paste This Configuration

**⚠️ Replace these values**:
- `<YOUR_SUPABASE_HOST>` - From Step 3
- `<DATADOG_PASSWORD>` - Password from Step 4

```yaml
init_config:

instances:
  ## Supabase Database Connection
  - host: <YOUR_SUPABASE_HOST>  # e.g., db.abc123xyz.supabase.co
    port: 5432                   # Direct connection port
    username: datadog            # User we created in Step 4
    password: '<DATADOG_PASSWORD>'  # Password from Step 4
    dbname: postgres             # Default database
    
    # Disable generic tags
    disable_generic_tags: true
    
    # Monitor all tables
    relations:
      - relation_regex: .*
    
    # Custom tags for filtering in Datadog
    tags:
      - 'env:production'
      - 'service:prayermap'
      - 'database:supabase'
      - 'hosting:managed'
```

### Example (PrayerMap-Specific)

If your Supabase host is `db.oomrmfhvsxtxgqqthisz.supabase.co`:

```yaml
init_config:

instances:
  - host: db.oomrmfhvsxtxgqqthisz.supabase.co
    port: 5432
    username: datadog
    password: 'YourSecurePassword123!'
    dbname: postgres
    disable_generic_tags: true
    relations:
      - relation_regex: .*
    tags:
      - 'env:production'
      - 'service:prayermap'
      - 'database:supabase'
```

### Verify Config File Syntax

```bash
# Check YAML syntax
sudo datadog-agent configcheck
```

**Expected Output**: Should show "Configuration is valid" or list any errors.

**Question**: Did the config file get created correctly? (Yes/No)

---

## Step 7: Restart Datadog Agent

### Restart Agent

```bash
# Stop agent
sudo launchctl stop com.datadoghq.agent

# Start agent
sudo launchctl start com.datadoghq.agent

# Wait a few seconds, then check status
sleep 5
sudo datadog-agent status
```

### Check PostgreSQL Integration Status

Look for this section in the status output:

```
postgres
-------
  Instance ID: postgres:abc123...
  Configuration Source: file:/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
  Total Runs: X
  Metric Samples: Last Run: XX, Total: XXX
  Service Checks: Last Run: 1, Total: X
  Average Execution Time: XXXms
```

**✅ Good Signs**:
- Shows "Instance ID" (means it's running)
- Shows "Metric Samples: Last Run: XX" (means it's collecting data)
- Shows "Service Checks: Last Run: 1" (means connection is working)

**❌ Bad Signs**:
- Shows "ERROR" or "FAILED"
- Shows "Cannot connect to Postgres"
- Shows "0 Metric Samples"

**Question**: What does the PostgreSQL status show? (paste the output)

---

## Step 8: Verify in Datadog Dashboard

### Check PostgreSQL Metrics

1. Go to https://app.datadoghq.com
2. Navigate to **Infrastructure** → **PostgreSQL**
3. You should see:
   - Database overview
   - Query performance
   - Connection metrics
   - Table sizes

### Check Agent Status

1. Go to **Infrastructure** → **Agent**
2. Find your host (your Mac)
3. Check that PostgreSQL integration shows as "OK"

**Question**: Do you see PostgreSQL metrics in the dashboard? (Yes/No)

---

## Step 9: Set Up Frontend RUM (If Not Done)

### Check Current Setup

Do you have these environment variables in your `.env` file?

```bash
# Check if RUM is configured
grep -E "DATADOG" .env
```

### Add RUM Configuration

If not set up, add to `.env`:

```bash
# Datadog RUM (Frontend Monitoring)
VITE_DATADOG_APP_ID=your_application_id_here
VITE_DATADOG_CLIENT_TOKEN=your_client_token_here
VITE_DATADOG_ENABLE_DEV=true
```

**Where to Find These**:
1. Go to Datadog Dashboard → **RUM** → **Application Settings**
2. Create new application: "PrayerMap"
3. Copy **Application ID** and **Client Token**

### Verify RUM Works

1. Start your app: `npm run dev`
2. Open browser console
3. Look for: `✅ Datadog RUM initialized`
4. Go to Datadog → **RUM** → **Explorer**
5. You should see sessions and page views

**Question**: Is RUM working? (Yes/No)

---

## 🔧 Troubleshooting Common Issues

### Issue 1: "Cannot connect to Postgres"

**Symptoms**: Agent status shows connection error

**Solutions**:
```bash
# Test connection manually
psql -h db.<YOUR_HOST>.supabase.co -U datadog -d postgres

# Check firewall (port 5432 should be open)
nc -zv db.<YOUR_HOST>.supabase.co 5432

# Verify credentials in config
cat /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml | grep -E "host|username|password"
```

### Issue 2: "Permission denied"

**Symptoms**: Connection works but can't read statistics

**Solutions**:
```sql
-- Re-run grants in Supabase SQL Editor
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
```

### Issue 3: "No metrics appearing"

**Symptoms**: Agent shows success but no data in dashboard

**Solutions**:
```bash
# Check API key is set
sudo datadog-agent status | grep "API key"

# Check agent is sending data
sudo datadog-agent status | grep "Forwarder"

# Wait 5-10 minutes (metrics can take time to appear)
```

### Issue 4: "Config file not found"

**Symptoms**: Agent doesn't see PostgreSQL config

**Solutions**:
```bash
# Verify file exists
ls -la /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml

# Check permissions
sudo chmod 644 /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml

# Verify config syntax
sudo datadog-agent configcheck
```

---

## ✅ Final Checklist

Before marking setup complete, verify:

- [ ] Datadog API Key is set in agent config
- [ ] Supabase `datadog` user created successfully
- [ ] PostgreSQL config file exists at `/opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml`
- [ ] Agent status shows PostgreSQL integration running
- [ ] Can see PostgreSQL metrics in Datadog dashboard
- [ ] RUM environment variables set (if using frontend monitoring)
- [ ] Test connection works: `psql -h db.<HOST> -U datadog -d postgres`

---

## 📊 What You Should See

### In Datadog Dashboard

1. **Infrastructure → PostgreSQL**:
   - Database connections graph
   - Query performance metrics
   - Table sizes
   - Slow queries

2. **Infrastructure → Agent**:
   - Your Mac listed as a host
   - PostgreSQL integration showing "OK"

3. **RUM → Explorer** (if RUM configured):
   - User sessions
   - Page views
   - Errors (if any)

---

## 🎯 Next Steps

Once setup is complete:

1. **Set up alerts** for critical metrics (slow queries, connection errors)
2. **Create custom dashboards** for PrayerMap-specific metrics
3. **Monitor regularly** to catch performance issues early
4. **Review slow queries** weekly to optimize database performance

---

## 📞 Need Help?

If you're stuck at any step:

1. **Check the error message** - paste it here
2. **Check agent logs**: `sudo tail -f /opt/datadog-agent/logs/agent.log`
3. **Verify each step** - don't skip verification
4. **Check Supabase connection** - test manually with psql first

---

**Let's go through this step by step. Which step are you on, and what error are you seeing?**

