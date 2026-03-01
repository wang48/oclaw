@echo off
setlocal

if /i "%1"=="update" (
    echo openclaw is managed by Oclaw ^(bundled version^).
    echo.
    echo To update openclaw, update Oclaw:
    echo   Open Oclaw ^> Settings ^> Check for Updates
    echo   Or download the latest version from https://oclaw.app
    exit /b 0
)

set ELECTRON_RUN_AS_NODE=1
set OPENCLAW_EMBEDDED_IN=Oclaw
"%~dp0..\..\Oclaw.exe" "%~dp0..\openclaw\openclaw.mjs" %*
endlocal
