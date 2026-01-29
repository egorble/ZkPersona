# PowerShell script to start ngrok for Discord OAuth

Write-Host "🚀 Starting ngrok tunnel for backend on port 3001..." -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   1. Make sure backend is running on localhost:3001"
Write-Host "   2. Copy the HTTPS URL from ngrok output"
Write-Host "   3. Update backend/.env with: BACKEND_URL=https://your-ngrok-url.ngrok-free.app"
Write-Host "   4. Update Discord Developer Portal redirect URI"
Write-Host ""

# Try to find ngrok in common locations
$ngrokPaths = @(
    "$env:APPDATA\npm\ngrok.cmd",
    "$env:ProgramFiles\nodejs\ngrok.cmd",
    "$env:LOCALAPPDATA\npm\ngrok.cmd",
    "ngrok"
)

$ngrokFound = $false
foreach ($path in $ngrokPaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        Write-Host "✅ Found ngrok at: $path" -ForegroundColor Green
        & $path http 3001
        $ngrokFound = $true
        break
    }
}

if (-not $ngrokFound) {
    Write-Host "Using npx to run ngrok..." -ForegroundColor Yellow
    npx ngrok http 3001
}
