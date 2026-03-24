@echo off
chcp 65001 >nul
echo.
echo === CONTROLE OPERACIONAL - DEPLOY ===
echo.

REM ── Verificar se está na pasta certa ──────────────────────────────
if not exist "src\App.jsx" (
  echo ERRO: Execute este arquivo dentro da pasta do projeto
  echo       ^(onde existe a pasta src\App.jsx^)
  pause
  exit /b 1
)

REM ── Verificar se git está configurado ─────────────────────────────
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
  echo ERRO: Git nao inicializado nesta pasta.
  echo       Execute: git init ^& git remote add origin https://github.com/yvesfg/controle-operacional.git
  pause
  exit /b 1
)

echo [1/4] Gerando build...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo ERRO no build! Verifique os erros acima.
  pause
  exit /b 1
)

echo.
echo [2/4] Adicionando arquivos ao git...
REM Adiciona apenas os arquivos relevantes (evita backup iCloud)
git add src/App.jsx
git add index.html package.json package-lock.json vite.config.js vercel.json
git add .gitignore .github/ deploy.bat 2>nul
git add public/ 2>nul

echo.
set /p msg=[3/4] Mensagem do commit (Enter = "update"):
if "%msg%"=="" set msg=update

git commit -m "%msg%"
if %errorlevel% neq 0 (
  echo Nada novo para commitar ou erro no commit.
)

echo.
echo [4/4] Enviando para o GitHub...
git push -u origin main
if %errorlevel% neq 0 (
  echo.
  echo AVISO: Push falhou. Verifique sua conexao ou credenciais do GitHub.
  pause
  exit /b 1
)

echo.
echo ================================================
echo    Deploy concluido com sucesso!
echo ================================================
echo    GitHub Pages: yvesfg.github.io/controle...
echo    Vercel:       controle-operacional-omega...
echo ================================================
echo.
echo Aguarde ~1 min para o GitHub Pages atualizar.
echo.
pause
