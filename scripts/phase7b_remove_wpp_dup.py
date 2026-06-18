from pathlib import Path

app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")

START = '\n      {/* ═══ WPP SELECT MODAL ═══ */}\n      {wppTipoOpen && ('
END   = '      )}\n\n\n      {/* ═══ EDIT MODAL ═══ */}'

s = content.find(START)
assert s >= 0, "WPP SELECT MODAL start not found"
e = content.find(END, s)
assert e >= 0, "WPP SELECT MODAL end not found"

# Remove the block, keep the EDIT MODAL comment (don't include it in old)
e_cut = e + len('      )}\n')  # cut up to and including the closing )}
old_block = content[s:e_cut]
assert content.count(old_block) == 1, f"Block not unique, found {content.count(old_block)} times"
print(f"Removing duplicate WPP SELECT MODAL: {old_block.count(chr(10))} lines")

# Replace with single newline to maintain spacing
content = content.replace(old_block, '\n', 1)

app.write_text(content, encoding="utf-8")
print(f"Done. App.jsx now has {content.count(chr(10))} lines")
