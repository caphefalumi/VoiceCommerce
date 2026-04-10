# Check and Build Script
# This script checks if Android Studio is running and warns before building

Write-Host "=== TGDD Android Build Check ===" -ForegroundColor Cyan
Write-Host ""

# Check for Android Studio
$studioProcess = Get-Process | Where-Object {$_.ProcessName -like "*studio*"}
if ($studioProcess) {
    Write-Host "❌ ERROR: Android Studio is currently running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Found processes:" -ForegroundColor Yellow
    $studioProcess | Format-Table Id, ProcessName, Path -AutoSize
    Write-Host ""
    Write-Host "Android Studio locks build files and will cause the build to fail." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  1. Close Android Studio manually and run this script again"
    Write-Host "  2. Press 'K' to kill Android Studio processes automatically"
    Write-Host "  3. Press 'Q' to quit"
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1/K/Q)"
    
    switch ($choice.ToUpper()) {
        "K" {
            Write-Host ""
            Write-Host "Killing Android Studio processes..." -ForegroundColor Yellow
            $studioProcess | Stop-Process -Force
            Start-Sleep -Seconds 3
            Write-Host "Processes killed. Continuing with build..." -ForegroundColor Green
        }
        "Q" {
            Write-Host "Exiting..." -ForegroundColor Yellow
            exit
        }
        default {
            Write-Host "Please close Android Studio and run this script again." -ForegroundColor Yellow
            Write-Host "Press any key to exit..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit
        }
    }
}

# Check for Java processes
$javaProcesses = Get-Process | Where-Object {$_.ProcessName -like "*java*"}
if ($javaProcesses) {
    Write-Host ""
    Write-Host "⚠️  Warning: Java processes are running:" -ForegroundColor Yellow
    $javaProcesses | Format-Table Id, ProcessName -AutoSize
    Write-Host ""
}

# Stop Gradle Daemon
Write-Host ""
Write-Host "Stopping Gradle Daemon..." -ForegroundColor Yellow
& .\gradlew --stop
Start-Sleep -Seconds 2

# Clean build
Write-Host ""
Write-Host "Cleaning build..." -ForegroundColor Yellow
$cleanResult = & .\gradlew clean 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Clean failed. Trying to delete build directory manually..." -ForegroundColor Red
    try {
        Remove-Item -Path "app\build" -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Manually deleted build directory" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not delete build directory. Files may still be locked." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please ensure all processes are closed and try again." -ForegroundColor Yellow
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

# Build
Write-Host ""
Write-Host "Building project..." -ForegroundColor Yellow
Write-Host ""
& .\gradlew :app:assembleDebug

# Check result
Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run lint: .\gradlew :app:lintDebug"
    Write-Host "  2. Open Android Studio and sync project"
    Write-Host "  3. Build from Android Studio to verify"
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ BUILD FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    Write-Host "If you see KAPT errors about @Provides methods," -ForegroundColor Yellow
    Write-Host "the code fixes have been applied but may need a clean build." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
