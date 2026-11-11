# ==========================================================
#    Building Albayan Student App (AlbayanStudent.apk)
#    PowerShell Automated Sync and Build Engine
# ==========================================================
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Building Albayan Student App (AlbayanStudent.apk)      " -ForegroundColor Yellow
Write-Host "   Application ID: org.albayan.student                    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location "c:\now"

# Configure JAVA_HOME (Android Studio JBR 17/21 required by Gradle 8+)
$jdkCandidates = @(
    "C:\Program Files\Android\Android Studio2\jbr",
    "C:\Program Files\Android\Android Studio1\jbr",
    "C:\Program Files\Android\Android Studio\jbr"
)
foreach ($candidate in $jdkCandidates) {
    if ((Test-Path "$candidate\bin\java.exe") -and (Test-Path "$candidate\lib\jvm.cfg")) {
        $env:JAVA_HOME = $candidate
        $env:PATH = "$candidate\bin;$env:PATH"
        Write-Host "[1/4] Using JDK: $candidate" -ForegroundColor Green
        break
    }
}

if (Test-Path "C:\Program Files\nodejs") {
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
}
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

# Ensure ASCII-safe local.properties without UTF-8 BOM
$localProps = "c:\now\student_app\android\local.properties"
$asciiPropsContent = "sdk.dir=C\:/Users/\u0639\u0645\u0631/AppData/Local/Android/Sdk`r`n"
[System.IO.File]::WriteAllText($localProps, $asciiPropsContent, [System.Text.Encoding]::ASCII)

# 1. Sync student www to android assets
Write-Host "[2/4] Syncing student assets to Android project..." -ForegroundColor Cyan
if (-not (Test-Path "student_app\android\app\src\main\assets\public")) {
    New-Item -ItemType Directory -Path "student_app\android\app\src\main\assets\public" -Force | Out-Null
}
Copy-Item -Path "student_app\www\*" -Destination "student_app\android\app\src\main\assets\public\" -Recurse -Force

# Clean old student APK outputs before building
$sourceApk = "c:\now\student_app\android\app\build\outputs\apk\debug\app-debug.apk"
Remove-Item -Path "c:\now\student_app\android\app\build\intermediates\assets\debug" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\now\student_app\android\app\build\outputs\apk\debug\*" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Gradle Compile
Write-Host "[3/4] Compiling AlbayanStudent.apk via Gradle..." -ForegroundColor Cyan
Set-Location "c:\now\student_app\android"
& .\gradlew.bat assembleDebug
$gradleExit = $LASTEXITCODE
Set-Location "c:\now"

if ($gradleExit -ne 0 -or -not (Test-Path $sourceApk)) {
    Write-Host "[ERROR] Gradle compilation failed (Exit Code: $gradleExit)!" -ForegroundColor Red
    exit 1
}

# 3. Finalize APK
Write-Host "[4/4] Finalizing APK output..." -ForegroundColor Cyan
if (-not (Test-Path "static\downloads")) {
    New-Item -ItemType Directory -Path "static\downloads" -Force | Out-Null
}
$destApk = "c:\now\static\downloads\AlbayanStudent.apk"
Copy-Item -Path $sourceApk -Destination $destApk -Force
$apkInfo = Get-Item $destApk
$sizeMB = [math]::Round($apkInfo.Length / 1MB, 2)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " SUCCESS: Albayan Student APK built successfully!         " -ForegroundColor Green
Write-Host " Saved to : $destApk"                                      -ForegroundColor Yellow
Write-Host " Size     : $sizeMB MB (Updated: $($apkInfo.LastWriteTime))" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
