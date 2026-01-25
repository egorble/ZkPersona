# PowerShell script to upgrade Aleo smart contract
param(
    [Parameter(Mandatory=$true)]
    [string]$PrivateKey,
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet",
    
    [Parameter(Mandatory=$false)]
    [string]$Endpoint = "https://api.explorer.provable.com/v1"
)

$ErrorActionPreference = "Stop"

try {
    Push-Location $PSScriptRoot
    
    Write-Host "🔧 Upgrading smart contract..." -ForegroundColor Cyan
    Write-Host ""
    
    # Change to src directory
    Set-Location "src"
    
    # Build first
    Write-Host "📦 Building contract..." -ForegroundColor Yellow
    leo build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "🚀 Upgrading contract on $Network..." -ForegroundColor Yellow
    
    # Create a temporary file with "y" for auto-confirmation
    $confirmFile = [System.IO.Path]::GetTempFileName()
    "y" | Out-File -FilePath $confirmFile -Encoding ASCII
    
    # Run upgrade command
    Get-Content $confirmFile | leo upgrade --network $Network --endpoint $Endpoint --private-key $PrivateKey --broadcast
    
    # Clean up
    Remove-Item $confirmFile -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Upgrade failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Contract upgraded successfully!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

