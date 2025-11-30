# Datadog User Already Exists - Next Steps

## ✅ Good News!

The `datadog` user already exists, which means someone (or you) already created it. We just need to:

1. **Verify permissions** are correct
2. **Reset password** (if you don't know it)
3. **Update config file** with the password

---

## Step 1: Verify User Permissions (2 minutes)

### Run This in Supabase SQL Editor

Go to **Supabase Dashboard** → **SQL Editor** → **New query**, then run:

```sql
-- Check if user exists and has correct permissions
SELECT 
    usename,
    usecreatedb,
    usesuper,
    userepl
FROM pg_user 
WHERE usename = 'datadog';

-- Check granted roles (should show pg_monitor)
SELECT 
    r.rolname as role,
    m.rolname as member
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.roleid
JOIN pg_roles m ON am.member = m.oid
WHERE m.rolname = 'datadog';
```

**Expected Results**:
- `usename = 'datadog'`
- `usecreatedb = false` (should be false - read-only)
- `usesuper = false` (should be false - not superuser)
- `role = 'pg_monitor'` (should show this role)

**If you see `pg_monitor` role**: ✅ Permissions are good, proceed to Step 2

**If you DON'T see `pg_monitor` role**: Run this to fix it:

```sql
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;
```

---

## Step 2: Reset Password (If You Don't Know It)

### Option A: Reset Password (Recommended)

If you don't know the password, reset it:

```sql
-- Reset password for datadog user
ALTER USER datadog WITH PASSWORD 'YourNewSecurePassword123!';
```

**⚠️ Important**: 
- Use a strong password
- **Save this password** - you'll need it for the config file
- Wrap it in single quotes if it has special characters

### Option B: Use Existing Password

If you know the password, skip this step and use it in Step 3.

---

## Step 3: Test Connection (2 minutes)

### Test from Your Mac

```bash
# Install psql if needed
brew install postgresql

# Test connection (replace with your password)
psql -h db.oomrmfhvsxtxgqqthisz.supabase.co \
     -U datadog \
     -d postgres \
     -c "SELECT * FROM pg_stat_database LIMIT 1;"
```

**When prompted**, enter the password (either the existing one or the new one from Step 2).

**✅ Success**: Shows database statistics  
**❌ Failure**: Shows "password authentication failed" or connection error

---

## Step 4: Update Datadog Config File (2 minutes)

### Edit Config File

```bash
nano /opt/datadog-agent/etc/conf.d/postgres.d/conf.yaml
```

### Update These Values

Replace:
- `host: <YOUR_SUPABASE_HOST>` → `host: db.oomrmfhvsxtxgqqthisz.supabase.co`
- `password: '<YOUR_DATADOG_PASSWORD>'` → `password: 'YourPasswordHere'` (use password from Step 2)

**Complete config should look like**:

```yaml
init_config:

instances:
  - host: db.oomrmfhvsxtxgqqthisz.supabase.co
    port: 5432
    username: datadog
    password: 'YourPasswordHere'  # ← Your password (from Step 2 or existing)
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

**Save**: Ctrl+X, Y, Enter

---

## Step 5: Restart Agent & Verify (2 minutes)

```bash
# Check config syntax
sudo datadog-agent configcheck

# Restart agent
sudo launchctl stop com.datadoghq.agent
sudo launchctl start com.datadoghq.agent

# Wait 10 seconds
sleep 10

# Check status
sudo datadog-agent status | grep -A 15 "postgres"
```

**✅ Success looks like**:
```
postgres
-------
  Instance ID: postgres:abc123...
  Metric Samples: Last Run: 45
  Service Checks: Last Run: 1
```

**❌ Problem looks like**:
```
postgres
-------
  ERROR: Cannot connect to Postgres
```

---

## Quick Checklist

- [ ] Verified `datadog` user has `pg_monitor` role (Step 1)
- [ ] Reset password if needed (Step 2)
- [ ] Tested connection manually with psql (Step 3)
- [ ] Updated config file with host and password (Step 4)
- [ ] Restarted agent and checked status (Step 5)

---

## Common Issues

### "Password authentication failed"

**Solution**: Password in config file doesn't match the database password
- Double-check password in config file
- Make sure password is wrapped in single quotes: `'password'`
- Reset password if unsure: `ALTER USER datadog WITH PASSWORD 'newpassword';`

### "Permission denied"

**Solution**: User doesn't have correct permissions
```sql
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
```

### "Cannot connect"

**Solution**: Check host and port
- Host should be: `db.oomrmfhvsxtxgqqthisz.supabase.co`
- Port should be: `5432` (not 6543)

---

**Ready? Start with Step 1 to verify permissions!**

