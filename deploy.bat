@echo off
echo.
echo === CONTROLE OPERACIONAL - DEPLOY ===
echo.

REM Verifica se esta na pasta certa
if not exist "src\App.jsx" (
  echo ERRO: Execute dentro da pasta do projeto ^(src\App.jsx nao encontrado^)
  pause
  exit /b 1
)

REM Verifica se git esta configurado
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
  echo ERRO: Git nao inicializado nesta pasta.
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
git add src/App.jsx
git add index.html package.json package-lock.json vite.config.js vercel.json
git add .gitignore .github/ deploy.bat 2>nul
git add public/ 2>nul

echo.
set /p msg=[3/4] Mensagem do commit (Enter = update):
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
  echo AVISO: Push falhou. Verifique conexao ou credenciais do GitHub.
  pause
  exit /b 1
)

echo.
echo === Deploy concluido com sucesso! ===
echo.
pause
