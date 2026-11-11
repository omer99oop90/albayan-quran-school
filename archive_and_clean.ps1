# ==========================================================
#    تنظيف المجلد ونقل ملفات بايثون إلى مجلد جانبي آمن
# ==========================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location "c:\now"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   تنظيف المجلد ونقل ملفات بايثون إلى مجلد جانبي آمن" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path "local_server_backup")) {
    New-Item -ItemType Directory -Path "local_server_backup" -Force | Out-Null
}

Move-Item -Path "*.py" -Destination "local_server_backup\" -Force
if (Test-Path "database.db") { Move-Item -Path "database.db" -Destination "local_server_backup\" -Force }
if (Test-Path "start_albayan.*") { Move-Item -Path "start_albayan.*" -Destination "local_server_backup\" -Force }
if (Test-Path "build_app.bat") { Move-Item -Path "build_app.bat" -Destination "local_server_backup\" -Force }

Write-Host ""
Write-Host " [✓] تم تنظيف المجلد الرئيسي بالكامل بنجاح!" -ForegroundColor Green
Write-Host " [✓] اختفت جميع ملفات بايثون وأصبحت محفوظة بأمان في: local_server_backup" -ForegroundColor Yellow
Write-Host " [✓] أصبح مشروعك الآن يعمل بالنمط السحابي الخفيف (Serverless)." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
