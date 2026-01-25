# Start backend server script
cd $PSScriptRoot
Write-Host "Starting backend server..."
Write-Host "Current directory: $(Get-Location)"
Write-Host "Node version: $(node --version)"
Write-Host ""

node src/server.js

