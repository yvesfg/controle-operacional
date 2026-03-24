@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════╗
echo ║  CONTROLE OPERACIONAL v21 — DEPLOY   ║
echo ╚══════════════════════════════════════╝
echo.

REM ── Verifica se está na pasta certa ──
if not exist "src\App.jsx" (
  echo [ERRO] Execute dentro da pasta do projeto (src\App.jsx nao encontrado)
  pause & exit /b 1
)

REM ── Verifica git ──
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERRO] Git nao inicializado nesta pasta.
  pause & exit /b 1
)

echo [1/5] Gerando build local...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] Build falhou! Corrija os erros acima antes de publicar.
  pause & exit /b 1
)
echo       Build OK.

echo.
echo [2/5] Adicionando arquivos ao git...
git add src/App.jsx
git add index.html package.json package-lock.json vite.config.js vercel.json
git add .gitignore deploy.bat 2>nul
git add .github/ 2>nul
git add public/ 2>nul

echo.
set /p msg=[3/5] Mensagem do commit (Enter = usar timestamp automatico):
if "%msg%"=="" (
  for /f "tokens=1-6 delims=/: " %%a in ("%date% %time%") do (
    set "msg=deploy: %%a-%%b-%%c %%d:%%e"
  )
)

echo       Commitando: "%msg%"
git commit -m "%msg%"
if %errorlevel% neq 0 (
  echo       Nenhum arquivo alterado. Criando commit vazio para forcar deploy no Vercel...
  git commit --allow-empty -m "%msg% (force-redeploy)"
  if %errorlevel% neq 0 (
    echo [AVISO] Nao foi possivel criar commit. Verifique o git.
    pause & exit /b 1
  )
)

echo.
echo [4/5] Enviando para o GitHub...
git push -u origin main
if %errorlevel% neq 0 (
  echo.
  echo [ERRO] Push falhou. Verifique conexao ou credenciais do GitHub.
  echo        Tente: git push -u origin main
  pause & exit /b 1
)

echo.
echo [5/5] Verificando ultimo commit enviado...
git log --oneline -1
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  Deploy enviado para o GitHub com sucesso!           ║
echo ║                                                      ║
echo ║  O Vercel ira detectar o push em ~1-2 minutos.      ║
echo ║                                                      ║
echo ║  Acompanhe o build em:                              ║
echo ║  https://vercel.com/dashboard                       ║
echo ║                                                      ║
echo ║  App publicado em:                                  ║
echo ║  https://controle-operacional-omega.vercel.app/     ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause
