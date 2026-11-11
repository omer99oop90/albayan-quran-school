# ==========================================================
#    Albayan Quran School - Zero Python Serverless Engine
# ==========================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot
$host.UI.RawUI.WindowTitle = "Albayan Serverless Portal (Port 5000)"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Albayan Quran School - Zero Python Serverless Engine" -ForegroundColor Yellow
Write-Host "   Port: 5000  |  http://localhost:5000/" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Press Ctrl + C to stop the server." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:5000/"

if (Get-Command npx -ErrorAction SilentlyContinue) {
    & npx -y serve static -p 5000
} else {
    $port = 5000
    $staticDir = Join-Path $PSScriptRoot "static"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
    try {
        $listener.Start()
        Write-Host "   [✓] Windows Native Web Server is running on port $port" -ForegroundColor Green
        Write-Host "   [✓] Zero Python & Zero Dependencies Active." -ForegroundColor Cyan
        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $urlPath = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($urlPath) -or $urlPath -eq "/") { $urlPath = "index.html" }
            $filePath = Join-Path $staticDir $urlPath

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".svg"  { "image/svg+xml" }
                    ".ico"  { "image/x-icon" }
                    ".woff" { "font/woff" }
                    ".woff2" { "font/woff2" }
                    ".ttf"  { "font/ttf" }
                    ".apk"  { "application/vnd.android.package-archive" }
                    default { "application/octet-stream" }
                }
                $response.ContentType = $mime
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
        }
    } finally {
        $listener.Stop()
    }
}
