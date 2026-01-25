# Auto-deploy script for zkpersona_passport_v3.aleo
$ErrorActionPreference = "Stop"

cd src

Write-Host "🚀 Deploying zkpersona_passport_v3.aleo to testnet..." -ForegroundColor Cyan

# Create a temporary file with "y" for auto-confirmation
$confirmFile = [System.IO.Path]::GetTempFileName()
"y" | Out-File -FilePath $confirmFile -Encoding ASCII -NoNewline

# Run deploy command with auto-confirmation
Get-Content $confirmFile | leo deploy --network testnet --endpoint https://api.explorer.provable.com/v1 --private-key APrivateKey1zkp3CAcpd4QNiUhznYhou5A2wjiBgvfrbTR3i81XzZVqewa --broadcast

# Clean up
Remove-Item $confirmFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Contract deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

