@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   VERIFICANDO DEPLOY NO VERCEL...
echo ========================================
echo.

REM Pega o ultimo commit hash
for /f "tokens=*" %%I in ('git rev-parse --short HEAD 2^>nul') do set COMMIT=%%I
for /f "tokens=*" %%I in ('git log --format^="%%s" -1 2^>nul') do set MSG=%%I

echo Ultimo commit local: %COMMIT% — %MSG%
echo.

REM Abre o painel do Vercel no navegador
echo Abrindo painel Vercel...
start "" "https://vercel.com/yvesfg/controle-operacional/deployments"

echo.
echo [INFO] O Vercel leva ~1-2 minutos para detectar e publicar.
echo [INFO] Aguarde o status mudar para "Ready" no painel.
echo.
echo App em producao:
echo   https://controle-operacional-omega.vercel.app/
echo.

pause
endlocal
