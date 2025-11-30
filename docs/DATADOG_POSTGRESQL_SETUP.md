# Datadog PostgreSQL Monitoring Setup for Supabase

> **Purpose**: Set up Datadog Agent to monitor PostgreSQL database performance, queries, and health metrics for PrayerMap's Supabase backend.

---

## 🎯 Overview

This guide configures Datadog PostgreSQL integration for **Supabase-managed PostgreSQL**. Since Supabase is a managed service, we need to:

1. **Create read-only datadog user** via Supabase SQL Editor
2. **Get direct database connection** (not pooler URL)
3. **Configure Datadog Agent** to connect to Supabase
4. **Set up monitoring** for database performance

---

## ⚠️ Important: Supabase Limitations

**Supabase is a managed PostgreSQL service**, which means:

- ✅ **You CAN**: Create users, grant permissions via SQL Editor
- ✅ **You CAN**: Connect directly to database (not just REST API)
- ⚠️ **You CANNOT**: Install Datadog Agent on Supabase's servers
- ⚠️ **You CANNOT**: Access PostgreSQL config files directly

**Solution**: Run Datadog Agent on **your own host** (Vercel serverless function, separate server, or local machine) that connects to Supabase's database.

---

## 📋 Prerequisites

1. ✅ Datadog account created (you mentioned you just set this up)
2. ✅ Supabase project with database access
3. ✅ Datadog Agent installed on a host that can reach Supabase database
4. ✅ Direct database connection string from Supabase (not pooler)

---

## Step 1: Get Supabase Direct Connection String

### Option A: From Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **"URI"** tab (not "Session mode" or "Transaction mode")
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

**⚠️ Important**: Use the **direct connection** (port 5432), NOT the pooler connection (port 6543).

### Option B: From Environment Variables

If you have `SUPABASE_DB_URL` or similar, use that. It should be in format:
```
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

---

## Step 2: Create Datadog Read-Only User

### Connect to Supabase Database

1. Go to Supabase Dashboard → **SQL Editor**
2. Create a new query

### For PostgreSQL 10+ (Supabase uses PostgreSQL 15)

Run this SQL:

```sql
-- Create read-only datadog user
CREATE USER datadog WITH PASSWORD '<STRONG_PASSWORD_HERE>';

-- Grant monitoring permissions
GRANT pg_monitor TO datadog;

-- Grant access to statistics
GRANT SELECT ON pg_stat_database TO datadog;

-- Grant access to all tables for relation metrics (optional but recommended)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datadog;

-- Grant access to future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datadog;

-- Verify permissions
SELECT * FROM pg_stat_database LIMIT 1;
```

**Replace `<STRONG_PASSWORD_HERE>`** with a strong password (save this - you'll need it for Datadog Agent config).

### Verify User Creation

Run this to verify the user was created:

```sql
-- Check user exists
SELECT usename FROM pg_user WHERE usename = 'datadog';

-- Test permissions
\c postgres datadog
SELECT * FROM pg_stat_database LIMIT 1;
```

---

## Step 3: Install Datadog Agent

### Option A: Install on Local Machine (For Development)

```bash
# macOS
DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_mac_os.sh)"

# Linux
DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)"

# Windows
# Download installer from: https://github.com/DataDog/datadog-agent/releases
```

### Option B: Install on Vercel Serverless Function (For Production)

**Note**: Vercel serverless functions are ephemeral, so this approach has limitations. Consider a dedicated monitoring server instead.

### Option C: Install on Separate Monitoring Server

Best for production - run Datadog Agent on a small VPS (DigitalOcean, AWS EC2, etc.) that can connect to Supabase.

---

## Step 4: Configure Datadog Agent for PostgreSQL

### Find Agent Configuration Directory

```bash
# macOS/Linux
/etc/datadog-agent/

# Windows
C:\ProgramData\Datadog\
```

### Create/Edit PostgreSQL Configuration

Create or edit: `conf.d/postgres.d/conf.yaml`

```yaml
init_config:

instances:
  ## Supabase Database Connection
  - host: db.<YOUR_PROJECT_REF>.supabase.co  # From connection string
    port: 5432                                # Direct connection port
    username: datadog                          # User we created
    password: '<STRONG_PASSWORD_HERE>'        # Password from Step 2
    dbname: postgres                          # Default database
    
    # Disable generic tags (redundant with host tag)
    disable_generic_tags: true
    
    # Enable database autodiscovery (optional)
    database_autodiscovery:
      enabled: true
      include:
        - postgres.*
    
    # Monitor all relations (tables)
    relations:
      - relation_regex: .*
    
    # Custom tags
    tags:
      - 'env:production'
      - 'service:prayermap'
      - 'database:supabase'
      - 'hosting:managed'
```

**Replace**:
- `<YOUR_PROJECT_REF>` - Your Supabase project reference (from connection string)
- `<STRONG_PASSWORD_HERE>` - Password you set in Step 2

### Example Configuration (PrayerMap-Specific)

```yaml
init_config:

instances:
  - host: db.oomrmfhvsxtxgqqthisz.supabase.co
    port: 5432
    username: datadog
    password: 'your_secure_password_here'
    dbname: postgres
    disable_generic_tags: true
    
    # Monitor PrayerMap tables specifically
    relations:
      - relation_name: profiles
      - relation_name: prayers
      - relation_name: prayer_responses
      - relation_name: prayer_connections
      - relation_name: notifications
    
    tags:
      - 'env:production'
      - 'service:prayermap'
      - 'database:supabase'
      - 'project:prayermap'
```

---

## Step 5: Enable Log Collection (Optional)

### Configure PostgreSQL Logging in Supabase

**Note**: Supabase doesn't allow direct access to `postgresql.conf`, but you can enable logging via SQL:

```sql
-- Enable query logging (if supported by Supabase)
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_min_duration_statement = 0;
```

**⚠️ Warning**: This may generate a lot of logs. Consider setting `log_min_duration_statement = 1000` (log queries >1 second) instead.

### Configure Datadog Agent Log Collection

Edit `datadog.yaml`:

```yaml
logs_enabled: true
```

Edit `conf.d/postgres.d/conf.yaml`:

```yaml
logs:
  - type: file
    path: "/var/log/postgresql/postgresql.log"  # Adjust based on Supabase log location
    source: postgresql
    service: prayermap-db
    log_processing_rules:
      - type: multi_line
        pattern: \d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])
        name: new_log_start_with_date
```

**Note**: Supabase may not expose log files directly. Log collection may be limited.

---

## Step 6: Restart Datadog Agent

```bash
# macOS/Linux
sudo systemctl restart datadog-agent

# Or using launchctl (macOS)
sudo launchctl stop com.datadoghq.agent
sudo launchctl start com.datadoghq.agent

# Check status
sudo datadog-agent status
```

---

## Step 7: Verify Connection

### Test Database Connection

```bash
# Test connection from Agent host
psql -h db.<YOUR_PROJECT_REF>.supabase.co \
     -U datadog \
     -d postgres \
     -c "SELECT * FROM pg_stat_database LIMIT(1);"
```

When prompted, enter the password you set in Step 2.

### Check Datadog Agent Status

```bash
sudo datadog-agent status
```

Look for:
```
postgres
-------
  Instance ID: postgres:abc123
  Configuration Source: file:/etc/datadog-agent/conf.d/postgres.d/conf.yaml
  Total Runs: 10
  Metric Samples: Last Run: 45, Total: 450
  Events: Last Run: 0, Total: 0
  Service Checks: Last Run: 1, Total: 10
  Average Execution Time: 234ms
  Last Execution Date: 2024-11-30 12:00:00
```

### Check Datadog Dashboard

1. Go to https://app.datadoghq.com
2. Navigate to **Infrastructure** → **PostgreSQL**
3. You should see:
   - Database metrics (connections, queries, replication lag)
   - Query performance
   - Table sizes
   - Connection pool stats

---

## Step 8: Configure Custom Metrics (Optional)

### Monitor PrayerMap-Specific Metrics

Add custom queries to `conf.d/postgres.d/conf.yaml`:

```yaml
instances:
  - host: db.<YOUR_PROJECT_REF>.supabase.co
    port: 5432
    username: datadog
    password: '<PASSWORD>'
    dbname: postgres
    
    # Custom metrics for PrayerMap
    custom_queries:
      # Count active prayers
      - metric_prefix: prayermap.prayers
        query: "SELECT COUNT(*) as count FROM prayers WHERE status = 'active'"
        columns:
          - name: active_prayers
            type: gauge
        
      # Count prayer responses in last hour
      - metric_prefix: prayermap.responses
        query: "SELECT COUNT(*) as count FROM prayer_responses WHERE created_at > NOW() - INTERVAL '1 hour'"
        columns:
          - name: responses_last_hour
            type: gauge
        
      # Average response time
      - metric_prefix: prayermap.performance
        query: "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time FROM prayer_responses WHERE updated_at IS NOT NULL"
        columns:
          - name: avg_response_time_seconds
            type: gauge
```

---

## 🔍 Troubleshooting

### Issue: "Cannot connect to Postgres"

**Symptoms**: Agent status shows `ERROR: Cannot connect to Postgres`

**Solutions**:
1. **Check firewall**: Ensure port 5432 is accessible from Agent host
   ```bash
   telnet db.<PROJECT_REF>.supabase.co 5432
   ```

2. **Verify connection string**: Use direct connection (port 5432), not pooler (port 6543)

3. **Check credentials**: Verify username/password are correct
   ```bash
   psql -h db.<PROJECT_REF>.supabase.co -U datadog -d postgres
   ```

4. **Check Supabase IP allowlist**: Some Supabase plans require IP allowlisting

### Issue: "Permission denied"

**Symptoms**: Agent connects but can't read statistics

**Solutions**:
1. **Re-run grants**: Execute Step 2 SQL again
2. **Check user exists**: `SELECT usename FROM pg_user WHERE usename = 'datadog';`
3. **Verify permissions**: `\du datadog` in psql

### Issue: "No metrics appearing"

**Symptoms**: Agent status shows success but no metrics in Datadog

**Solutions**:
1. **Check API key**: Verify `DD_API_KEY` is set correctly
2. **Check site**: Ensure `DD_SITE="datadoghq.com"` matches your Datadog account
3. **Wait 5 minutes**: Metrics may take a few minutes to appear
4. **Check agent logs**: `sudo datadog-agent status` for errors

### Issue: "Too many connections"

**Symptoms**: Database connection errors

**Solutions**:
1. **Use connection pooling**: Consider using Supabase pooler for Agent (port 6543)
2. **Reduce agent frequency**: Increase `min_collection_interval` in config
3. **Check Supabase limits**: Review connection limits in Supabase dashboard

---

## 📊 What You'll See in Datadog

### Database Metrics

- **Connections**: Active connections, max connections
- **Queries**: Query rate, slow queries, query errors
- **Replication**: Replication lag (if applicable)
- **Locks**: Table locks, deadlocks
- **Cache**: Cache hit ratio, buffer usage

### Table Metrics

- **Size**: Table sizes, index sizes
- **Rows**: Row counts, growth rate
- **Operations**: Inserts, updates, deletes per table

### Query Performance

- **Slow queries**: Queries taking >1 second
- **Query patterns**: Most common queries
- **Query errors**: Failed queries with error messages

---

## 🎯 PrayerMap-Specific Monitoring

### Key Metrics to Watch

1. **Prayer Creation Rate**: `prayermap.prayers.active_prayers` (custom metric)
2. **Response Rate**: `prayermap.responses.responses_last_hour` (custom metric)
3. **Database Query Performance**: Monitor slow queries affecting real-time features
4. **Connection Pool**: Ensure enough connections for Realtime subscriptions
5. **Geospatial Query Performance**: Monitor PostGIS queries for map features

### Alerts to Set Up

1. **Slow Queries**: Alert when queries >1 second
2. **Connection Pool Exhaustion**: Alert when connections >80% of max
3. **High Error Rate**: Alert when query errors >5% of total queries
4. **Database Size**: Alert when database >80% of plan limit

---

## 🔐 Security Best Practices

1. **Use strong password**: Generate secure password for `datadog` user
2. **Limit permissions**: Only grant `pg_monitor` and `SELECT` - never `INSERT`, `UPDATE`, `DELETE`
3. **Rotate credentials**: Change password periodically
4. **IP allowlisting**: If possible, restrict Agent host IP in Supabase
5. **Use SSL**: Ensure connection uses SSL (Supabase requires this)

---

## 📚 Next Steps

1. **Set up alerts**: Configure Datadog alerts for critical metrics
2. **Create dashboards**: Build custom dashboards for PrayerMap metrics
3. **Integrate with RUM**: Link database metrics with frontend RUM data
4. **Monitor real-time**: Watch for connection issues affecting Realtime subscriptions

---

## 🔗 Related Documentation

- **Datadog PostgreSQL Integration**: https://docs.datadoghq.com/integrations/postgres/
- **Supabase Database Docs**: https://supabase.com/docs/guides/database
- **PrayerMap Monitoring Guide**: [MONITORING-GUIDE.md](../MONITORING-GUIDE.md)
- **Datadog RUM Setup**: [DATADOG_QUICK_START.md](./DATADOG_QUICK_START.md)

---

## ✅ Checklist

- [ ] Got Supabase direct connection string (port 5432)
- [ ] Created `datadog` user with read-only permissions
- [ ] Installed Datadog Agent on accessible host
- [ ] Configured `conf.d/postgres.d/conf.yaml`
- [ ] Restarted Datadog Agent
- [ ] Verified connection in `datadog-agent status`
- [ ] Confirmed metrics appearing in Datadog dashboard
- [ ] Set up custom metrics for PrayerMap (optional)
- [ ] Configured alerts for critical metrics (optional)

---

**Status**: ✅ Ready to implement  
**Priority**: HIGH - Enables database performance monitoring  
**Last Updated**: 2024-11-30

