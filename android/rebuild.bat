@echo off
echo Stopping Gradle Daemon...
call gradlew --stop

echo Waiting for processes to release locks...
timeout /t 5 /nobreak

echo Cleaning build...
call gradlew clean

echo Building project...
call gradlew :app:assembleDebug

echo Done!
pause
