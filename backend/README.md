# Universal Verification System Backend

A secure backend API for multi-provider verification system supporting OAuth (Google, Twitter, Discord, GitHub, Steam) and EVM wallets (MetaMask, WalletConnect, Phantom).

## Features

- **Multi-Provider OAuth**: Google, Twitter, Discord, GitHub, Steam
- **EVM Wallet Verification**: MetaMask, WalletConnect, and other EVM-compatible wallets via SIWE
- **Unified Verification API**: Single endpoint to initiate and check verification status
- **Persistent Storage**: PostgreSQL (production) or in-memory (development) fallback
- **Security**: Secrets never exposed to frontend, PKCE for OAuth, signature verification for wallets
- **Scoring System**: Automatic score calculation based on account activity and verification criteria

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Configure OAuth credentials for each provider you want to use:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Steam OpenID
STEAM_API_KEY=your_steam_api_key

# Etherscan (for EVM wallet verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Database (optional - uses in-memory if not set)
DATABASE_URL=postgresql://user:password@localhost:5432/zkpersona
```

## Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Configuration

- **GET `/config/status`** - Get configuration status for all providers

### Unified Verification

- **POST `/verify`** - Initiate verification for any provider
  - Body: `{ provider: 'google'|'twitter'|'discord'|'github'|'steam'|'evm', userId: string }`
  - Returns: Redirect URL for OAuth providers or message to sign for wallets

- **GET `/verify/:userId`** - Get all verifications for a user
- **GET `/verify/:userId/:provider`** - Get specific verification status

### OAuth Routes (Automatic)

- **GET `/auth/:provider/start`** - Initiate OAuth flow (redirects to provider)
- **GET `/auth/:provider/callback`** - OAuth callback handler (redirects to frontend)
- **GET `/auth/:provider/status`** - Check OAuth verification status

### Wallet Routes

- **POST `/wallet/connect`** - Initiate wallet verification
  - Body: `{ userId: string, walletAddress: string }`
  - Returns: `{ sessionId, message, domain, nonce }` for signing

- **POST `/wallet/verify`** - Verify wallet signature
  - Body: `{ sessionId: string, signature: string }`
  - Returns: Verification result with score

- **GET `/wallet/status/:sessionId`** - Get wallet verification status

### User Routes

- **GET `/user/:id/score`** - Get total score and breakdown by provider
- **GET `/user/:id/verifications`** - Get all verifications for a user

## Usage Examples

### 1. Check Configuration

```bash
curl http://localhost:3001/config/status
```

### 2. Initiate Google OAuth

```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "userId": "user123"}'
```

Response:
```json
{
  "status": "redirect_required",
  "provider": "google",
  "redirectUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 3. Verify EVM Wallet

```bash
# Step 1: Connect wallet
curl -X POST http://localhost:3001/wallet/connect \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "walletAddress": "0x..."}'

# Step 2: User signs message, then verify
curl -X POST http://localhost:3001/wallet/verify \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "wallet_xxx", "signature": "0x..."}'
```

### 4. Get User Score

```bash
curl http://localhost:3001/user/user123/score
```

Response:
```json
{
  "userId": "user123",
  "totalScore": 50,
  "verifiedCount": 2,
  "breakdown": {
    "google": { "score": 15, "maxScore": 15, "verifiedAt": "2026-01-01T00:00:00Z" },
    "evm": { "score": 35, "maxScore": 35, "verifiedAt": "2026-01-01T00:00:00Z" }
  }
}
```

## Database Schema

### verifications

Stores all verification records:

- `id` (UUID) - Primary key
- `user_id` (VARCHAR) - User identifier
- `provider` (VARCHAR) - Provider name (google, twitter, evm, etc.)
- `provider_account_id` (VARCHAR) - Provider-specific account ID
- `score` (INTEGER) - Points awarded
- `max_score` (INTEGER) - Maximum possible score
- `status` (VARCHAR) - Verification status (pending, verified, failed)
- `metadata` (JSONB) - Provider-specific metadata
- `access_token_hash` (VARCHAR) - Hashed access token (never store raw tokens)
- `verified_at` (TIMESTAMP) - When verification completed
- `expires_at` (TIMESTAMP) - When verification expires (null for permanent)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### verification_sessions

Stores OAuth state and session data:

- `id` (UUID) - Primary key
- `session_id` (VARCHAR) - Unique session identifier
- `user_id` (VARCHAR) - User identifier
- `provider` (VARCHAR) - Provider name
- `status` (VARCHAR) - Session status
- `state_data` (JSONB) - OAuth state, PKCE verifiers, etc.
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP)

## Security Considerations

1. **Secrets Management**: All CLIENT_SECRET values are stored server-side only
2. **Token Hashing**: Access tokens are hashed before storage (never store raw tokens)
3. **PKCE**: Used for OAuth flows that support it (Google, Twitter)
4. **Signature Verification**: All wallet signatures are cryptographically verified
5. **Redirect Validation**: Redirect URIs are validated to prevent open redirects
6. **HTTPS**: Required in production (configure reverse proxy/load balancer)

## Development Notes

- Without `DATABASE_URL`, system uses in-memory storage (data lost on restart)
- Sessions expire after 1 hour
- All timestamps are stored in UTC

## License

MIT
