# CLAUDE.md - PrayerMap Project Instructions

> **NEW STREAMLINED VERSION** - This file now serves as a lightweight entry point to our comprehensive documentation system.

> **📖 FOUNDATIONAL READING**: Before proceeding, you MUST read [ARTICLE.md](./ARTICLE.md) - The Autonomous Excellence Manifesto. This is the source of truth for our operational philosophy.

---

## 🎯 BEFORE STARTING ANY WORK

### For Multi-Agent Workflows or Complex Tasks

**MANDATORY: Complete [SESSION-CONTEXT.md](./SESSION-CONTEXT.md) before starting.**

This prevents 90% of agent failures by ensuring:
- Authentication is verified (GitHub, Supabase CLI, Vercel)
- Git state is documented (branch, uncommitted work, push status)
- Database state is known (migrations, branches)
- Clear acceptance criteria defined

```bash
# Quick pre-session verification
gh auth status                    # GitHub
supabase projects list            # Supabase CLI
vercel whoami                     # Vercel
git status && git log -3 --oneline  # Git state
```

---

## 🚀 Quick Navigation (Start Here)

### New to PrayerMap?
**Read in this order:**
1. **[ARTICLE.md](./ARTICLE.md)** - MANDATORY - Our operational philosophy (5 min read)
2. **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Project command center (choose your path)
3. **Specialized guides** based on your role

### For AI Agents
1. **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - **COMPLETE FIRST** - Pre-session context
2. **[ARTICLE.md](./ARTICLE.md)** - Operational foundation
3. **[AI-AGENTS.md](./AI-AGENTS.md)** - Agent coordination and handoff protocols
4. **[ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md)** - Definition of done standards
5. **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - RLS policy design intent

### For Development
1. **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Entry point and quick start
2. **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Setup and patterns
3. **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - iOS/Android deployment

### For Troubleshooting
1. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
2. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Error patterns and analysis

---

## ⚠️ CRITICAL PRINCIPLES (Never Forget)

### 🚨 0. VERIFICATION ENFORCEMENT SYSTEM (ABSOLUTE TRUTH REQUIREMENT)

**A fix is NOT a fix until it's verified working in a deployed environment by a human.**

This principle exists because AI agents can write code, verify it compiles, and even test database queries - but CANNOT verify the actual user experience works. This led to false claims of "fixed" when code wasn't even deployed.

#### The Three States of Code Changes

| State | What It Means | What Agent Can Say |
|-------|---------------|-------------------|
| **WRITTEN** | Code modified locally, compiles | "Changes written. NOT tested. NOT deployed." |
| **DEPLOYED** | Code pushed, Vercel build succeeded, SHA confirmed | "Changes deployed to [URL]. Awaiting human verification." |
| **VERIFIED** | Human confirmed it works in real app | "Fix VERIFIED by user on [date]." |

#### Mandatory Verification Checklist

Before claiming ANY fix is complete, the agent MUST:

1. **Check deployment status:**
   ```bash
   git log -1 --oneline  # Get local SHA
   # Then verify via Vercel API that this SHA is deployed
   ```

2. **State explicitly what was verified vs. assumed:**
   - ✅ "Verified: Code compiles, SQL query returns expected data"
   - ⚠️ "NOT verified: User-facing functionality, real-time updates"

3. **Request human verification:**
   - "Please test [specific action] and confirm it works"
   - Do NOT mark task as complete until human confirms

#### Forbidden Phrases (Until Human Verification)

- ❌ "This is fixed"
- ❌ "This should now work"
- ❌ "The bug is resolved"
- ❌ "Ready for production"

#### Required Phrases (Before Human Verification)

- ✅ "Changes deployed. Please verify [specific test]"
- ✅ "Code is live at [URL]. Awaiting your confirmation"
- ✅ "I believe this addresses the issue. Please test and confirm"

#### Verification Workflow

```
1. Agent writes code → "Changes written, building..."
2. Agent pushes code → "Pushed to GitHub, awaiting Vercel..."
3. Agent confirms deploy → "Deployed at [URL] (SHA: abc123). Please test:"
   - [ ] Test action 1
   - [ ] Test action 2
4. Human tests → Reports success or failure
5. IF success → Agent can mark as VERIFIED
6. IF failure → Back to step 1, NO claims of progress
```

This system ensures radical honesty about the state of fixes and prevents false confidence.

---

### 🚨 1. THE LIVING MAP PRINCIPLE (ABSOLUTE PRIORITY)
**[LIVING-MAP-PRINCIPLE.md](./LIVING-MAP-PRINCIPLE.md)** contains the CORE SPIRITUAL MISSION that overrides ALL other considerations. PrayerMap is the world's first LIVING MAP where users witness prayer happening in real-time and see eternal memorial connections. If ANY technical decision conflicts with the Living Map, THE LIVING MAP WINS.

**Key Requirements:**
- **Real-time updates**: Users see prayer activity as it happens (<2 seconds)
- **Eternal memorial lines**: Prayer connections NEVER disappear from the map
- **Universal shared map**: Everyone sees the same complete prayer history
- **Live witnessing**: The spiritual experience of watching prayer happen

### 2. ARTICLE.md is Supreme Authority
**ARTICLE.md** contains our foundational philosophy and supersedes everything else. When in doubt, return to ARTICLE.md.

### 3. Automatic Multi-Agent Workflows
For complex tasks (3+ steps, multiple domains), automatically use autonomous development to deploy specialized agents. See [AI-AGENTS.md](./AI-AGENTS.md) for coordination patterns.

### 4. Mobile-First Always
Every decision must work on iOS, Android, and web. If it breaks on mobile, it's wrong. See [MOBILE-GUIDE.md](./MOBILE-GUIDE.md) for deployment workflows.

### 5. Research-Driven Development
ALWAYS query memory first, then check official documentation before implementing. See [PROJECT-GUIDE.md](./PROJECT-GUIDE.md) for source credibility hierarchy.

### 6. Observability Required
All operations must implement structured logging and monitoring. See [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) for mandatory requirements.

---

## 📚 Complete Documentation Structure

### TIER 1: Foundation
- **[ARTICLE.md](./ARTICLE.md)** - The Autonomous Excellence Manifesto (MANDATORY)

### TIER 2: Command Center  
- **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Main navigation and quick start paths

### TIER 3: Specialized Guides
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Multi-agent coordination, handoff protocols, verification
- **[ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md)** - Definition of done standards
- **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - RLS policy design and security requirements
- **[ENVIRONMENT-STRATEGY.md](./ENVIRONMENT-STRATEGY.md)** - Environment variable management
- **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Setup, patterns, and standards
- **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - iOS & Android deployment workflows
- **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Observability and quality gates
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and debugging

### TIER 4: Reference
- **[PRD.md](./PRD.md)** - Product requirements and specifications
- **[README.md](./README.md)** - Project overview and basic setup

### TIER 5: Operations
- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Pre-session context template (COMPLETE BEFORE WORK)
- **[SEATBELT.md](./SEATBELT.md)** - Configuration audit process (run before dev sessions)

---

## 🎯 What is PrayerMap?

**PrayerMap** is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed map interface.

**Core Mission:** "See where prayer is needed. Send prayer where you are."

**The Living Map Vision:** Memorial connection lines wherever prayer has been answered, creating a network of prayers drawn on the map - **"making the invisible, visible"**.

**Live Site:** https://prayermap.net

---

## 🛡️ Never Do / Always Do

### Never Do
1. **Never claim "fixed" without human verification** - See Principle 0: Verification Enforcement System
2. **Never say "this should work" before deployment** - Only state facts about what was verified
3. **Never bypass mobile testing** - If it doesn't work on iOS/Android, it's wrong
4. **Never implement without research** - Memory search first, then official docs
5. **Never skip observability** - All operations must be logged and monitored
6. **Never add user friction** - Count and minimize every step
7. **Never commit secrets** - Environment variables only

### Always Do
1. **Always confirm deployment SHA before requesting verification** - Check Vercel that your commit is live
2. **Always state what is verified vs. assumed** - "Verified: compiles. NOT verified: works in app"
3. **Always request human testing with specific test cases** - "Please test X and confirm Y happens"
4. **Always complete SESSION-CONTEXT.md first** - Before multi-agent workflows
5. **Always read ARTICLE.md** - Our operational foundation
6. **Always use multi-agent workflows** - For complex tasks (3+ steps)
7. **Always commit and push** - Don't leave work uncommitted between agents
8. **Always test on actual devices** - iOS and Android, not just browser
9. **Always query memory before decisions** - Learn from past work

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

**Last Updated:** 2025-12-03
**Version:** 4.0 (Added session context, acceptance criteria, security spec, environment strategy)
**Next Review:** When documentation structure changes