@echo off
cd /d "%~dp0"
if not exist janela\node_modules (
  echo Installing Electron - first run only, this can take a while...
  pushd janela
  call npm install
  popd
)
start "F1 Overlay Server" cmd /k node server.js --debug
timeout /t 2 /nobreak >nul
pushd janela
call npx electron .
popd
