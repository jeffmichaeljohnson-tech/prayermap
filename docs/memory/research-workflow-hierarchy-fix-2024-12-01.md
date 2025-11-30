# Research Workflow Hierarchy Fix - December 1, 2024

## Problem Identified

The Research Agent was skipping the mandatory `memory_search` step and going directly to web search, violating the established research hierarchy.

**Root Cause**: Contradictory instructions across multiple documentation files:
- Some files said "Official docs first"
- Some files said "Memory first" 
- No explicit tool call requirements
- Ambiguous priority ordering

## Contradictions Found & Fixed

### 1. Research Agent Rules (`.cursor/rules/research-agent.mdc`)
**Issue**: Top section said "Official Documentation FIRST" but workflow said "Memory First"
**Fix**: Added explicit STEP 0 at top: "QUERY MEMORY FIRST" with mandatory tool call instructions

### 2. CLAUDE.md
**Issue**: Line 98 said "Official docs first, always"
**Fix**: Changed to "Memory search first, then official docs"

### 3. PROJECT-GUIDE.md  
**Issue**: Line 40 said "ALWAYS check official documentation BEFORE making decisions"
**Fix**: Added explicit Step 1/Step 2 workflow with memory_search tool call

### 4. agent-orchestration.mdc
**Issue**: Line 32 said "ALWAYS consult official documentation" without memory step
**Fix**: Added STEP 1/STEP 2 structure with memory_search first

### 5. AI-AGENTS.md
**Issue**: Research Agent workflow didn't include memory_search step
**Fix**: Updated workflow to include mandatory memory_search call

### 6. core-rules.mdc
**Issue**: Said "ALWAYS check the most recent official documentation before deciding"
**Fix**: Added STEP 1/STEP 2 structure with memory_search first

### 7. ARTICLE.md Tool Hierarchy
**Issue**: Didn't mention memory_search MCP tool
**Fix**: Added memory_search as #1 priority when available, with fallback hierarchy

### 8. agent-orchestration.mdc Priority Conflict
**Issue**: Both observability and memory marked "MANDATORY" and "TOP PRIORITY" with no order
**Fix**: Created clear STEP 0/STEP 1/STEP 2 sequence:
- STEP 0: Initialize observability (enables logging)
- STEP 1: Query memory (learn from past)
- STEP 2: Continue observability requirements

## Key Improvements Made

### Explicit Tool Call Requirements
- Added mandatory `memory_search` tool call format everywhere
- Example: `memory_search({ query: "research topic", project: "prayermap", limit: 10 })`
- Clear "FORBIDDEN ACTIONS" list

### Clear Workflow Hierarchy
**Before**: Ambiguous, contradictory instructions
**After**: 
1. STEP 0: Initialize observability
2. STEP 1: Query memory first (`memory_search` tool)
3. STEP 2: If memory insufficient, THEN official docs
4. STEP 3: If still insufficient, THEN web search

### Consistent Language
- All files now use same terminology
- "Memory search first" consistently stated
- "Then official docs" consistently stated
- No more conflicting "TOP PRIORITY" statements

## Files Modified

1. `.cursor/rules/research-agent.mdc` - Added STEP 0, explicit tool calls, forbidden actions
2. `CLAUDE.md` - Updated Never Do and Always Do sections
3. `PROJECT-GUIDE.md` - Updated PRINCIPLE 1 and Never Do/Always Do sections
4. `.cursor/rules/agent-orchestration.mdc` - Added clear startup sequence, clarified memory query process
5. `AI-AGENTS.md` - Updated Research Agent workflow
6. `.cursor/rules/core-rules.mdc` - Added STEP 1/STEP 2 structure
7. `ARTICLE.md` - Updated tool hierarchy to include memory_search MCP tool

## Expected Impact

- ✅ Agents will call `memory_search` before web searches
- ✅ Clear, actionable instructions reduce ambiguity
- ✅ Prevents duplicate research
- ✅ Ensures consistency with past decisions
- ✅ No more conflicting priorities

## Key Takeaway

**The research workflow hierarchy is now:**
1. **Memory Search FIRST** (via `memory_search` MCP tool)
2. **Official Documentation SECOND** (after checking memory)
3. **Web Search LAST** (only if memory and docs insufficient)

This prevents duplicate work, ensures consistency, and leverages institutional knowledge already captured.

## Date
2024-12-01

## Agent
Claude (Composer) - Research workflow optimization

## Related Topics
- research-workflow
- memory-system
- agent-coordination
- documentation-consistency
- workflow-hierarchy

