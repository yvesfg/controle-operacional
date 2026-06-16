# -*- coding: utf-8 -*-
import io, datetime, shutil, sys

ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

JOBS = [
    # bounce -> ease-out-quint
    ("src/design-system/tokens.css", [
        ('cubic-bezier(.34,1.56,.64,1)', 'cubic-bezier(.22,1,.36,1)'),
    ]),
    ("src/components/Toast.jsx", [
        ('cubic-bezier(.34, 1.56, .64, 1)', 'cubic-bezier(.22, 1, .36, 1)'),
    ]),
    ("src/components/Toggle.jsx", [
        ('cubic-bezier(.34, 1.56, .64, 1)', 'cubic-bezier(.22, 1, .36, 1)'),
    ]),
    # progress bar width -> transform scaleX
    ("src/relatorios/RelatoriosView.jsx", [
        ('width: row.total > 0 ? `${(row.val / row.total) * 100}%` : "0%",\n                          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",',
         'width: "100%", transformOrigin: "left",\n                          transform: `scaleX(${row.total > 0 ? (row.val / row.total) : 0})`,\n                          transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",'),
    ]),
]

ok = True
for path, edits in JOBS:
    with io.open(path, "r", encoding="utf-8") as f:
        src = f.read()
    for old, new in edits:
        n = src.count(old)
        if n != 1:
            print("ABORT %s: found %d (expected 1): %r" % (path, n, old[:45])); ok = False; break
        src = src.replace(old, new)
    if not ok:
        break
    shutil.copyfile(path, path + ".bak_d3_" + ts)
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("OK %s" % path)
sys.exit(0 if ok else 1)
