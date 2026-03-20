@echo off
echo.
echo === CONTROLE OPERACIONAL - DEPLOY FIX (Sessions 7+8) ===
echo.
echo Este script envia forcadamente as melhorias para o GitHub:
echo  - Bottom Nav estilo Binance (rodape fixo)
echo  - Tela inicial = Planilha (responsiva)
echo  - Ordenacao de colunas estilo Excel
echo.

echo [1/3] Verificando estado do git...
git log --oneline -3
echo.

echo [2/3] Enviando para GitHub (force push)...
git push --force origin main
if %errorlevel% neq 0 (
  echo.
  echo ERRO no push! Verifique sua conexao e credenciais do GitHub.
  pause
  exit /b 1
)

echo.
echo [3/3] Push concluido com sucesso!
echo.
echo O Vercel vai detectar o push e fazer o deploy automaticamente.
echo Aguarde ~2 minutos e acesse:
echo.
echo   https://controle-operacional-omega.vercel.app/
echo.
echo Depois deste deploy, volte a usar o deploy.bat normal para proximas atualizacoes.
echo.
pause
