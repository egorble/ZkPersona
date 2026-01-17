# ============================================================================
# DEPLOY SMART CONTRACT - ZK Passport System
# ============================================================================
# This script deploys the ZK Passport smart contract to Aleo Testnet.
#
# PRIVACY: This contract implements ZK-first architecture with private records.
# ============================================================================

param(
    [string]$PrivateKey = "",
    [string]$Network = "testnet"
)

Write-Host "🚀 Deploying ZK Passport Smart Contract..." -ForegroundColor Cyan
Write-Host ""

# Check if Leo CLI is installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $leoVersion = leo --version 2>&1
    Write-Host "✅ Leo CLI found: $leoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Leo CLI not found! Please install Leo CLI first." -ForegroundColor Red
    Write-Host "   Visit: https://aleo.org/get-started" -ForegroundColor Yellow
    exit 1
}

# Check if private key is provided
if ([string]::IsNullOrEmpty($PrivateKey)) {
    # Try to get from environment variable
    $PrivateKey = $env:PRIVATE_KEY
    
    if ([string]::IsNullOrEmpty($PrivateKey)) {
        Write-Host "❌ Private key not provided!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\deploy-smart-contract.ps1 -PrivateKey 'APrivateKey1...'" -ForegroundColor White
        Write-Host ""
        Write-Host "OR set environment variable:" -ForegroundColor Yellow
        Write-Host "  `$env:PRIVATE_KEY = 'APrivateKey1...'" -ForegroundColor White
        Write-Host "  .\deploy-smart-contract.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  WARNING: Never commit private keys to Git!" -ForegroundColor Red
        exit 1
    }
}

# Validate private key format
if (-not $PrivateKey.StartsWith("APrivateKey")) {
    Write-Host "⚠️  Warning: Private key format may be incorrect (should start with 'APrivateKey')" -ForegroundColor Yellow
    $confirm = Read-Host "Continue anyway? (y/n)"
    if ($confirm -ne "y") {
        exit 1
    }
}

Write-Host "✅ Private key provided" -ForegroundColor Green
Write-Host "✅ Network: $Network" -ForegroundColor Green
Write-Host ""

# Step 1: Build the contract
Write-Host "📦 Step 1: Building Leo contract..." -ForegroundColor Yellow
Write-Host ""

Push-Location src

try {
    leo build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Build error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 2: Deploy the contract
Write-Host "🚀 Step 2: Deploying contract to $Network..." -ForegroundColor Yellow
Write-Host ""

try {
    # Create deployment output directory
    $deployOutputDir = Join-Path $PSScriptRoot "deploy_output"
    New-Item -ItemType Directory -Force -Path $deployOutputDir | Out-Null
    
    # Deploy using Leo CLI
    Write-Host "Executing: leo deploy --network $Network --private-key [HIDDEN]" -ForegroundColor Gray
    leo deploy --network $Network --private-key $PrivateKey
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Deployment error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Step 3: Save deployment info
Write-Host "📝 Step 3: Saving deployment information..." -ForegroundColor Yellow
Write-Host ""

$programId = "passportapp.aleo"
$deploymentInfo = @{
    program_id = $programId
    network = $Network
    deployed_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss UTC")
    private_key_prefix = $PrivateKey.Substring(0, 20) + "..."
    note = "After deployment, update frontend/src/deployed_program.ts with the actual Program ID"
}

$deploymentInfoJson = $deploymentInfo | ConvertTo-Json -Depth 3
$deployOutputFile = Join-Path $deployOutputDir "deployment_info.json"
$deploymentInfoJson | Out-File -FilePath $deployOutputFile -Encoding UTF8

Write-Host "✅ Deployment info saved to: $deployOutputFile" -ForegroundColor Green
Write-Host ""

# Step 4: Instructions
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Get the Program ID from the deployment output above" -ForegroundColor White
Write-Host "   (Usually in format: aleo1xxxxx.passportapp)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update frontend/src/deployed_program.ts:" -ForegroundColor White
Write-Host "   export const PROGRAM_ID = `"aleo1xxxxx.passportapp`";" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Initialize the contract (first admin):" -ForegroundColor White
Write-Host "   - Open Leo Wallet Extension" -ForegroundColor Gray
Write-Host "   - Go to 'Execute' tab" -ForegroundColor Gray
Write-Host "   - Select your deployed contract" -ForegroundColor Gray
Write-Host "   - Call 'initialize' function with your address" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test the contract:" -ForegroundColor White
Write-Host "   - Create a passport" -ForegroundColor Gray
Write-Host "   - Issue a stamp (as admin)" -ForegroundColor Gray
Write-Host "   - Generate a proof" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - Deployment guide: DEPLOY_SMART_CONTRACT.md" -ForegroundColor Gray
Write-Host "   - Aleo Explorer: https://testnet.aleoscan.io/" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   - Never commit private keys to Git!" -ForegroundColor Red
Write-Host "   - Keep your Program ID and Transaction ID safe" -ForegroundColor Red
Write-Host "   - Verify deployment on Aleo Explorer" -ForegroundColor Red
Write-Host ""

