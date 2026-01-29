# Логіка процесу підключення та клейму (Gitcoin Passport Model)

## ⚠️ ВАЖЛИВО: Актуальна логіка

**Ця документація описує ПРАВИЛЬНУ логіку, яка відповідає концепції Gitcoin Passport:**

- ✅ **Scores зберігаються ТІЛЬКИ на blockchain (Aleo)** - НЕ в backend database
- ✅ **OAuth через popups** - користувач НЕ покидає головне вікно
- ✅ **Немає polling** - результат повертається миттєво через postMessage
- ✅ **Немає localStorage для scores** - тільки blockchain records
- ✅ **Backend database тільки для sessions** - НЕ для верифікацій

---

## Загальна схема

```
User → Connect Provider → Get Score → Claim Points (on Aleo) → Done
       (в popup)          (backend)    (claim_social_stamp transaction) ✅
```

### Claim flow (важливо)
- Після OAuth фронтенд викликає **claim_social_stamp** (не claim_point).
- **claim_point** вимагає, щоб commitment був уже зареєстрований on-chain; реєструє його лише **claim_social_stamp**. Якщо викликати тільки claim_point, finalize падає на `assert(binding.is_active)` і транзакція має статус "----" (revert).
- **claim_social_stamp** приймає: passport, platform_id, commitment, stamp_id, points. Потрібен stamp з маппінгу `stamps` з відповідним `platform_id` (адмін має створити stamp для Discord тощо).

### Приватність на Aleo:
- **Points** зберігаються в Passport record на Aleo blockchain
- **Commitment** зберігається в `social_commitments` mapping (публічно)
- Тільки власник може бачити деталі (points, commitment)
- Інші бачать тільки що commitment існує

### Чому в Leo Wallet видно поля з суфіксом .private?
- Гаманець **показує** вміст записів/приватних аргументів, щоб користувач міг підтвердити транзакцію перед підписом. Це очікувана поведінка.
- **On-chain** ці значення не зберігаються в відкритому вигляді: вони йдуть у proof і перевіряються валідаторами. В експлорері (Provable/AleoScan) приватні поля не відображаються в cleartext. Тобто "зашифровані" = не в публічному стані контракту; показ у гаманці — для consent.

---

## 1. OAuth провайдери (Discord, Telegram, TikTok)

### Крок 1: Connect Button (Popup)
**Файл:** `frontend/src/components/VerificationInstructions.tsx`

```typescript
const handleStartVerification = async (stampId: string) => {
  // 1. Перевірити Aleo wallet підключений
  if (!publicKey) {
    setShowWalletRequiredModal(true);
    return;
  }
  
  // 2. Відкрити OAuth popup (НЕ редирект!)
  const result = await startVerification(stampId, publicKey);
  
  // 3. Зберегти результат в component state (НЕ localStorage!)
  setVerificationResults(prev => ({
    ...prev,
    [stampId]: { ...result, commitment: result.commitment || '' }
  }));
};
```

**Файл:** `frontend/src/utils/backendAPI.ts`

```typescript
export const startVerification = (provider: string, passportId: string): Promise<VerificationResult> => {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/auth/${provider}/start?passportId=${passportId}`;
    const popup = window.open(url, 'oauth', 'width=600,height=700');
    
    // Listen for postMessage from popup
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'oauth-complete') {
        resolve(event.data.result);
      } else if (event.data.type === 'oauth-error') {
        reject(new Error(event.data.error));
      }
    };
    window.addEventListener('message', messageHandler);
  });
};
```

### Крок 2: Backend OAuth Flow
**Файл:** `backend/src/routes/auth.js` → `handleAuthStart()`

1. Backend отримує запит на `/auth/{provider}/start?passportId=...`
2. Створюється `sessionId` тільки для CSRF protection:
   ```javascript
   const sessionId = `${provider}_${uuidv4()}`;
   await saveSession({ sessionId, passportId, provider, status: 'in_progress' });
   ```
3. Генерується OAuth URL з `state=sessionId`
4. Backend робить редирект на OAuth провайдера

### Крок 3: Користувач авторизує доступ
- Користувач авторизує в popup вікні
- Провайдер перенаправляє на: `${BACKEND_URL}/auth/${provider}/callback?code=...&state=...`

### Крок 4: Обробка callback на backend
**Файл:** `backend/src/routes/auth.js` → `handleAuthCallback()`

1. Backend отримує `code` та `state` (sessionId)
2. Знаходить сесію в БД (для CSRF перевірки)
3. Обмін `code` на `access_token`
4. Отримання профілю через провайдер API
5. Розрахунок score через `calculate{Provider}Score()`
6. Генерація commitment: `hash(platformId:userId:secretSalt)`

### Крок 5: Повернення результату через postMessage
**Файл:** `backend/src/routes/auth.js` → `handleAuthCallback()`

**ВАЖЛИВО: НЕ зберігаємо в БД! Тільки повертаємо результат:**

```javascript
const frontendResult = {
  provider: result.provider || provider,
  score: result.score || 0,
  commitment: result.commitment || null,
  criteria: result.criteria || [],
  maxScore: result.maxScore || result.score || 0
  // НЕ повертаємо: userId, email, username, profile
};

res.send(`
  <!DOCTYPE html>
  <html>
    <head><title>Verification Complete</title></head>
    <body>
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-complete',
            provider: '${provider}',
            result: ${JSON.stringify(frontendResult)}
          }, '${FRONTEND_URL}');
          window.close();
        }
      </script>
    </body>
  </html>
`);
```

### Крок 6: Frontend отримує результат
**Файл:** `frontend/src/components/VerificationInstructions.tsx`

- Результат зберігається в `verificationResults` state (НЕ localStorage)
- Відображається UI з score та кнопкою "Claim Points"

### Крок 7: Claim Points (Aleo Transaction)
**Файл:** `frontend/src/components/VerificationInstructions.tsx`

```typescript
const handleClaimPoints = async (provider: string) => {
  const result = verificationResults[provider];
  
  // 1. Отримати passport record з wallet
  const passportRecords = await requestPassportRecords();
  const passportRecord = passportRecords.find(r => r.type === 'Passport');
  
  // 2. Конвертувати provider name в platform_id
  const platformId = providerToPlatformId(provider); // "discord" → 1
  
  // 3. Виклик Aleo wallet для claim_point
  const transaction = Transaction.createTransaction(
    publicKey,
    network,
    PROGRAM_ID,
    "claim_point",
    [
      passportRecord.plaintext,  // Private passport record
      `${platformId}u8`,         // Public platform_id
      result.commitment,          // Private social_commitment
      `${result.score}u64`        // Public points
    ],
    50000,
    false
  );
  
  const txId = await adapter.requestTransaction(transaction);
  
  // 4. Очистити verification result (points тепер на blockchain)
  setVerificationResults(prev => {
    const next = { ...prev };
    delete next[provider];
    return next;
  });
};
```

**Aleo Smart Contract:**
```leo
async transition claim_point(
    private passport: Passport,
    public platform_id: u8,
    private social_commitment: field,
    public points: u64
) -> (Passport, Future)
```

**Що відбувається в контракті:**
1. Перевіряє володіння passport
2. Перевіряє що `social_commitment` існує та активний (через `social_commitments` mapping)
3. Перевіряє що commitment ще не використаний для клейму
4. Перевіряє що user ще не клеймив points для цього platform_id
5. Оновлює passport: `total_points += points`, перераховує `humanity_score`
6. Зберігає claim в `point_claims` mapping (запобігає double claiming)

---

## 2. EVM/Solana Wallets

### Крок 1: Connect Wallet (в модальному вікні)
**Файл:** `frontend/src/components/VerificationInstructions.tsx`

```typescript
// User натискає "Start Verification" для EVM/Solana
if (stampId === 'ethereum' || stampId === 'eth_wallet') {
  setShowEVMWalletModal(true);
  return;
}
```

### Крок 2: Wallet Connection та Signing
**Файл:** `frontend/src/components/VerificationInstructions.tsx` → `WalletConnectModal.onConnect`

```typescript
// 1. Підключити wallet (MetaMask/Phantom)
const address = await connectWallet();

// 2. Створити SIWE message
const message = createSIWEMessage(address, publicKey);

// 3. Підписати через wallet
const signature = await signMessage(message);

// 4. Верифікувати на backend (SYNC, без sessions!)
const result = await verifyWallet('evm', address, signature, message, publicKey);

// 5. Зберегти результат
setVerificationResults(prev => ({
  ...prev,
  'ethereum': { ...result, commitment: result.commitment || '' }
}));
```

### Крок 3: Backend verification (sync endpoint)
**Файл:** `backend/src/routes/verify.js` → `POST /verify/wallet`

```javascript
router.post('/verify/wallet', async (req, res) => {
  const { type, address, signature, message, passportId } = req.body;
  
  // 1. Verify signature
  const isValid = verifySignature(type, message, signature);
  
  // 2. Fetch wallet data (Etherscan/Solscan API)
  const walletData = await fetchWalletData(type, address);
  
  // 3. Calculate score
  const score = calculateWalletScore(type, walletData);
  
  // 4. Generate commitment
  const commitment = generateCommitment(type, address);
  
  // 5. НЕ зберігати! Просто повернути
  res.json({
    score,
    commitment,
    criteria: walletData.criteria
  });
});
```

### Крок 4: Claim Points (той самий що для OAuth)
- Використовує `claim_point` з `platform_id` для EVM/Solana
- `platform_id = 6` для EVM, `platform_id = 7` для Solana

---

## 3. Telegram Bot (спеціальний кейс)

### Flow:

```typescript
// 1. User натискає "Connect Telegram"
const handleConnectTelegram = () => {
  // Відкрити Telegram bot в новому вікні
  const botUrl = `https://t.me/${BOT_USERNAME}?start=${publicKey}`;
  window.open(botUrl, '_blank');
  
  // Показати інструкцію
  setShowTelegramInstructions(true);
  
  // Запустити polling тільки для Telegram (виняток)
  startTelegramPolling();
};
```

**Backend webhook:**
- Telegram bot отримує `/start {passportId}` команду
- Backend розраховує score та генерує commitment
- Зберігає результат в session (тимчасово)
- Відправляє користувачу кнопку для завершення

**Frontend polling:**
```typescript
const startTelegramPolling = async () => {
  const interval = setInterval(async () => {
    const result = await fetch(`${BACKEND_URL}/auth/telegram/check?passportId=${publicKey}`)
      .then(r => r.json());
    
    if (result.verified) {
      clearInterval(interval);
      setVerificationResults(prev => ({
        ...prev,
        'telegram': result
      }));
    }
  }, 2000);
};
```

---

## Platform ID Mapping

**Файл:** `frontend/src/utils/platformMapping.ts`

```typescript
export const PLATFORM_IDS: Record<string, number> = {
  discord: 1,
  twitter: 2,
  github: 3,
  telegram: 4,
  tiktok: 5,
  ethereum: 6,  // EVM wallets
  eth_wallet: 6,
  evm: 6,
  solana: 7,
  google: 8,
  steam: 9,
};
```

---

## Загальні принципи (Gitcoin Passport Model)

### Privacy (Конфіденційність)
- **Commitment**: `commitment = hash(platformId:userId:secretSalt)` - зберігається в Aleo mapping
- **Backend НЕ зберігає**: scores, userId провайдера, email, username, profile
- **Backend зберігає**: тільки sessions (для CSRF protection)
- **Особисті дані**: тільки в Aleo private records

### Session Management
- **Sessions тільки для CSRF protection** - НЕ для tracking верифікацій
- **Немає polling** (крім Telegram) - результат повертається миттєво через postMessage або sync API
- **Sessions видаляються** після завершення OAuth flow

### Score Calculation
- **Backend розраховує score** - але НЕ зберігає
- **Score передається в frontend** - через postMessage або sync API
- **Score зберігається в Aleo** - через `claim_point` transition (оновлює `passport.total_points`)

### Aleo Smart Contract
- **`claim_point`** - оновлює Passport з новими points
- **`social_commitments` mapping** - публічний mapping для перевірки існування commitment
- **`point_claims` mapping** - запобігає double claiming з тим самим commitment
- **`user_platform_claims` mapping** - запобігає одному user клеймити points двічі для одного platform_id
- **Приватність**: тільки власник бачить деталі (points, commitment в passport record)
- **Публічна перевірка**: інші можуть перевірити що commitment існує

---

## Фінальний UX Flow

### Успішний flow (OAuth):

```
1. User: "Connect Discord"
   └─> Popup відкривається (600x700)
       └─> OAuth на Discord
           └─> User авторизує
               └─> Popup закривається
                   └─> postMessage з результатом
                       └─> Score з'являється на сторінці
                           └─> "Claim Points" button
                               └─> User натискає
                                   └─> Aleo wallet popup
                                       └─> User підписує transaction
                                           └─> claim_point executed
                                               └─> Points додані до passport
                                                   └─> Success ✅
```

**Користувач НЕ покидає головну сторінку!**

### Успішний flow (Wallet):

```
1. User: "Connect Ethereum"
   └─> Wallet modal відкривається
       └─> User підключає MetaMask
           └─> "Start Verification" button
               └─> User підписує SIWE message
                   └─> Backend verify (sync)
                       └─> Score з'являється
                           └─> "Claim Points" button
                               └─> Aleo wallet popup
                                   └─> claim_point executed
                                       └─> Points додані до passport ✅
```

---

## Що зберігається де

### Backend Database
- ✅ **Sessions** - тільки для CSRF protection (тимчасово)
- ❌ **НЕ зберігає**: scores, verifications, commitments, user data

### Frontend
- ✅ **Component state** - `verificationResults` (тимчасово, до клейму)
- ❌ **НЕ зберігає в localStorage**: scores, verifications

### Aleo Blockchain
- ✅ **Passport record** - `total_points`, `humanity_score` (приватно)
- ✅ **social_commitments mapping** - commitment => SocialBinding (публічно)
- ✅ **point_claims mapping** - commitment => PointClaim (публічно)
- ✅ **user_platform_claims mapping** - hash(user, platform) => bool (публічно)

---

## Файли, що беруть участь

### Frontend
- `frontend/src/components/VerificationInstructions.tsx` - головний компонент з popup logic та claim points
- `frontend/src/utils/backendAPI.ts` - API клієнт (popup, verifyWallet)
- `frontend/src/utils/platformMapping.ts` - provider to platform_id mapping
- `frontend/src/hooks/usePassport.ts` - Aleo passport operations
- `frontend/src/hooks/usePassportRecords.ts` - Aleo passport records

### Backend
- `backend/src/routes/auth.js` - OAuth routes (postMessage callback)
- `backend/src/routes/verify.js` - `/verify/wallet` sync endpoint
- `backend/src/providers/{provider}.js` - провайдер-специфічна логіка (без збереження)
- `backend/src/scoring/{provider}.js` - розрахунок score
- `backend/src/database/index.js` - тільки sessions (НЕ verifications)

### Smart Contract
- `src/main.leo` - `claim_point` transition ✅

---

## Security Hardening

### 🔐 postMessage Security
**Файл:** `frontend/src/utils/backendAPI.ts`

- ✅ **Strict origin check** - тільки BACKEND_URL та window.location.origin
- ✅ **Message structure validation** - перевірка типу та структури даних
- ✅ **Result validation** - перевірка score, commitment, criteria

**Захищає від:**
- Injection attacks з інших вкладок
- Malformed messages
- Type confusion attacks

### ⛓ Blockchain-Level Protection

**Aleo Smart Contract захищає від:**
1. **Double claiming** - через `point_claims` mapping
2. **Same user double claiming** - через `user_platform_claims` mapping
3. **Invalid commitment** - перевірка через `social_commitments` mapping
4. **Unauthorized claiming** - `passport.owner == self.caller`

**Принцип:** "Backend can lie, blockchain cannot"
- Навіть якщо backend скомпрометований, double-claim/spoofing/replay неможливі

### 🧹 UX Improvements
- ✅ UX hint: "Verification completed. Please claim points to store them on-chain"
- Нагадує користувачу про необхідність клейму

---

## Checklist (виконано)

### Backend
- [x] Видалено `saveVerification()` calls з `auth.js`
- [x] Змінено OAuth callback на postMessage HTML
- [x] Додано `/verify/wallet` sync endpoint
- [x] Залишено sessions тільки для CSRF
- [x] НЕ зберігаємо scores в БД

### Frontend
- [x] Замінено редиректи на popups в `VerificationInstructions.tsx`
- [x] Додано postMessage listener з strict origin check
- [x] Додано message validation
- [x] Видалено localStorage для scores
- [x] Видалено polling logic (крім Telegram)
- [x] Додано "Claim Points" UI
- [x] Додано UX hint для cleanup edge-case
- [x] Інтегровано Aleo wallet для `claim_point()`
- [x] Додано provider to platform_id mapping

### Smart Contract
- [x] `claim_point` transition вже є ✅
- [x] `social_commitments` mapping вже є ✅
- [x] `point_claims` mapping вже є ✅
- [x] `user_platform_claims` mapping вже є ✅

### Security
- [x] postMessage origin check ✅
- [x] Message structure validation ✅
- [x] UX hints для cleanup ✅
- [x] Blockchain-level protection ✅

---

## Опціональні покращення (майбутнє)

Див. `SECURITY_HARDENING.md` для деталей:
- 🧂 Commitment salt rotation (breaking change)
- ⛓ Binding commitment → passportId (breaking change)

**Поточна реалізація достатньо безпечна для production!**
