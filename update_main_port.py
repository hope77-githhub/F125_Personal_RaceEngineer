import json
import os

backend_main_path = 'f1-ai-race-engineer/backend/main.py'
with open(backend_main_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "import uvicorn" not in content:
    content = "import uvicorn\n" + content

run_block = """
if __name__ == "__main__":
    port = settings.get("BACKEND_PORT", 8080)
    print(f"[Backend] Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
"""

if "if __name__ == " not in content:
    content += "\n" + run_block

with open(backend_main_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated backend/main.py")
