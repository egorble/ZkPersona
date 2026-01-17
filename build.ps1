# ZkPersona Build Script for Windows PowerShell

Write-Host "📦 Building ZkPersona Leo Contract..." -ForegroundColor Cyan

cd src

leo build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build successful!" -ForegroundColor Green
    Write-Host "`nBuild files are in src/build/" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    exit 1
}

cd ..

