---
name: security-audit
description: "Perform a security audit on code or configuration files"
---

# Security Audit

Perform a comprehensive security audit checking for:

## OWASP Top 10 Vulnerabilities
1. **Injection** - SQL, NoSQL, OS, LDAP injection flaws
2. **Broken Authentication** - Session management issues
3. **Sensitive Data Exposure** - Unprotected sensitive data
4. **XML External Entities (XXE)** - Poorly configured XML parsers
5. **Broken Access Control** - Unauthorized access to functions/data
6. **Security Misconfiguration** - Insecure default configs
7. **Cross-Site Scripting (XSS)** - Unsanitized user input in output
8. **Insecure Deserialization** - Untrusted data deserialization
9. **Using Components with Known Vulnerabilities** - Outdated dependencies
10. **Insufficient Logging & Monitoring** - Missing audit trails

## Additional Checks
- Hardcoded secrets or credentials
- Insecure API endpoints
- Missing CSRF protection
- Insecure cookie settings
- Information disclosure in error messages
- Missing rate limiting
- Insecure file uploads

Provide findings with severity ratings (Critical, High, Medium, Low) and remediation steps.
