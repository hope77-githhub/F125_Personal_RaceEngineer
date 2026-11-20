import os

file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "main.py")

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

mount_block = """
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    logger.info(f"Mounted static frontend distribution from {FRONTEND_DIST}")
"""

if "FRONTEND_DIST" not in text:
    lines = text.splitlines(keepends=True)
    out_lines = []
    inserted = False
    for line in lines:
        if 'if __name__ == "__main__":' in line and not inserted:
            out_lines.append(mount_block + "\n")
            inserted = True
        out_lines.append(line)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(out_lines)
    print("SUCCESS: FRONTEND_DIST mounted in backend/main.py")
else:
    print("ALREADY MOUNTED")
