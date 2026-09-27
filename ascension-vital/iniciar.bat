@echo off
title Ascension Vital
cd /d "%~dp0"
start "" http://localhost:3000
python serve.py 3000
pause
