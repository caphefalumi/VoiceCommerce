# Fix Build Script
# This script will stop all Java processes, clean the build, and rebuild

Write-Host "=== TGDD Android Build Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Gradle Daemon
Write-Host "Step 1: Stopping Gradle Daemon..." -ForegroundColor Yellow
& .\gradlew --stop
Start-Sleep -Seconds 2

# Step 2: Find and display Java processes (for information)
Write-Host ""
Write-Host "Step 2: Checking for Java processes..." -ForegroundColor Yellow
$javaProcesses = Get-Process | Where-Object {$_.ProcessName -like "*java*"}
if ($javaProcesses) {
    Write-Host "Found Java processes:" -ForegroundColor Red
    $javaProcesses | Format-Table Id, ProcessName, Path -AutoSize
    Write-Host ""
    Write-Host "IMPORTANT: Please close Android Studio before continuing!" -ForegroundColor Red
    Write-Host "Press any key after closing Android Studio..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Step 3: Try to delete build directories
Write-Host ""
Write-Host "Step 3: Cleaning build directories..." -ForegroundColor Yellow
try {
    if (Test-Path "app\build") {
        Remove-Item -Path "app\build" -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully cleaned app\build" -ForegroundColor Green
    }
} catch {
    Write-Host "Warning: Could not delete app\build (files may be locked)" -ForegroundColor Yellow
    Write-Host "Trying to delete specific KAPT directories..." -ForegroundColor Yellow
    
    # Try to delete just KAPT directories
    try {
        Remove-Item -Path "app\build\tmp\kapt3" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "app\build\generated\source\kapt" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned KAPT directories" -ForegroundColor Green
    } catch {
        Write-Host "Could not clean KAPT directories" -ForegroundColor Red
    }
}

# Step 4: Build the project
Write-Host ""
Write-Host "Step 4: Building project..." -ForegroundColor Yellow
& .\gradlew :app:assembleDebug

# Step 5: Check result
Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "=== BUILD SUCCESSFUL ===" -ForegroundColor Green
} else {
    Write-Host "=== BUILD FAILED ===" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
