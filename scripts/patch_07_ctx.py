#!/usr/bin/env python3
"""Task 7a: Pass baseAtual + BASES to AdminView ctx."""
import shutil, sys
from datetime import datetime

src = r"C:\Users\yvesf\DevYFGroup\controle operacional\src\App.jsx"
bak = src + f".bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy2(src, bak)
print(f"Backup: {bak}")

with open(src, "r", encoding="utf-8") as f:
    content = f.read()

OLD = "          getConexao, supaFetch,\n          connStatus,\n          saveMotoristasLS,"
NEW = "          getConexao, supaFetch,\n          connStatus,\n          baseAtual, BASES,\n          saveMotoristasLS,"

count = content.count(OLD)
if count == 0:
    print("ERROR: target string not found")
    sys.exit(1)

content = content.replace(OLD, NEW, 1)

with open(src, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Done. Replaced {count} occurrence(s).")
