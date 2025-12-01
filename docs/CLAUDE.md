# CLAUDE.md - PrayerMap Project Instructions

> **NEW STREAMLINED VERSION** - This file now serves as a lightweight entry point to our comprehensive documentation system.

> **📖 FOUNDATIONAL READING**: Before proceeding, you MUST read [ARTICLE.md](./ARTICLE.md) - The Autonomous Excellence Manifesto. This is the source of truth for our operational philosophy.

---

## 🚀 Quick Navigation (Start Here)

### New to PrayerMap?
**Read in this order:**
1. **[ARTICLE.md](./ARTICLE.md)** - MANDATORY - Our operational philosophy (5 min read)
2. **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Project command center (choose your path)
3. **Specialized guides** based on your role

### For AI Agents
1. **[ARTICLE.md](./ARTICLE.md)** - Operational foundation
2. **[AI-AGENTS.md](./AI-AGENTS.md)** - Agent roles and coordination
3. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Mandatory observability

### For Development
1. **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Entry point and quick start
2. **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Setup and patterns
3. **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - iOS/Android deployment

### For Troubleshooting
1. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
2. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Error patterns and analysis

---

## ⚠️ CRITICAL PRINCIPLES (Never Forget)

### 🚨 0. THE LIVING MAP PRINCIPLE (ABSOLUTE PRIORITY)
**[LIVING-MAP-PRINCIPLE.md](./LIVING-MAP-PRINCIPLE.md)** contains the CORE SPIRITUAL MISSION that overrides ALL other considerations. PrayerMap is the world's first LIVING MAP where users witness prayer happening in real-time and see eternal memorial connections. If ANY technical decision conflicts with the Living Map, THE LIVING MAP WINS.

**Key Requirements:**
- **Real-time updates**: Users see prayer activity as it happens (<2 seconds)
- **Eternal memorial lines**: Prayer connections NEVER disappear from the map
- **Universal shared map**: Everyone sees the same complete prayer history
- **Live witnessing**: The spiritual experience of watching prayer happen

### 1. ARTICLE.md is Supreme Authority
**ARTICLE.md** contains our foundational philosophy and supersedes everything else. When in doubt, return to ARTICLE.md.

### 2. Automatic Multi-Agent Workflows
For complex tasks (3+ steps, multiple domains), automatically use autonomous development to deploy specialized agents. See [AI-AGENTS.md](./AI-AGENTS.md) for coordination patterns.

### 3. Mobile-First Always
Every decision must work on iOS, Android, and web. If it breaks on mobile, it's wrong. See [MOBILE-GUIDE.md](./MOBILE-GUIDE.md) for deployment workflows.

### 4. Research-Driven Development
ALWAYS query memory first, then check official documentation before implementing. See [PROJECT-GUIDE.md](./PROJECT-GUIDE.md) for source credibility hierarchy.

### 5. Observability Required
All operations must implement structured logging and monitoring. See [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) for mandatory requirements.

---

## 📚 Complete Documentation Structure

### TIER 1: Foundation
- **[ARTICLE.md](./ARTICLE.md)** - The Autonomous Excellence Manifesto (MANDATORY)

### TIER 2: Command Center  
- **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Main navigation and quick start paths

### TIER 3: Specialized Guides
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Multi-agent coordination and roles
- **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Setup, patterns, and standards  
- **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - iOS & Android deployment workflows
- **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Observability and quality gates
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and debugging

### TIER 4: Reference
- **[PRD.md](./PRD.md)** - Product requirements and specifications
- **[README.md](./README.md)** - Project overview and basic setup

---

## 🎯 What is PrayerMap?

**PrayerMap** is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed map interface.

**Core Mission:** "See where prayer is needed. Send prayer where you are."

**The Living Map Vision:** Memorial connection lines wherever prayer has been answered, creating a network of prayers drawn on the map - **"making the invisible, visible"**.

**Live Site:** https://prayermap.net

---

## 🛡️ Never Do / Always Do

### Never Do
1. **Never bypass mobile testing** - If it doesn't work on iOS/Android, it's wrong
2. **Never implement without research** - Memory search first, then official docs
3. **Never skip observability** - All operations must be logged and monitored
4. **Never add user friction** - Count and minimize every step
5. **Never commit secrets** - Environment variables only

### Always Do
1. **Always read ARTICLE.md first** - Our operational foundation
2. **Always use multi-agent workflows** - For complex tasks (3+ steps)
3. **Always test on actual devices** - iOS and Android, not just browser
4. **Always implement with animations** - 60fps, delightful motion
5. **Always query memory before decisions** - Learn from past work

---

## 🚨 Emergency Quick Fixes

### App Won't Load
```bash
npm run build              # Check for build errors
npx tsc --noEmit          # Check TypeScript
npm install               # Reinstall dependencies
```

### Mobile Build Failing
```bash
npm run build && npx cap sync  # Sync web to mobile
npx cap clean ios && npx cap clean android  # Clean builds
```

### Need Help?
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) first
2. Review [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) for error patterns
3. Consult relevant specialized guide

---

## 📝 Memory Note

This streamlined CLAUDE.md now serves as a lightweight entry point to our comprehensive documentation system. The detailed content has been distributed across specialized guides for better organization and navigation.

**The hierarchy ensures:**
- **ARTICLE.md** remains the philosophical foundation
- **PROJECT-GUIDE.md** serves as the practical command center
- **Specialized guides** provide deep implementation details
- **Cross-references** maintain coherent navigation

---

**Last Updated:** 2024-11-30  
**Version:** 3.0 (Streamlined with guide references)  
**Next Review:** When documentation structure changes