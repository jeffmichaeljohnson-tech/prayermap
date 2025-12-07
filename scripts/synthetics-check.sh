#!/bin/bash
# On-demand Synthetic checks for PrayerMap
# Usage: ./scripts/synthetics-check.sh [homepage|admin|ssl|all]

set -e

API="fb5fff67250d89ec55f42918f22e809e"
APP="ad9fba0f9d23288d9597fadd3731806f934b42c1"

check_homepage() {
  echo "🔍 Checking homepage (prayermap.net)..."

  response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" "https://prayermap.net")
  status=$(echo "$response" | cut -d'|' -f1)
  time=$(echo "$response" | cut -d'|' -f2)

  if [ "$status" = "200" ]; then
    echo "✅ Homepage OK - Status: $status, Time: ${time}s"
  else
    echo "❌ Homepage FAILED - Status: $status"
    return 1
  fi
}

check_admin() {
  echo "🔍 Checking admin dashboard (admin.prayermap.net)..."

  response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" "https://admin.prayermap.net")
  status=$(echo "$response" | cut -d'|' -f1)
  time=$(echo "$response" | cut -d'|' -f2)

  if [ "$status" = "200" ]; then
    echo "✅ Admin OK - Status: $status, Time: ${time}s"
  else
    echo "❌ Admin FAILED - Status: $status"
    return 1
  fi
}

check_ssl() {
  echo "🔍 Checking SSL certificate..."

  expiry=$(echo | openssl s_client -servername prayermap.net -connect prayermap.net:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  if [ -n "$expiry" ]; then
    expiry_epoch=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" "+%s" 2>/dev/null || date -d "$expiry" "+%s" 2>/dev/null)
    now_epoch=$(date "+%s")
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_left" -gt 14 ]; then
      echo "✅ SSL OK - Expires in $days_left days ($expiry)"
    else
      echo "⚠️  SSL WARNING - Expires in $days_left days!"
      return 1
    fi
  else
    echo "❌ SSL check failed"
    return 1
  fi
}

check_api() {
  echo "🔍 Checking Supabase Edge Functions..."

  status=$(curl -s -o /dev/null -w "%{http_code}" "https://oomrmfhvsxtxgqqthisz.supabase.co/functions/v1/query-memory" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"query": "health", "limit": 1}')

  if [ "$status" = "200" ] || [ "$status" = "401" ]; then
    echo "✅ Edge Functions responding - Status: $status"
  else
    echo "❌ Edge Functions FAILED - Status: $status"
    return 1
  fi
}

# Main
case "${1:-all}" in
  homepage)
    check_homepage
    ;;
  admin)
    check_admin
    ;;
  ssl)
    check_ssl
    ;;
  api)
    check_api
    ;;
  all)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏥 PrayerMap Health Checks"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    check_homepage
    echo ""
    check_admin
    echo ""
    check_ssl
    echo ""
    check_api
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ All checks complete"
    ;;
  *)
    echo "Usage: $0 [homepage|admin|ssl|api|all]"
    exit 1
    ;;
esac
