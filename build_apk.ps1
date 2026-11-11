# ========================================================
# Albayan Quran School - APK Automated Build Script
# ========================================================
$ErrorActionPreference = "Continue"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Building Albayan Admin App (AlbayanApp.apk)   " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Set working directory
Set-Location "c:\now"

# 2. Configure JAVA_HOME (Android Studio JBR 17/21 required by Gradle 8+)
$jdkCandidates = @(
    "C:\Program Files\Android\Android Studio2\jbr",
    "C:\Program Files\Android\Android Studio1\jbr",
    "C:\Program Files\Android\Android Studio\jbr"
)
foreach ($candidate in $jdkCandidates) {
    if ((Test-Path "$candidate\bin\java.exe") -and (Test-Path "$candidate\lib\jvm.cfg")) {
        $env:JAVA_HOME = $candidate
        $env:PATH = "$candidate\bin;$env:PATH"
        Write-Host "[1/5] Using JDK: $candidate" -ForegroundColor Green
        break
    }
}

if (Test-Path "C:\Program Files\nodejs") {
    $env:PATH = "C:\Program Files\nodejs;$env:PATH"
}
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

# 3. Ensure ASCII-safe local.properties without UTF-8 BOM (fixes Arabic username path in Gradle)
$localProps = "c:\now\android\local.properties"
$asciiPropsContent = "sdk.dir=C\:/Users/\u0639\u0645\u0631/AppData/Local/Android/Sdk`r`n"
[System.IO.File]::WriteAllText($localProps, $asciiPropsContent, [System.Text.Encoding]::ASCII)

# 4. Clean stale build outputs & intermediate assets so old 15MB APK is never reused
Write-Host "[2/5] Cleaning old APK & intermediate asset caches..." -ForegroundColor Green
$sourceApk = "c:\now\android\app\build\outputs\apk\debug\app-debug.apk"
Remove-Item -Path "c:\now\static\downloads\AlbayanApp.apk" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\now\android\app\src\main\assets\public\downloads\*.apk" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\now\android\app\build\intermediates\assets\debug" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\now\android\app\build\intermediates\apk\debug" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\now\android\app\build\outputs\apk\debug\*" -Recurse -Force -ErrorAction SilentlyContinue

# 5. Build fresh APK via Gradle
Write-Host "[3/5] Compiling fresh APK with Gradle..." -ForegroundColor Green
Set-Location "c:\now\android"
& .\gradlew.bat assembleDebug
$gradleExit = $LASTEXITCODE
Set-Location "c:\now"

if ($gradleExit -ne 0 -or -not (Test-Path $sourceApk)) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Red
    Write-Host "   ERROR: Gradle build failed (Exit Code: $gradleExit)" -ForegroundColor Red
    Write-Host "=================================================" -ForegroundColor Red
    exit 1
}

# 6. Copy newly generated APK to static/downloads/AlbayanApp.apk
Write-Host "[4/5] Copying new APK to static/downloads..." -ForegroundColor Green
$destFolder = "c:\now\static\downloads"
$destApk = "$destFolder\AlbayanApp.apk"

if (-not (Test-Path $destFolder)) {
    New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
}

Copy-Item -Path $sourceApk -Destination $destApk -Force
$apkInfo = Get-Item $destApk
$sizeMB = [math]::Round($apkInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   SUCCESS: Fresh APK built & updated!           " -ForegroundColor Green
Write-Host "   Path : $destApk"                                -ForegroundColor White
Write-Host "   Size : $sizeMB MB (Updated: $($apkInfo.LastWriteTime))" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Green
