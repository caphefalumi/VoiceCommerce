# Build and Deploy Script
# Builds the Android app and deploys to an emulator

param(
    [switch]$Clean,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "=== TGDD Android Build & Deploy ===" -ForegroundColor Cyan
Write-Host ""

# Check for Android Studio
$studioProcess = Get-Process | Where-Object {$_.ProcessName -like "*studio*"}
if ($studioProcess) {
    Write-Host "WARNING: Android Studio is running. This may cause build issues." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (Y/N)"
    if ($continue -ne "Y") { exit }
}

# Navigate to android directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Clean if requested
if ($Clean) {
    Write-Host "Cleaning build..." -ForegroundColor Yellow
    & .\gradlew clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Clean failed, continuing anyway..." -ForegroundColor Yellow
    }
}

# Build if not skipped
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Building debug APK..." -ForegroundColor Yellow
    & .\gradlew :app:assembleDebug
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "BUILD FAILED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build successful!" -ForegroundColor Green
}

# Check for emulator
Write-Host ""
Write-Host "Checking for running emulator..." -ForegroundColor Yellow

$emulatorRunning = $false
try {
    $devices = & adb devices 2>&1
    $devices = $devices | Select-String -Pattern "emulator" -SimpleMatch
    if ($devices) {
        $emulatorRunning = $true
    }
} catch {
    Write-Host "ADB not found. Make sure Android SDK platform-tools is in PATH." -ForegroundColor Red
    exit 1
}

if (-not $emulatorRunning) {
    Write-Host "No emulator running. Starting emulator..." -ForegroundColor Yellow
    
    # List available emulators
    $avds = & emulator -list-avds 2>$null
    if ($avds) {
        Write-Host "Available emulators:" -ForegroundColor Cyan
        $avds | ForEach-Object { Write-Host "  - $_" }
        
        # Start the first emulator
        Write-Host ""
        Write-Host "Starting emulator..." -ForegroundColor Yellow
        Start-Process -FilePath "emulator" -ArgumentList "-avd", $avds[0] -WindowStyle Hidden
        
        # Wait for emulator to boot
        Write-Host "Waiting for emulator to boot..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Wait for device to be ready
        $maxWait = 60
        $waited = 0
        while ($waited -lt $maxWait) {
            $devices = & adb devices 2>&1
            $devices = $devices | Select-String -Pattern "emulator"
            if ($devices -and $devices -notmatch "offline") {
                break
            }
            Start-Sleep -Seconds 2
            $waited += 2
        }
        
        if ($waited -ge $maxWait) {
            Write-Host "Emulator did not boot in time. Try starting emulator manually." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Emulator ready!" -ForegroundColor Green
    } else {
        Write-Host "No emulators found. Please create an emulator in Android Studio AVD Manager." -ForegroundColor Red
        exit 1
    }
}

# Deploy to emulator
Write-Host ""
Write-Host "Installing APK to emulator..." -ForegroundColor Yellow
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $apkPath) {
    & adb install -r $apkPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host "App installed on emulator." -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Launch the app from the emulator's app drawer." -ForegroundColor Cyan
    } else {
        Write-Host "Failed to install APK." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "APK not found at: $apkPath" -ForegroundColor Red
    Write-Host "Run without -SkipBuild to build first." -ForegroundColor Yellow
    exit 1
}