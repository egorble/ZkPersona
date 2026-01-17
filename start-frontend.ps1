# ZkPersona Frontend Start Script for Windows PowerShell

Write-Host "🚀 Starting ZkPersona Frontend..." -ForegroundColor Cyan

cd frontend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "`n🌐 Starting development server..." -ForegroundColor Yellow
Write-Host "   Open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host "`n⚠️  Make sure PROGRAM_ID is set in src/deployed_program.ts" -ForegroundColor Yellow

npm run dev

