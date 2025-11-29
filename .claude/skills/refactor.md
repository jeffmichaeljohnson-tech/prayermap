---
name: refactor
description: "Guide for refactoring code to improve quality without changing behavior"
---

# Refactoring Guide

When refactoring, follow these principles:

## Goals
- Improve readability without changing functionality
- Reduce complexity and duplication
- Make code easier to test and maintain

## Refactoring Checklist

### Extract & Simplify
- [ ] Extract repeated code into reusable functions
- [ ] Break large functions into smaller, focused ones
- [ ] Replace magic numbers/strings with named constants
- [ ] Simplify complex conditionals

### Naming
- [ ] Rename variables to be more descriptive
- [ ] Rename functions to describe what they do
- [ ] Use consistent naming conventions

### Structure
- [ ] Group related code together
- [ ] Separate concerns (data, logic, presentation)
- [ ] Remove dead code
- [ ] Organize imports

### Types (TypeScript)
- [ ] Add missing type annotations
- [ ] Replace `any` with proper types
- [ ] Use type guards where needed
- [ ] Create interfaces for repeated object shapes

## Important
- Make small, incremental changes
- Verify behavior hasn't changed after each step
- Keep the test suite passing
