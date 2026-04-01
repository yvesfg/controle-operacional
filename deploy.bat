@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ========================================
echo   CONTROLE OPERACIONAL v21 - DEPLOY
echo ========================================
echo.
echo Pasta: %CD%
echo.

REM ── Verifica se está na pasta certa ──
if not exist "src\App.jsx" (
  echo [ERRO] src\App.jsx nao encontrado nesta pasta: %CD%
  pause & exit /b 1
)
echo [OK] Projeto encontrado.

REM ── Verifica npm ──
where npm >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERRO] npm nao encontrado. Instale o Node.js em https://nodejs.org
  pause & exit /b 1
)
echo [OK] npm encontrado.

REM ── Verifica git ──
where git >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERRO] git nao encontrado. Instale em https://git-scm.com
  pause & exit /b 1
)
echo [OK] git encontrado.
echo.

REM ════════════════════════════════════════
REM  [0] BACKUP AUTOMATICO antes de tudo
REM ════════════════════════════════════════
REM Usa PowerShell para timestamp (compativel com Windows 10/11)
for /f "tokens=*" %%I in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set STAMP=%%I
set BKPFILE=src\backups\App.jsx.bckp_%STAMP%
set LOGFILE=src\backups\log_%STAMP%.txt

if not exist "src\backups" mkdir "src\backups"
copy /Y "src\App.jsx" "%BKPFILE%" >nul
echo [BACKUP] %BKPFILE% criado.

REM ── Log do backup ──
echo BACKUP DEPLOY - %STAMP% > "%LOGFILE%"
git log --oneline -3 >> "%LOGFILE%"
echo. >> "%LOGFILE%"
echo Arquivo salvo: %BKPFILE% >> "%LOGFILE%"
echo.

REM ════════════════════════════════════════
REM  [1] BUILD LOCAL
REM ════════════════════════════════════════
echo [1/5] Gerando build local...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] Build falhou! Corrija os erros acima antes de publicar.
  echo Seu backup esta em: %BKPFILE%
  pause & exit /b 1
)
echo [OK] Build concluido.

REM ════════════════════════════════════════
REM  [2] GIT ADD
REM ════════════════════════════════════════
echo.
echo [2/5] Adicionando arquivos ao git...
git add src/App.jsx
git add SyncSupabase.gs 2>nul
git add index.html package.json package-lock.json vite.config.js vercel.json
git add .gitignore deploy.bat deploy_fix.bat 2>nul
git add .github/ 2>nul
git add public/ 2>nul

REM ════════════════════════════════════════
REM  [3] COMMIT
REM ════════════════════════════════════════
echo.
set /p msg=[3/5] Mensagem do commit (Enter = timestamp automatico):
if "!msg!"=="" (
  set "msg=deploy: %STAMP%"
)

echo Commitando: !msg!
git commit -m "!msg!"
if %errorlevel% neq 0 (
  echo Nenhuma alteracao nova detectada. Forcando redeploy no Vercel...
  git commit --allow-empty -m "!msg! (force-redeploy)"
)

REM ════════════════════════════════════════
REM  [4] PULL + PUSH
REM ════════════════════════════════════════
echo.
echo [4/5] Sincronizando com GitHub (pull + push)...
git pull --rebase origin main
if %errorlevel% neq 0 (
  echo.
  echo [AVISO] Pull com conflito. Tentando push forcado...
  git push --force-with-lease origin main
  if %errorlevel% neq 0 (
    echo [ERRO] Push falhou. Verifique conexao ou credenciais do GitHub.
    pause & exit /b 1
  )
) else (
  git push -u origin main
  if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Push falhou. Verifique conexao ou credenciais do GitHub.
    pause & exit /b 1
  )
)

REM ════════════════════════════════════════
REM  [5] RESUMO FINAL
REM ════════════════════════════════════════
echo.
echo [5/5] Ultimo commit:
git log --oneline -1
echo.
echo ========================================================
echo   DEPLOY CONCLUIDO COM SUCESSO!
echo   Backup salvo em: %BKPFILE%
echo   Vercel detecta em ~1-2 min:
echo   https://controle-operacional-omega.vercel.app/
echo ========================================================
echo.

REM Oferece opcao de verificar Vercel
set /p CHECK_VERCEL=Deseja verificar sincronizacao com Vercel (S/N)?
if /i "!CHECK_VERCEL!"=="S" (
  call deploy_check_vercel.bat
)

pause
endlocal
