import sys
sys.stdout.reconfigure(encoding="utf-8")
with open("src/App.jsx", encoding="utf-8") as fh:
    lines = fh.readlines()
for i, l in enumerate(lines, 1):
    if 'color:"#000"' in l:
        print(str(i) + ": " + l.rstrip()[:200])
