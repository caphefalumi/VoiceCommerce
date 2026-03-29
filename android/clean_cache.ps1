# Android Build Cache Cleaner Script for Windows PowerShell
# This script cleans all build caches and temporary files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android Build Cache Cleaner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$gradlePath = ".\gradlew.bat"

# Stop all Gradle daemons
Write-Host "[1/5] Stopping Gradle daemons..." -ForegroundColor Yellow
$procStop = Start-Process -FilePath $gradlePath -ArgumentList "--stop" -Wait -NoNewWindow -PassThru
if ($procStop.ExitCode -eq 0) {
    Write-Host "✓ Gradle daemons stopped" -ForegroundColor Green
} else {
    Write-Host "! Warning: Could not stop all daemons" -ForegroundColor Yellow
}
Write-Host ""

# Wait a moment for processes to release file handles
Write-Host "[2/5] Waiting for processes to release files..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host "✓ Wait complete" -ForegroundColor Green
Write-Host ""

# Force delete build directories
Write-Host "[3/5] Removing build directories..." -ForegroundColor Yellow
if (Test-Path "app\build") {
    Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed app\build" -ForegroundColor Green
} else {
    Write-Host "  - app\build already clean" -ForegroundColor Gray
}

if (Test-Path "build") {
    Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed build" -ForegroundColor Green
} else {
    Write-Host "  - build already clean" -ForegroundColor Gray
}

if (Test-Path ".gradle") {
    Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed .gradle" -ForegroundColor Green
} else {
    Write-Host "  - .gradle already clean" -ForegroundColor Gray
}
Write-Host ""

# Clean additional cache directories
Write-Host "[4/5] Removing additional cache files..." -ForegroundColor Yellow
if (Test-Path "app\.gradle") {
    Remove-Item -Path "app\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed app\.gradle" -ForegroundColor Green
}

if (Test-Path ".idea\caches") {
    Remove-Item -Path ".idea\caches" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed .idea\caches" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build cache cleaned successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run a fresh build with:" -ForegroundColor White
Write-Host "  .\gradlew.bat assembleDebug" -ForegroundColor Yellow
Write-Host ""
