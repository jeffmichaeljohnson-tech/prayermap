# Security Audit

Perform a security audit on the selected code or file.

## Check For

### Environment Variables
- [ ] No secrets prefixed with VITE_ (exposes to browser)
- [ ] Service role keys only used server-side
- [ ] Sensitive keys not hardcoded

### Supabase/Database
- [ ] RLS enabled on all tables
- [ ] Proper RLS policies for CRUD operations
- [ ] No raw SQL with user input (use parameterized queries)
- [ ] Auth checks before sensitive operations

### Input Validation
- [ ] User input validated server-side
- [ ] Content sanitized before display
- [ ] File uploads validated (type, size)
- [ ] Rate limiting on public endpoints

### Client-Side
- [ ] No secrets in client code
- [ ] Proper error handling (no stack traces to users)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection on forms

## Output Format
```
🔴 CRITICAL: [issue] at [location]
   Fix: [recommended fix]

🟡 WARNING: [issue] at [location]
   Fix: [recommended fix]

🟢 PASSED: [what was checked and passed]
```
