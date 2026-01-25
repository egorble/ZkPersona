# Start backend server (PowerShell)

Write-Host "🚀 Starting ZK Persona Backend..." -ForegroundColor Cyan
Write-Host "📝 Make sure you have:" -ForegroundColor Yellow
Write-Host "   1. Created backend/.env file with OAuth credentials"
Write-Host "   2. Installed dependencies: npm install"
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  WARNING: .env file not found!" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and fill in your credentials"
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "✅ Starting server on http://localhost:3001" -ForegroundColor Green
Write-Host "   Health check: http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""
npm run dev

