# Privacy & Anonymity Audit Report

## 🔴 Critical Issues Found

### 1. **Provider Account IDs Stored in Plaintext**
**Location:** `backend/src/database/index.js`, `backend/src/routes/auth.js`

**Problem:**
- `providerAccountId` (Discord ID, Google ID, Telegram ID) is stored in database in plaintext
- This allows linking wallet addresses to real social media accounts
- Violates zero-knowledge privacy principles

**Current Code:**
```javascript
providerAccountId: providerAccountId || null,  // Stored as-is
```

**Fix Required:**
- Replace `providerAccountId` with `commitment` (hashed value)
- Use commitment generation: `SHA-256(platform_id:user_id:secret_salt)`

---

### 2. **Personal Data in Metadata**
**Location:** `backend/src/routes/auth.js:133-137`

**Problem:**
- Full user data stored in `metadata` field (JSONB)
- Contains: email, username, profile links, etc.
- This data is visible in database and can be linked to users

**Current Code:**
```javascript
metadata: {
  ...result,  // Contains all user data
  accessTokenHash: result.accessToken ? hashToken(result.accessToken) : null
}
```

**Fix Required:**
- Store only commitments and scores in metadata
- Remove all personal identifiers (email, username, profile links)

---

### 3. **Discord Profile Storage**
**Location:** `backend/src/database/index.js:524-578`, `backend/src/routes/auth.js:144-155`

**Problem:**
- Discord profiles stored with real data:
  - `discordId` (real Discord user ID)
  - `discordUsername` (real username)
  - `discordNickname` (real nickname)
  - `discordAvatarUrl` (real avatar URL)
  - `discordProfileLink` (real profile link)

**Current Code:**
```javascript
await saveProfile(providerAccountId, result.profile);
// Stores: discordId, discordUsername, discordNickname, discordAvatarUrl, discordProfileLink
```

**Fix Required:**
- Remove profile storage entirely
- Use only commitments for all operations
- Profile data should only exist in user's wallet as private records

---

### 4. **Telegram Profile Storage**
**Location:** `backend/src/routes/auth.js:321-339`

**Problem:**
- Telegram user IDs and profile data stored
- Can be linked to wallet addresses

**Fix Required:**
- Store only commitments, not real Telegram IDs

---

## ✅ What's Working Correctly

### 1. **Access Tokens**
- ✅ Access tokens are hashed before storage (`hashToken` function)
- ✅ Never stored in plaintext

### 2. **Frontend Storage**
- ✅ Uses commitments in localStorage (`frontend/src/lib/commitments.ts`)
- ✅ Wallet addresses stored (necessary for connection)
- ✅ No personal data in frontend storage

### 3. **Aleo Smart Contract**
- ✅ Uses private records (`record Passport`, `record StampRecord`)
- ✅ Uses commitments (`social_commitment`, `stamps_commitment`)
- ✅ Zero-knowledge architecture correct

### 4. **Commitment Generation**
- ✅ Correct format: `SHA-256(platform_id:user_id:secret_salt)`
- ✅ Implemented in both frontend and backend

---

## 🔧 Required Fixes

### Priority 1: Critical (Privacy Violations)

1. **Replace providerAccountId with commitment**
   - Change database schema: `provider_account_id` → `commitment`
   - Update all save/read operations
   - Use commitment generation function

2. **Remove personal data from metadata**
   - Store only: `commitment`, `score`, `criteria`, `accessTokenHash`
   - Remove: `email`, `username`, `profile`, `userId` (from provider)

3. **Remove profile storage**
   - Delete `saveProfile()` function calls
   - Remove profile table/queries
   - Remove Discord/Telegram profile data storage

### Priority 2: Important (Data Minimization)

4. **Clean metadata in existing data**
   - Migration script to remove personal data
   - Keep only commitments and scores

5. **Update API responses**
   - Never return `providerAccountId` in API responses
   - Return only commitments

---

## 📊 Current Data Flow (Problematic)

```
User → OAuth Provider → Backend
                          ↓
                    Store: providerAccountId (Discord ID)
                    Store: metadata (full user data)
                    Store: profile (Discord username, avatar, etc.)
                          ↓
                    Database (PostgreSQL/local_db.json)
```

## 📊 Required Data Flow (Privacy-First)

```
User → OAuth Provider → Backend
                          ↓
                    Generate: commitment = SHA-256(platform_id:user_id:salt)
                    Store: commitment only
                    Store: score only
                          ↓
                    Database (only commitments, no personal data)
                          ↓
                    Frontend (only commitments in localStorage)
                          ↓
                    Aleo Blockchain (private records with commitments)
```

---

## 🔐 Privacy Principles to Follow

1. **Zero-Knowledge**: Never store what you don't need to verify
2. **Commitments Only**: Use cryptographic commitments, not real IDs
3. **Data Minimization**: Store only scores and commitments
4. **No Linking**: Cannot link wallet address to social media account
5. **Private Records**: All sensitive data in Aleo private records only

---

## ✅ FIXES APPLIED

### 1. **Provider Account IDs → Commitments**
- ✅ Replaced `providerAccountId` with `commitment` in database operations
- ✅ All providers now generate and return commitments
- ✅ Database column `provider_account_id` now stores commitments (backward compatible)

### 2. **Metadata Sanitization**
- ✅ Removed all personal data from metadata storage
- ✅ Metadata now contains only: `commitment`, `score`, `maxScore`, `criteria`
- ✅ Removed: `email`, `username`, `profile`, `userId` from providers

### 3. **Profile Storage Removed**
- ✅ Removed `saveProfile()` function calls
- ✅ Removed profile endpoints from `/user/:id/profile`
- ✅ Discord/Telegram profile data no longer stored

### 4. **All Providers Updated**
- ✅ Discord: Returns commitment only
- ✅ Telegram: Returns commitment only
- ✅ Google: Returns commitment only
- ✅ GitHub: Returns commitment only
- ✅ Twitter: Returns commitment only
- ✅ TikTok: Returns commitment only
- ✅ EVM: Returns commitment only

### 5. **Access Tokens**
- ✅ Already hashed before storage (verified)
- ✅ Never stored in plaintext

---

## ✅ Current Status: PRIVACY-FIRST

**Data Stored:**
- ✅ Only commitments (hashed values)
- ✅ Scores and criteria
- ✅ Hashed access tokens
- ✅ Wallet addresses (necessary for connection)

**Data NOT Stored:**
- ✅ No provider account IDs (Discord ID, Google ID, etc.)
- ✅ No personal information (email, username, profile)
- ✅ No social media profiles
- ✅ No linking between wallet and social accounts

**Privacy Level:** HIGH ✅
**Anonymity:** PRESERVED ✅
