# ZkPersona

A decentralized identity verification system on the Aleo blockchain with full zero-knowledge encryption.

## About the Project

ZkPersona is a digital identity system that allows users to prove their identity through a secure, decentralized system without revealing private data. The system is inspired by Gitcoin Passport but with full zero-knowledge encryption support through Leo smart contracts.

### Key Features

- **Private Passports**: All user data is stored as private records in the wallet
- **Stamps System**: Users earn stamps by completing verification tasks
- **Humanity Score**: A score from 0 to 100 calculated based on stamps and points
- **Zero-Knowledge Proofs**: Access proofs are generated locally in the wallet without revealing private data
- **Admin Panel**: Management system with roles and permissions
- **Full Encryption**: All sensitive data is encrypted using Aleo ZK proofs

## How It Works

### Architecture

1. **Passport Creation**: User creates a private passport stored only in their wallet
2. **Stamp Issuance**: Administrators issue stamps to users as private records
3. **Stamp Aggregation**: User aggregates their stamps locally in the wallet
4. **Proof Generation**: For dApp access, user generates a ZK proof locally
5. **Verification**: dApps verify the proof without knowing private data

### Privacy

- Passports are stored as private records in the user's wallet
- Stamps are issued as private records without revealing passport state
- Proofs are generated locally in the wallet
- Only public outputs (nullifier, validity) are sent to dApps
- Nullifier prevents reuse without revealing identity

### Humanity Score Formula

```
humanity_score = min(100, stamps * 5 + points / 100)
```

## Project Structure

```
passport/
├── src/
│   └── main.leo          # Leo smart contract
├── frontend/
│   ├── src/
│   │   ├── pages/       # Application pages
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Aleo utility functions
│   └── e2e/             # E2E tests
└── README.md
```

## Installation and Setup

### Requirements

- Node.js 18+
- Leo CLI
- Leo Wallet or Puzzle Wallet

### Smart Contract

1. Compile the Leo program:
```bash
cd src
leo build
```

2. Deploy the contract to Aleo (update deployment method as needed)

3. Update `frontend/src/deployed_program.ts` with your deployed program ID

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start dev server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

### Discord OAuth (production / Railway)

To enable Discord verification when the backend runs on Railway:

1. **Discord Developer Portal**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications) → your app (or create one).
   - **OAuth2 → Redirects**: add  
     `https://zkpersona-production.up.railway.app/auth/discord/callback`  
     (or your Railway backend URL + `/auth/discord/callback`).
   - Copy **Client ID** and **Client Secret**.

2. **Railway**
   - Open your backend service → **Variables**.
   - Add:
     - `DISCORD_CLIENT_ID` = your Discord Client ID  
     - `DISCORD_CLIENT_SECRET` = your Discord Client Secret  
   - Also set `BACKEND_URL` and `FRONTEND_URL` if not already (e.g.  
     `BACKEND_URL` = `https://zkpersona-production.up.railway.app`,  
     `FRONTEND_URL` = `https://zk-persona.vercel.app`).
   - Redeploy the backend so the new variables are applied.

3. **Local**
   - Use `backend/.env` with `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` (and `BACKEND_URL` / `FRONTEND_URL` as needed).

## Testing

### Unit Tests
```bash
cd frontend
npm test
```

### Tests with UI
```bash
npm run test:ui
```

### Tests with Coverage
```bash
npm run test:coverage
```

### E2E Tests
```bash
npm run test:e2e
```

See the `frontend` folder for test setup and scripts.

## Smart Contract

### Core Structures

- `Passport`: Private passport record with commitments
- `StampRecord`: Private stamp record issued to user
- `StampMetadata`: Public stamp metadata
- `Admin`: Administrator structure with permissions
- `Nullifier`: Record to prevent reuse

### Admin Functions

- `initialize(owner)` - Initialize first admin (one-time)
- `add_admin(address, permissions)` - Add admin with permissions
- `remove_admin(address)` - Remove admin
- `create_stamp(points)` - Create new stamp
- `edit_stamp(stamp_id, points, is_active)` - Edit stamp
- `delete_stamp(stamp_id)` - Delete stamp
- `issue_stamp(user_passport, user, stamp_id)` - Issue stamp to user

### User Functions

- `create_passport(nonce)` - Create passport
- `aggregate_stamps(passport, stamps..., secret)` - Aggregate stamps
- `prove_access(passport, stamps..., secret, app_id, min_score)` - Generate ZK proof

### Admin Permissions

Permission bitmap:
- `1` (0b0001) = Create
- `2` (0b0010) = Edit
- `4` (0b0100) = Delete
- `8` (0b1000) = Verify
- `15` (0b1111) = All permissions

## Frontend

React + TypeScript application with:

- Leo Wallet integration
- Admin panel for CRUD operations
- Passport display with humanity score
- Stamp management and verification system
- Real-time updates (30 second intervals)
- View Functions API integration
- Explorer API integration
- UserStamp records parsing from blockchain
- Comprehensive test suite (Unit, Integration, E2E)

## License

MIT
