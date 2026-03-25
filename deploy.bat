@echo off
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
  echo.
  echo [ERRO] src\App.jsx nao encontrado nesta pasta:
  echo        %CD%
  echo.
  echo  Certifique-se de que deploy.bat esta na raiz do projeto.
  echo.
  pause
  exit /b 1
)
echo [OK] Projeto encontrado.

REM ── Verifica npm ──
where npm >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] npm nao encontrado no PATH.
  echo  Instale o Node.js em https://nodejs.org
  echo.
  pause
  exit /b 1
)
echo [OK] npm encontrado.

REM ── Verifica git ──
where git >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] git nao encontrado no PATH.
  echo  Instale o Git em https://git-scm.com
  echo.
  pause
  exit /b 1
)
echo [OK] git encontrado.
echo.

echo [1/5] Gerando build local...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] Build falhou! Corrija os erros acima antes de publicar.
  echo.
  pause
  exit /b 1
)
echo [OK] Build concluido.

echo.
echo [2/5] Adicionando arquivos ao git...
git add src/App.jsx
git add index.html package.json package-lock.json vite.config.js vercel.json
git add .gitignore deploy.bat 2>nul
git add .github/ 2>nul
git add public/ 2>nul

echo.
set /p msg=[3/5] Mensagem do commit (Enter = timestamp automatico):
if "%msg%"=="" (
  for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set hoje=%%c-%%b-%%a
  for /f "tokens=1-2 delims=: " %%a in ('time /t') do set hora=%%a:%%b
  set "msg=deploy: %hoje% %hora%"
)

echo Commitando: %msg%
git commit -m "%msg%"
if %errorlevel% neq 0 (
  echo Nenhuma alteracao. Forcando redeploy no Vercel...
  git commit --allow-empty -m "%msg% (force-redeploy)"
)

echo.
echo [4/5] Enviando para o GitHub...
git push -u origin main
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] Push falhou. Verifique conexao ou credenciais do GitHub.
  echo.
  pause
  exit /b 1
)

echo.
echo [5/5] Ultimo commit:
git log --oneline -1
echo.
echo ========================================================
echo   DEPLOY CONCLUIDO COM SUCESSO!
echo   Vercel detecta em ~1-2 min.
echo   https://controle-operacional-omega.vercel.app/
echo ========================================================
echo.
pause
