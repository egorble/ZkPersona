Write-Host "Starting ZkPersona Backend..."
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env not found"
}
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
