# TestFlight External Testing Requirements

**Status:** In Progress
**Target:** External Beta Testing (up to 10,000 testers)
**Last Updated:** December 22, 2025

---

## Requirements Checklist

### App Store Connect Configuration

| Requirement | Status | Notes |
|-------------|--------|-------|
| Beta App Description | READY | See `docs/legal/TESTFLIGHT-BETA-DESCRIPTION.md` |
| Feedback Email | NEEDED | Add your email (e.g., testflight@prayermap.net) |
| Contact Phone Number | NEEDED | Required for App Review |
| Privacy Policy URL | READY | https://prayermap.net/privacy.html |
| Age Rating Questionnaire | NEEDED | Complete in App Store Connect (deadline Jan 31, 2026) |

### Legal Documents

| Document | Status | Location |
|----------|--------|----------|
| Privacy Policy (Markdown) | COMPLETE | `docs/legal/PRIVACY-POLICY.md` |
| Privacy Policy (Web) | COMPLETE | `public/privacy.html` |
| Terms of Service (Markdown) | COMPLETE | `docs/legal/TERMS-OF-SERVICE.md` |
| Terms of Service (Web) | COMPLETE | `public/terms.html` |

### Technical Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| ITSAppUsesNonExemptEncryption | CONFIGURED | Set to `false` in app.config.ts |
| Bundle ID | CONFIGURED | `com.prayermap.app` |
| EAS Build Profiles | CONFIGURED | development, preview, production |
| Sign in with Apple | **NOT IMPLEMENTED** | **REQUIRED if app offers any signup** |

### App Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| No placeholder/test data | VERIFY | Check production build |
| No known crashes | VERIFY | Test before submission |
| Physical device testing | VERIFY | Test on actual iPhone |
| App completeness | VERIFY | No empty screens or placeholder text |

---

## Action Items for External Testing

### Immediate (Before Submission)

1. **Add Sign in with Apple**
   - Required by Apple if app offers any signup method
   - Already have `expo-apple-authentication` installed
   - Implementation needed in AuthModal and AuthContext
   - Priority: **HIGH**

2. **Complete App Store Connect Metadata**
   - Add feedback email
   - Add contact phone number
   - Complete age rating questionnaire
   - Add privacy policy URL
   - Copy beta app description

3. **Verify Build Quality**
   - Test on physical iPhone
   - Verify no crashes or major bugs
   - Confirm all features work as expected

### After External Approval

1. Create external tester group
2. Send TestFlight invites
3. Monitor feedback and crash reports

---

## Sign in with Apple Implementation

### What's Needed

1. **Enable capability in Xcode/EAS**
   - Already have `expo-apple-authentication` in package.json
   - Need to regenerate provisioning profile with capability

2. **Implement in AuthModal.tsx**
   ```tsx
   import * as AppleAuthentication from 'expo-apple-authentication';

   // Add Apple Sign In button below email/password form
   <AppleAuthentication.AppleAuthenticationButton
     buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
     buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
     onPress={handleAppleSignIn}
   />
   ```

3. **Implement in AuthContext.tsx**
   - Handle Apple credential response
   - Exchange for Supabase session
   - Store user in database

### Supabase Apple Auth Setup

1. Configure Apple provider in Supabase Dashboard
2. Add Service ID and other required credentials
3. Set callback URL in Apple Developer Portal

---

## Age Rating Questionnaire

Based on PrayerMap's content, likely answers:

| Question | Answer |
|----------|--------|
| Violence | None |
| Sexual Content | None |
| Profanity | None (moderated) |
| Drugs/Alcohol | None |
| Gambling | None |
| Horror/Fear | None |
| Mature/Suggestive Themes | None |
| Simulated Gambling | None |
| Contests | None |
| Unrestricted Web Access | No |

**Likely Rating:** 4+ (or possibly 9+ if user-generated content warning required)

---

## Privacy Nutrition Labels

Data types to disclose in App Store Connect:

### Data Collected

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Email Address | Yes | Yes | No |
| Name | Yes (optional) | Yes | No |
| Location (Precise) | Yes | Yes | No |
| Photos or Videos | Yes | Yes | No |
| Audio Data | Yes | Yes | No |
| User Content | Yes | Yes | No |
| Identifiers (Device ID) | Yes | No | No |
| Usage Data | Yes | No | No |
| Crash Data | Yes | No | No |

### Data NOT Collected

- Financial Information
- Contacts
- Browsing History
- Search History
- Health & Fitness
- Sensitive Info

---

## Timeline

| Step | When | Status |
|------|------|--------|
| Privacy Policy | Dec 22 | COMPLETE |
| Terms of Service | Dec 22 | COMPLETE |
| Beta Description | Dec 22 | COMPLETE |
| Sign in with Apple | TBD | NEEDED |
| App Store Connect Setup | TBD | NEEDED |
| Submit for Review | TBD | BLOCKED (Sign in with Apple) |
| External Testing Begins | TBD | After approval (24-48 hrs) |

---

## Resources

- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Sign in with Apple Guidelines](https://developer.apple.com/sign-in-with-apple/)
- [Privacy Nutrition Labels](https://developer.apple.com/app-store/app-privacy-details/)
