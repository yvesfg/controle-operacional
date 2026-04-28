# cleanup.ps1 — Limpeza do projeto controle operacional
# Execute no PowerShell dentro da pasta do projeto

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== LIMPEZA DO PROJETO ===" -ForegroundColor Cyan

# 1. Backups em src/ (52 arquivos)
Write-Host "`n[1] Removendo backups em src/..." -ForegroundColor Yellow
Get-ChildItem -Path "$root\src" -Recurse -Include "*.bak", "*.bak_*", "*.bckp*", "*.new", "*.txt" |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "  DEL $($_.Name)" }

# 2. Timestamps do Vite na raiz (69 arquivos, já no .gitignore)
Write-Host "`n[2] Removendo timestamps vite.config.js.timestamp-*..." -ForegroundColor Yellow
Get-ChildItem -Path $root -Filter "vite.config.js.timestamp-*.mjs" |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "  DEL $($_.Name)" }

# 3. index.html.bak
Write-Host "`n[3] Removendo index.html.bak..." -ForegroundColor Yellow
Get-ChildItem -Path $root -Filter "index.html.bak*" |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "  DEL $($_.Name)" }

# 4. dist/ (gitignored, gerado pelo build — não precisa versionar)
Write-Host "`n[4] Removendo dist/..." -ForegroundColor Yellow
if (Test-Path "$root\dist") {
    Remove-Item "$root\dist" -Recurse -Force
    Write-Host "  DEL dist/"
}

Write-Host "`n=== CONCLUIDO ===" -ForegroundColor Green
Write-Host "Abra o GitHub Desktop para revisar e commitar." -ForegroundColor Cyan
