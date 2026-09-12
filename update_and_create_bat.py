import json
import os

# Update settings.json to add BACKEND_PORT
settings_path = 'f1-ai-race-engineer/settings.json'
with open(settings_path, 'r') as f:
    settings = json.load(f)

settings['BACKEND_PORT'] = 8080  # Changing port from 8000 to 8080

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=4)

# Create push.bat
bat_content = """@echo off
setlocal

:: Prompt for repository URL if needed (optional, assuming remote is already set, but let's be safe)
echo === GitHub Auto Push Script ===

cd f1-ai-race-engineer

:: Initialize git if not already
if not exist ".git" (
    git init
    set /p REPO_URL="Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): "
    git remote add origin %REPO_URL%
    git branch -M main
)

:: Add, Commit, Push
git add .
git commit -m "Update: Added settings.json, backend logic, and changed backend port to 8080"
git push -u origin main

echo.
echo Successfully pushed to GitHub!
pause
"""
with open('push.bat', 'w', encoding='utf-8') as f:
    f.write(bat_content)

print("Settings updated and push.bat created.")
