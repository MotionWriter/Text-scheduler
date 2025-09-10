# Security Improvements Plan

## Overview
Comprehensive security analysis and remediation plan for the Men's Study Message Scheduler application based on code review findings.

## Critical Security Issues

### 1. API Key Security Issues
**Current State:**
- API keys generated with `Math.random()` (convex/apiKeys.ts:174-179)
- SHA-256 hashing for storage (basic implementation)

**Issues:**
- Insufficient entropy for cryptographic security
- Potential brute force attacks on weak keys
- Predictable key generation

**Solution:**
```typescript
// Replace Math.random() with crypto.getRandomValues()
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  let result = 'sk_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}
```

**Priority:** Critical
**Files:** `convex/apiKeys.ts`

### 2. CORS Configuration Risk
**Current State:**
- All API endpoints use `"Access-Control-Allow-Origin": "*"` (convex/router.ts)
- No origin validation

**Issues:**
- Allows cross-origin requests from any domain
- Potential for CSRF attacks and data theft

**Solution:**
```typescript
// Implement origin validation
const allowedOrigins = [
  'https://yourdomain.com',
  process.env.CONVEX_SITE_URL,
  'http://localhost:5173' // Development only
];

const origin = request.headers.get('origin');
const corsOrigin = allowedOrigins.includes(origin) ? origin : 'null';

headers: {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": corsOrigin
}
```

**Priority:** Critical
**Files:** `convex/router.ts`

### 3. Information Disclosure in Logging
**Current State:**
- Extensive console logging with sensitive data (convex/router.ts:145-234)
- API keys, user IDs, and error details logged

**Issues:**
- Information leakage in server logs
- Potential credential exposure

**Solution:**
- Remove production logging
- Implement sanitized error responses
- Add environment-based logging levels

**Priority:** Critical
**Files:** `convex/router.ts`

### 4. Missing Environment Variable Validation
**Current State:**
- Environment variables used without validation
- No startup checks for required keys

**Issues:**
- Application failure if env vars missing
- Unclear error messages for configuration issues

**Solution:**
```typescript
// Add startup validation
const requiredEnvVars = [
  'RESEND_API_KEY',
  'TWILIO_ACCOUNT_SID', 
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

**Priority:** Critical
**Files:** New utility file, integrate into auth config

### 5. Missing Rate Limiting
**Current State:**
- No rate limiting on any API endpoints
- Unrestricted API usage

**Issues:**
- DoS attack vulnerability
- API abuse potential
- Resource exhaustion

**Solution:**
- Implement rate limiting per API key
- Add Convex-based rate limiting using database
- Different limits for different endpoint types

**Priority:** Critical
**Files:** `convex/router.ts`, new rate limiting utility

## High Priority Issues

### 6. Input Validation Gaps
**Current State:**
- Limited validation on user inputs
- Basic character limits only (convex/userCustomMessages.ts)

**Issues:**
- Potential injection attacks
- Data corruption risks
- XSS vulnerabilities

**Solution:**
- Comprehensive input sanitization
- Validation schemas for all user inputs
- Content filtering for malicious patterns

**Priority:** High
**Files:** Multiple files with user input

### 7. Password Reset Security
**Current State:**
- Email-based reset with clickable links (convex/auth.ts:27-49)
- 1-hour expiration

**Issues:**
- Email interception risks
- No additional verification

**Solution:**
- Add email confirmation step
- Shorter token expiration (15 minutes)
- IP address validation
- Rate limiting on reset requests

**Priority:** High  
**Files:** `convex/auth.ts`

## Medium Priority Issues

### 8. Session Management
**Current State:**
- Convex Auth handles sessions
- No explicit timeout configuration

**Issues:**
- Unclear session lifetime
- No refresh token rotation

**Solution:**
- Configure explicit session timeouts
- Implement session refresh mechanisms
- Add concurrent session limits

**Priority:** Medium
**Files:** `convex/auth.config.ts`

### 9. Admin Authorization
**Current State:**
- Simple boolean flag check (convex/_lib/adminAuth.ts)
- No additional verification layers

**Issues:**
- Privilege escalation if user record compromised
- No audit trail for admin actions

**Solution:**
- Multi-factor admin verification
- Time-based admin session limits
- Admin action audit logging

**Priority:** Medium
**Files:** `convex/_lib/adminAuth.ts`

## Low Priority Improvements

### 10. Content Security Policy
**Current State:**
- No CSP headers implemented
- No XSS protection headers

**Solution:**
- Implement CSP headers in Vite config
- Add security headers middleware

**Priority:** Low
**Files:** `vite.config.ts`, new middleware

### 11. Audit Logging
**Current State:**
- No security event logging
- No forensic capabilities

**Solution:**
- Log authentication events
- Track admin actions
- Monitor API usage patterns
- Failed login attempt tracking

**Priority:** Low
**Files:** New audit logging system

### 12. Data Encryption at Rest
**Current State:**
- Data stored in plain text
- Convex handles transport encryption

**Solution:**
- Field-level encryption for phone numbers
- Message content encryption
- Key rotation strategy

**Priority:** Low
**Files:** Database layer encryption utilities

## Implementation Timeline

### Phase 1: Critical Fixes (Week 1)
- [ ] Fix API key generation
- [ ] Implement proper CORS
- [ ] Remove production logging
- [ ] Add environment validation
- [ ] Implement basic rate limiting

### Phase 2: High Priority (Week 2)
- [ ] Add comprehensive input validation
- [ ] Improve password reset security
- [ ] Add request sanitization

### Phase 3: Medium Priority (Week 3-4)
- [ ] Enhance session management
- [ ] Improve admin authorization
- [ ] Add basic audit logging

### Phase 4: Low Priority (Ongoing)
- [ ] Implement CSP headers
- [ ] Full audit logging system
- [ ] Data encryption at rest

## Security Testing Plan

### Automated Testing
- [ ] API security tests
- [ ] Input validation tests
- [ ] Authentication bypass tests
- [ ] Rate limiting tests

### Manual Testing
- [ ] Penetration testing
- [ ] Code review
- [ ] Configuration review
- [ ] Access control testing

## Monitoring & Alerting

### Security Metrics
- Failed authentication attempts
- Rate limit violations
- Suspicious API usage patterns
- Admin action frequency

### Alerts
- Multiple failed logins
- Rate limit exceeded
- Environment variable missing
- Unusual API usage

## Compliance Considerations

### Data Protection
- User consent for data collection
- Data retention policies
- Right to deletion
- Data export capabilities

### Security Standards
- Follow OWASP guidelines
- Implement security headers
- Regular security updates
- Vulnerability scanning

## Documentation Updates Required

- [ ] Update API documentation with security requirements
- [ ] Add security configuration guide
- [ ] Create incident response procedures
- [ ] Document security testing procedures

---

**Last Updated:** 2025-01-09  
**Status:** Draft  
**Priority:** Critical - Immediate implementation recommended