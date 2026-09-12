@echo off
setlocal

echo === GitHub Auto Push Script ===
echo Target Repo: https://github.com/hope77-githhub/F125_Personal_RaceEngineer

:: Initialize git repository if not exists
if not exist ".git" (
    git init
)

:: Remove existing origin if any, and add the correct one
git remote remove origin 2>nul
git remote add origin https://github.com/hope77-githhub/F125_Personal_RaceEngineer.git

:: Rename branch to main
git branch -M main

:: Stage all files
git add .

:: Commit changes
git commit -m "Auto Update: F1 AI Race Engineer Project Initial Setup & Backend Integration"

:: Push to GitHub
echo Pushing to GitHub...
git push -u origin main

echo.
echo Push completed! (If a login prompt appears, please log in)
pause
