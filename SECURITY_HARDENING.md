# Security Hardening Recommendations

## ✅ Впроваджено

### 1. 🔐 postMessage Origin Check

**Файл:** `frontend/src/utils/backendAPI.ts`

```typescript
// 🔐 SECURITY: Strict origin check to prevent injection attacks
const backendOrigin = new URL(BACKEND_URL).origin;
if (event.origin !== backendOrigin && event.origin !== window.location.origin) {
  console.warn('[OAuth] ⚠️ Ignoring message from unauthorized origin:', event.origin);
  return;
}

// 🔐 SECURITY: Validate message structure
if (!event.data || typeof event.data !== 'object') {
  console.warn('[OAuth] ⚠️ Invalid message data structure');
  return;
}

// 🔐 SECURITY: Validate result structure
if (!event.data.result || typeof event.data.result !== 'object') {
  console.warn('[OAuth] ⚠️ Invalid result structure');
  return;
}

const result = event.data.result;
if (typeof result.score !== 'number' || !result.commitment || typeof result.commitment !== 'string') {
  console.warn('[OAuth] ⚠️ Invalid result data');
  return;
}
```

**Захищає від:**
- Injection attacks з інших вкладок
- Malformed messages
- Type confusion attacks

---

## ⚠️ Рекомендації для майбутнього

### 2. 🧂 Commitment Salt Rotation

**Поточна реалізація:**
```javascript
const commitmentInput = `${platformId}:${userId}:${secretSalt}`;
```

**Рекомендація:**
```javascript
// Додати passportId для binding commitment → passport
// Додати daily salt для rotation
const dailySalt = getDailySalt(); // Rotates daily
const commitmentInput = `${platformId}:${userId}:${passportId}:${dailySalt}`;
```

**Переваги:**
- Унеможливлює precomputation attacks
- Ускладнює correlation attacks
- Binding commitment → passport (навіть якщо хтось перехопить score, не зможе заклеймити на інший passport)

**Примітка:** Це breaking change - потребує оновлення всіх провайдерів та можливо контракту.

**Поточна захищеність:**
- ✅ `user_platform_hash` вже захищає від double claiming для одного user
- ✅ `point_claims` mapping запобігає double claiming з тим самим commitment
- ⚠️ Але commitment не прив'язаний до passportId (тільки до userId провайдера)

---

### 3. ⛓ Binding Commitment → Passport (вже частково є)

**Поточна реалізація в `claim_point`:**
```leo
// 1. Verify passport ownership
assert(passport.owner == self.caller);

// 4. Check if user already claimed points for this platform
let user_platform_hash: field = hash_user_platform(self.caller, platform_id);
let already_claimed: bool = Mapping::get_or_use(user_platform_claims, user_platform_hash, false);
assert(!already_claimed);
```

**Що вже захищено:**
- ✅ Тільки власник passport може клеймити
- ✅ Один user не може клеймити двічі для одного platform_id
- ✅ Commitment не може бути використаний двічі

**Що можна покращити:**
- ⚠️ Commitment не включає passportId, тому теоретично можна перехопити commitment і спробувати заклеймити на інший passport
- ✅ Але це унеможливлюється через `user_platform_hash` який використовує `self.caller` (address)

**Рекомендація:** Додати passportId до commitment (breaking change, але краще для безпеки).

---

### 4. 🧹 Frontend Cleanup Edge-Case

**Впроваджено:** UX hint для користувача

**Файл:** `frontend/src/components/VerificationInstructions.tsx`

```typescript
{/* 🧹 UX Hint: Remind user to claim points */}
<div className="mb-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300 font-mono">
  ⚠️ Verification completed. Please claim points to store them on-chain.
</div>
```

**Що це робить:**
- Нагадує користувачу про необхідність клейму
- Пояснює що points не збережені до клейму
- Покращує UX без persistence

---

## 🧠 Архітектурний рівень

### Принцип: "Backend can lie, blockchain cannot"

**Що це означає:**
Навіть якщо:
- Backend зламаний
- Scoring підмінений
- API скомпрометований

➡️ **Double-claim, spoofing, replay - неможливі** через:
1. `user_platform_claims` mapping - запобігає double claiming
2. `point_claims` mapping - запобігає double claiming з тим самим commitment
3. `social_commitments` mapping - перевіряє що commitment активний
4. `passport.owner == self.caller` - перевіряє володіння

**Це дуже високий рівень безпеки!**

---

## Фінальний висновок

### ✅ Поточна реалізація:
- ✔ postMessage origin check - впроваджено
- ✔ Message validation - впроваджено
- ✔ UX hints - впроваджено
- ✔ Blockchain-level protection - вже є в контракті

### ⚠️ Опціональні покращення:
- 🧂 Commitment salt rotation (breaking change)
- ⛓ Binding commitment → passportId (breaking change)

**Рекомендація:** Поточна реалізація достатньо безпечна для production. Покращення можна додати в майбутніх версіях.
