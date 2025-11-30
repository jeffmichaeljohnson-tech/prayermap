# Datadog PostgreSQL Setup - Quick Reference

> **5-Minute Quick Start** for setting up Datadog PostgreSQL monitoring with Supabase

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Datadog User (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run this SQL (replace `<PASSWORD>` with strong password):

```sql
CREATE USER datadog WITH PASSWORD '<PASSWORD>';
GRANT pg_monitor TO datadog;
GRANT SELECT ON pg_stat_database TO datadog;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;
```

**Or use the complete script**: `supabase/datadog_user_setup.sql`

### Step 2: Get Connection Info (1 minute)

From **Supabase Dashboard** → **Settings** → **Database**:

- **Host**: `db.<YOUR_PROJECT_REF>.supabase.co`
- **Port**: `5432` (direct connection, NOT 6543 pooler)
- **Database**: `postgres`
- **Username**: `datadog`
- **Password**: (the one you set in Step 1)

### Step 3: Configure Datadog Agent (2 minutes)

Edit `/etc/datadog-agent/conf.d/postgres.d/conf.yaml`:

```yaml
init_config:

instances:
  - host: db.<YOUR_PROJECT_REF>.supabase.co
    port: 5432
    username: datadog
    password: '<PASSWORD_FROM_STEP_1>'
    dbname: postgres
    disable_generic_tags: true
    relations:
      - relation_regex: .*
    tags:
      - 'service:prayermap'
      - 'database:supabase'
```

**Restart Agent**: `sudo systemctl restart datadog-agent`

---

## ✅ Verify It Works

```bash
# Check agent status
sudo datadog-agent status | grep postgres

# Should see:
# postgres
# -------
#   Instance ID: postgres:abc123
#   Metric Samples: Last Run: 45
#   Service Checks: Last Run: 1
```

**Check Dashboard**: https://app.datadoghq.com → **Infrastructure** → **PostgreSQL**

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect" | Use port **5432** (not 6543), check firewall |
| "Permission denied" | Re-run Step 1 SQL grants |
| "No metrics" | Wait 5 minutes, check `DD_API_KEY` is set |
| "Too many connections" | Use connection pooler (port 6543) instead |

---

## 📋 Full Documentation

See **[DATADOG_POSTGRESQL_SETUP.md](./DATADOG_POSTGRESQL_SETUP.md)** for:
- Detailed troubleshooting
- Custom metrics setup
- Log collection configuration
- Security best practices
- PrayerMap-specific monitoring

---

## 🎯 What You Get

- ✅ Database performance metrics
- ✅ Query performance tracking
- ✅ Connection pool monitoring
- ✅ Table size tracking
- ✅ Slow query detection
- ✅ Error rate monitoring

---

**Quick Setup Time**: ~5 minutes  
**Full Setup Time**: ~15 minutes (with custom metrics)

