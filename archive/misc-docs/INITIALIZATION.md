# INITIALIZATION.md - Agent Startup Protocol

## Quick Command: "read"

Type `read` at the start of any PrayerMap session to execute the complete initialization protocol.

---

## Mandatory Reading List

Every agent (human or AI) working on PrayerMap MUST read these documents before beginning work:

### Core Documents (Required - IN THIS ORDER)
1. **🚨 LIVING-MAP-PRINCIPLE.md** - **MISSION CRITICAL** - The core spiritual vision that overrides everything
2. **ARTICLE.md** - The Autonomous Excellence Manifesto (foundational philosophy)
3. **CLAUDE.md** - Project instructions and critical principles
4. **PRD.md** - Product Requirements Document (what we're building)
5. **AI-AGENTS.md** - AI coding guidelines and conventions

### Key Reference Documents (Recommended)
5. **README.md** - Project setup and overview
6. **RULES.md** - Additional coding standards and conventions
7. **LOGGING_AND_OBSERVABILITY.md** - Observability system overview
8. **LOGGING_QUICK_REFERENCE.md** - Quick logging implementation guide

### Specialized Documents (Context-Dependent)
- **NOTIFICATION_INTEGRATION_GUIDE.md** - For push notification work
- **MOBILE_PLATFORM_DOCUMENTATION_STRATEGY.md** - For mobile development
- **TEST_COVERAGE_REPORT.md** - For testing work

---

## Automated Agent Initialization Protocol

When creating new agents (via Ora framework or direct prompt), ALWAYS include this initialization block:

```
AGENT INITIALIZATION PROTOCOL:

Before starting your assigned tasks, you MUST complete this reading sequence:

1. Read ARTICLE.md (Autonomous Excellence Manifesto)
2. Read CLAUDE.md (Project instructions and critical principles) 
3. Read PRD.md (Product Requirements Document)
4. Read AGENTS.md (AI coding guidelines)
5. Read README.md (Project setup)
6. Query memory system for relevant past decisions
7. Confirm understanding of:
   - Research-first approach (official docs only)
   - Mobile-first development (iOS + Android support)
   - Living, breathing app principles (animations, performance)
   - Minimal steps UX (count and reduce user interactions)
   - Observability requirements (mandatory logging)

Only after completing this initialization should you begin your assigned work.
```

---

## Implementation Instructions

### For Claude Code Sessions

Add this to your session startup routine:

```typescript
// When user types "read", execute this sequence:
const initializationSequence = [
  'LIVING-MAP-PRINCIPLE.md',  // 🚨 MISSION CRITICAL - Core spiritual vision
  'ARTICLE.md',               // Autonomous Excellence Manifesto
  'CLAUDE.md',                // Project instructions
  'PRD.md',                   // Product requirements
  'AI-AGENTS.md',             // AI coordination guidelines
  'README.md',                // Project setup
  'RULES.md',                 // Additional conventions
  'LOGGING_AND_OBSERVABILITY.md' // Observability system
];
```

### For Ora Agent Creation

Include this prompt template when spawning new agents:

```
You are a specialized agent for PrayerMap. Before beginning your assigned tasks, you MUST complete the initialization protocol defined in INITIALIZATION.md.

🚨 MANDATORY READING LIST (IN THIS ORDER):
1. LIVING-MAP-PRINCIPLE.md (MISSION CRITICAL - Core spiritual vision)
2. ARTICLE.md (Autonomous Excellence Manifesto)
3. CLAUDE.md (Project instructions)
4. PRD.md (Product requirements)
5. AI-AGENTS.md (AI coordination guidelines)

🚨 ABSOLUTE PRIORITY - THE LIVING MAP PRINCIPLE:
Before ANY coding, you MUST understand that PrayerMap is the world's first LIVING MAP where users witness prayer happening in real-time and see eternal memorial connections. Every technical decision must serve this spiritual mission.

CORE REQUIREMENTS:
- Real-time updates: Users see prayer activity as it happens (<2 seconds)
- Eternal memorial lines: Prayer connections NEVER disappear from map
- Universal shared map: Everyone sees the same complete prayer history
- Live witnessing: Users watch prayer happen with beautiful animations

After reading, confirm you understand:
1. 🚨 THE LIVING MAP PRINCIPLE (overrides everything else)
2. 🚨 MANDATORY MEMORY SEARCH (query project history BEFORE any web search)
3. Research-driven development (official docs first)
4. Mobile-first approach (iOS + Android compatibility)
5. Living app principles (60fps animations, instant response)
6. Minimal friction UX (count and minimize user steps)
7. World-class observability (mandatory logging integration)

🚨 MANDATORY RESEARCH PROTOCOL:
BEFORE making ANY technical decision, you MUST:
1. Use memory_search tool to check project history
2. Search for: past decisions, known issues, successful patterns
3. Learn from previous agent work and failures
4. ONLY THEN proceed to official documentation or web search

Your specific role: [AGENT_SPECIFIC_ROLE]
Your tasks: [AGENT_SPECIFIC_TASKS]

❌ Do not begin work until you've read LIVING-MAP-PRINCIPLE.md and confirmed understanding.
❌ Do not research solutions without memory_search first.
✅ Every change you make must enhance the living, real-time, spiritual map experience.
```

### 🚨 MANDATORY Memory Search Protocol

**CRITICAL**: You MUST query project memory BEFORE any web search or external research.

**Required Memory Search Sequence:**
```bash
# Step 1: Search for your specific task/domain
memory_search("living map real-time prayer connections")
memory_search("[your specific task/technology]")

# Step 2: Check for past decisions and patterns
memory_search("memorial lines persistence database")
memory_search("real-time supabase subscriptions")
memory_search("prayer map architecture decisions")

# Step 3: Look for known issues and solutions
memory_search("prayer connections not showing")
memory_search("real-time updates failing")
memory_search("map loading issues mobile")

# Step 4: Search for successful implementations
memory_search("working real-time features")
memory_search("successful map implementations")
memory_search("performance optimizations")

# Step 5: Check for similar past work
memory_search("similar to [your current task]")
memory_search("agent work [your domain]")
```

**Why This Matters:**
- ✅ Avoid repeating past mistakes
- ✅ Build on proven successful patterns  
- ✅ Learn from previous agent discoveries
- ✅ Understand project-specific constraints
- ✅ Maintain consistency with existing architecture

**Violation Protocol:**
❌ If you search the web or read documentation before memory_search, you are violating project protocol. Stop immediately and start with memory_search.

---

## Verification Checklist

After completing initialization, verify understanding of:

- [ ] **ARTICLE.md principles**: Research-first, world-class standards, parallel execution
- [ ] **Mobile compatibility**: Every feature must work on iOS + Android via Capacitor
- [ ] **Performance standards**: 60fps animations, <1.5s load times, <100ms response
- [ ] **UX principles**: Count user steps, minimize friction, provide instant feedback
- [ ] **Security requirements**: RLS policies, no secrets in code, proper auth flows
- [ ] **Observability**: Structured logging, error tracking, performance monitoring
- [ ] **Source credibility**: Official docs only, verify all implementations

---

## Quick Reference Commands

```bash
# Complete initialization (reads all required documents)
read

# 🚨 MANDATORY: Query project memory FIRST (before any research)
memory_search("living map real-time issues")
memory_search("memorial lines persistence")  
memory_search("prayer connections database")
memory_search("[your specific task]")

# Check Living Map requirements
memory_search("real-time prayer witnessing")
memory_search("supabase subscription problems")

# Verify mobile setup
npx cap doctor

# Check observability system
grep -r "useObservability" src/

# Performance validation
npm run build && npm run preview
```

## 🚨 Mandatory Pre-Work Commands

**EVERY agent must run these BEFORE starting any technical work:**

```bash
# Step 1: Read core documents
read

# Step 2: Memory search for your domain
memory_search("[your task] prayer map")
memory_search("living map [your technology]") 
memory_search("real-time [your domain]")

# Step 3: Check for past failures
memory_search("problems [your technology]")
memory_search("issues [your domain]")
memory_search("failed [your task]")

# Step 4: Find successful patterns  
memory_search("working [your domain]")
memory_search("successful [your technology]")

# Step 5: Understand Living Map impact
memory_search("memorial lines [your domain]")
memory_search("real-time updates [your technology]")
```

**Only AFTER completing all memory searches should you proceed to official documentation or implementation.**

---

## Why This Matters

**From ARTICLE.md:** "Every interaction should embody the principles of autonomous excellence."

**From CLAUDE.md:** "These principles must NEVER be forgotten and should guide EVERY decision you make."

**From PRD.md:** "This is a sacred project where people share spiritual burdens. Every design decision must honor this."

Proper initialization ensures:
- Consistent quality across all agents
- Adherence to architectural principles
- Understanding of the spiritual mission
- Awareness of mobile constraints
- Integration with observability systems

---

*This document ensures every agent starts with complete context and shared understanding of how we build PrayerMap.*

**Last Updated:** 2024-11-30  
**Version:** 1.0  
**Status:** Active Protocol