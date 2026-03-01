@echo off
setlocal

REM Oclaw CLI — Desktop AI agent runtime and control plane
REM Pass all arguments to Oclaw in CLI mode
"%~dp0..\..\Oclaw.exe" --cli %*
endlocal
