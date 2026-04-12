# Build and run Android app on emulator
# Usage: Run from android directory or modify $projectRoot below

$projectRoot = Join-Path $PSScriptRoot ".."

# Step 1: Build debug APK
Write-Host "Building Android debug APK..." -ForegroundColor Cyan
Set-Location (Join-Path $projectRoot "android")
& .\gradlew.bat :app:assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Step 2: Install APK on connected device/emulator
Write-Host "Installing APK on device..." -ForegroundColor Cyan
$apkPath = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
& adb install $apkPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Install failed! Make sure emulator/device is connected." -ForegroundColor Red
    exit 1
}

Write-Host "APK installed successfully!" -ForegroundColor Green

# Step 3: Launch the app
Write-Host "Launching app..." -ForegroundColor Cyan
& adb shell am start -n com.tgdd.app/com.tgdd.app.MainActivity

if ($LASTEXITCODE -eq 0) {
    Write-Host "App launched!" -ForegroundColor Green
} else {
    Write-Host "Launch failed!" -ForegroundColor Yellow
}

Write-Host "Done!" -ForegroundColor Cyan