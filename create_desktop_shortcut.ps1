# PowerShell script to create Desktop shortcut for Albayan School Launcher
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Albayan Quran School.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "c:\now\start_albayan.bat"
$Shortcut.WorkingDirectory = "c:\now"
$Shortcut.Description = "Albayan Quran School Desktop Launcher"
$Shortcut.IconLocation = "shell32.dll, 43"
$Shortcut.Save()

Write-Host "==============================================================" -ForegroundColor Green
Write-Host " [✓] Desktop shortcut created successfully!" -ForegroundColor Green
Write-Host " Path: $ShortcutPath" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
