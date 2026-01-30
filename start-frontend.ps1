Write-Host "Starting ZkPersona Frontend..."
cd frontend
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
