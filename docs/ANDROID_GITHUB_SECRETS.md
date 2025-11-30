# Android GitHub Secrets - Quick Reference

## Required Secrets

Set these up in: **GitHub Settings → Secrets and variables → Actions**

### 1. ANDROID_KEYSTORE_BASE64
```bash
# Generate this value:
base64 prayermap-release.jks | tr -d '\n' > keystore.base64.txt

# Then copy the entire contents of keystore.base64.txt
```

### 2. ANDROID_KEYSTORE_PASSWORD
```
The password you used when creating the keystore (-storepass flag)
Example: MySecureStorePassword123!
```

### 3. ANDROID_KEY_ALIAS
```
The alias you used when creating the keystore (-alias flag)
Default: prayermap
```

### 4. ANDROID_KEY_PASSWORD
```
The key password you used when creating the keystore (-keypass flag)
Example: MySecureKeyPassword456!
```

---

## Creating a New Keystore

If you need to create a new keystore:

```bash
keytool -genkey -v \
  -keystore prayermap-release.jks \
  -alias prayermap \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD
```

**⚠️ CRITICAL**:
- Save the passwords in a password manager immediately
- Backup the keystore file securely
- You MUST use the same keystore for all future releases

---

## Encoding Keystore to Base64

### macOS/Linux:
```bash
base64 prayermap-release.jks | tr -d '\n' > keystore.base64.txt
```

### Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("prayermap-release.jks")) | Out-File -FilePath keystore.base64.txt -Encoding ASCII -NoNewline
```

---

## Verification

Test your keystore locally before uploading:

```bash
# List keystore contents
keytool -list -v -keystore prayermap-release.jks

# Test the password
keytool -list -keystore prayermap-release.jks -storepass YOUR_STORE_PASSWORD
```

---

## Triggering Builds

### Automatic (Tag-based):
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Manual:
1. Go to GitHub → Actions
2. Select "Android Build" workflow
3. Click "Run workflow"
4. Choose build type (apk/aab/both)

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Keystore not found" | Check all 4 secrets are set with exact names |
| "Wrong password" | Verify ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_PASSWORD |
| "Alias not found" | Verify ANDROID_KEY_ALIAS matches keystore |
| No artifacts | Check workflow logs for build errors |

---

## Security Reminders

- ❌ Never commit keystore files to git
- ❌ Never share passwords in chat/email
- ❌ Never log secrets in workflow outputs
- ✅ Use password manager for credentials
- ✅ Enable 2FA on GitHub
- ✅ Backup keystore in encrypted storage
- ✅ Limit repository access to trusted team

---

For detailed instructions, see: [ANDROID_BUILD_SETUP.md](./ANDROID_BUILD_SETUP.md)
