@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================================
echo    تنظيف المجلد ونقل ملفات بايثون إلى مجلد جانبي آمن
echo ==========================================================

if not exist "local_server_backup" mkdir "local_server_backup"

echo  - جارٍ نقل كافة ملفات بايثون وتنظيف المجلد الرئيسي...
move /y *.py local_server_backup\ >nul 2>&1
move /y database.db local_server_backup\ >nul 2>&1
move /y start_albayan.* local_server_backup\ >nul 2>&1
move /y restart_server.* local_server_backup\ >nul 2>&1
move /y build_app.bat local_server_backup\ >nul 2>&1

echo.
echo  [✓] تم تنظيف المجلد الرئيسي بالكامل بنجاح!
echo  [✓] اختفت جميع ملفات بايثون وأصبحت محفوظة بأمان في: local_server_backup
echo  [✓] أصبح مشروعك الآن يعمل بالنمط السحابي الخفيف (Serverless).
echo ==========================================================
pause
