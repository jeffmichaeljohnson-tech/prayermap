# PROJECT-GUIDE.md - PrayerMap Command Center

> **Your single entry point for PrayerMap development.** This guide consolidates essential information and directs you to specialized documentation based on your needs.

> **📖 FOUNDATIONAL READING FIRST**: Before proceeding, you MUST read [ARTICLE.md](./ARTICLE.md) - The Autonomous Excellence Manifesto. This is our philosophical and operational foundation.

---

## 🚀 Quick Start (Choose Your Path)

### 👨‍💻 New Developer
```
1. Read ARTICLE.md (philosophical foundation)
2. Follow IMPLEMENTATION-GUIDE.md (setup & patterns)
3. Review MOBILE-GUIDE.md (deployment workflows)
4. Bookmark TROUBLESHOOTING.md (when things break)
```

### 🤖 AI Agent
```
1. Read ARTICLE.md (operational philosophy)
2. Study AI-AGENTS.md (roles & responsibilities)
3. Reference MONITORING-GUIDE.md (observability requirements)
4. Use specialized guides as needed
```

### 🚨 Emergency Debugging
```
1. Check TROUBLESHOOTING.md (common issues)
2. Review MONITORING-GUIDE.md (error patterns)
3. Consult relevant specialized guide
4. Escalate with full context if needed
```

---

## ⚠️ CRITICAL PRINCIPLES (Never Forget)

### PRINCIPLE 1: Research-Driven Development
**ALWAYS query memory first, THEN check official documentation BEFORE making decisions.**
- **Step 1**: Call `memory_search` to check for existing research and decisions
- **Step 2**: If memory insufficient, consult React.dev, Supabase docs, Capacitor docs (sources of truth)
- Never rely on outdated tutorials or unverified Stack Overflow answers
- See [AI-AGENTS.md](./AI-AGENTS.md) for full source credibility hierarchy

### PRINCIPLE 2: Mobile-First Architecture  
**Every decision must work on iOS, Android, AND web.**
- Test on actual devices, not just browsers
- Use Capacitor plugins for native features
- See [MOBILE-GUIDE.md](./MOBILE-GUIDE.md) for deployment workflows

### PRINCIPLE 3: Living, Breathing App
**The app must feel fast, animated, and delightful.**
- <100ms response to user interaction
- Framer Motion animations throughout
- See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) for performance standards

### PRINCIPLE 4: Minimal Steps UX
**Reduce user friction relentlessly.**
- Count every tap/click required
- Challenge every form field
- See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) for UX patterns

### PRINCIPLE 5: Automatic Multi-Agent Workflows
**Use Ora framework for complex tasks.**
- 3+ distinct steps = multi-agent workflow
- Multiple technology domains = parallel execution
- See [AI-AGENTS.md](./AI-AGENTS.md) for coordination patterns

---

## 🏗️ Technology Stack (Single Source of Truth)

### Frontend
```json
{
  "react": "19.2.0",
  "typescript": "5.9.6", 
  "vite": "7.2.2",
  "tailwindcss": "4.1.17",
  "radix-ui": "latest",
  "framer-motion": "latest",
  "mapbox-gl": "3.x"
}
```

### State Management
```json
{
  "zustand": "latest",        // Global state (auth, preferences)
  "react-query": "latest",    // Server state (data fetching)
  "react-context": "built-in" // Auth context only
}
```

### Backend & Mobile
```json
{
  "supabase": "latest",     // PostgreSQL + PostGIS + Auth + Storage
  "capacitor": "6.x",       // Mobile wrapper
  "node": "20.x",          // Runtime
  "postgresql": "15.x"      // Database
}
```

**Deployment**: Vercel (frontend) + Supabase Cloud (backend) + App Stores (mobile)

---

## 📱 Project Structure

```
prayermap/
├── src/                    # Main React application
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks  
│   ├── services/          # API/data services
│   ├── lib/               # Utilities
│   └── types/             # TypeScript definitions
├── admin/                  # Admin dashboard
├── supabase/              # Database migrations & functions
├── ios/                   # iOS native project
├── android/               # Android native project
├── docs/                  # Documentation
└── tests/                 # Playwright tests
```

---

## 🧠 What is PrayerMap?

**PrayerMap** is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed map interface. It's a sacred digital sanctuary for authentic spiritual connection.

**Core Value Proposition:** "See where prayer is needed. Send prayer where you are."

**The Living Map Vision:** Memorial connection lines wherever prayer has been answered, creating a network of prayers drawn on the map - **"making the invisible, visible"**.

**Live Site:** https://prayermap.net

---

## 📚 Documentation Navigation Map

### 🤖 For AI Agents & Development
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Agent roles, responsibilities, and coordination patterns
- **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Setup, patterns, and code standards
- **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Observability, performance, and quality gates

### 📱 For Mobile Development
- **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - Capacitor setup, deployment, and platform-specific patterns
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common mobile issues and solutions

### 📋 For Reference
- **[PRD.md](./PRD.md)** - Product requirements and feature specifications
- **[README.md](./README.md)** - Project overview and basic setup
- **API-SPEC.md** - API documentation and integration patterns

### 📖 For Philosophy & Context
- **[ARTICLE.md](./ARTICLE.md)** - **MANDATORY** - The Autonomous Excellence Manifesto
- **docs/** - Additional technical documentation and archives

---

## ✅ Quick Commands

### Development
```bash
npm run dev                 # Start development server (localhost:5173)
npm run build              # Build for production
npx tsc --noEmit          # Type checking
npm run lint              # ESLint
```

### Mobile
```bash
npm run build && npx cap sync    # Sync to mobile
npx cap open ios                 # Open Xcode
npx cap open android            # Open Android Studio
```

### Testing
```bash
npx playwright test        # Run all tests
npx playwright test --ui   # Test with UI
```

---

## 🚫 Never Do

1. **Never bypass mobile testing** - If it doesn't work on iOS/Android, it's wrong
2. **Never implement without research** - Memory search first, then official docs
3. **Never add user friction** - Count and minimize every step
4. **Never ship slow animations** - 60fps or don't ship
5. **Never commit secrets** - .env files stay local
6. **Never assume without measuring** - Performance data beats intuition

## ✅ Always Do  

1. **Always read ARTICLE.md first** - Our operational foundation
2. **Always query memory first** - Check for existing research before starting new research
3. **Always check official documentation** - React, Supabase, Capacitor sources of truth (after memory)
4. **Always test on actual mobile devices** - Simulators + real devices
5. **Always use Framer Motion** - Animations differentiate us from competitors
6. **Always implement observability** - Monitor performance and errors
6. **Always count user steps** - Minimize friction relentlessly

---

**Remember**: Every line of code serves the mission of connecting people through prayer. When in doubt, return to [ARTICLE.md](./ARTICLE.md) for guidance.

---

**Last Updated:** 2024-11-30  
**Version:** 1.0 (Reorganized Documentation)  
**Next Review:** After major feature additions