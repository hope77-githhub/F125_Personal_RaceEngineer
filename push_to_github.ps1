# Github Repository Push Script
param(
    [string]$RepoUrl = $(Read-Host -Prompt "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git)")
)

if (-not $RepoUrl) {
    Write-Host "Repository URL is required." -ForegroundColor Red
    exit 1
}

cd f1-ai-race-engineer

# Initialize git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Setup F1 AI Race Engineer project structure based on specification"

# Rename branch to main if it's not already
git branch -M main

# Add remote
git remote add origin $RepoUrl

# Push to Github
git push -u origin main

Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
cd ..
