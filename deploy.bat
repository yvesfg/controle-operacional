@echo off
echo.
echo === CONTROLE OPERACIONAL - DEPLOY ===
echo.

echo [1/4] Gerando build...
call npm run build
if %errorlevel% neq 0 (
  echo ERRO no build! Verifique os erros acima.
  pause
  exit /b 1
)

echo.
echo [2/4] Adicionando arquivos ao git...
git add -A

echo.
set /p msg=[3/4] Mensagem do commit: 
if "%msg%"=="" set msg=update

git commit -m "%msg%"

echo.
echo [4/4] Enviando para o GitHub...
git push

echo.
echo Deploy concluido!
echo.
echo GitHub Pages: https://yvesfg.github.io/controle-operacional/
echo Vercel:       https://controle-operacional-omega.vercel.app/
echo.
echo Aguarde 1 min para o GitHub Pages atualizar.
echo.
pause