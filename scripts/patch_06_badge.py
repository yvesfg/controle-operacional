#!/usr/bin/env python3
"""Task 6: Add active base badge in topbar after connection status badge."""
import re, shutil, sys
from datetime import datetime

src = r"C:\Users\yvesf\DevYFGroup\controle operacional\src\App.jsx"
bak = src + f".bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy2(src, bak)
print(f"Backup: {bak}")

with open(src, "r", encoding="utf-8") as f:
    content = f.read()

OLD = '''              <span className={`co-status-badge co-status-badge--${connStatus}`}>
                {connStatus==="online"?"Online":connStatus==="syncing"?"Sincronizando":"Offline"}
              </span>'''

NEW = '''              <span className={`co-status-badge co-status-badge--${connStatus}`}>
                {connStatus==="online"?"Online":connStatus==="syncing"?"Sincronizando":"Offline"}
              </span>
              {baseAtual && (
                <span style={{fontSize:9,fontFamily:"var(--font-mono)",color:t.ouro,letterSpacing:".08em",textTransform:"uppercase",padding:"3px 7px",borderRadius:4,background:`${hexRgb(t.ouro,.08)}`,border:`1px solid ${hexRgb(t.ouro,.2)}`}}>
                  ● {baseAtual.label}
                </span>
              )}'''

count = content.count(OLD)
if count == 0:
    print("ERROR: target string not found")
    sys.exit(1)
if count > 1:
    print(f"WARNING: found {count} occurrences, replacing first only")

content = content.replace(OLD, NEW, 1)

with open(src, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Done. Replaced {count} occurrence(s).")
