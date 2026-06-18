from pathlib import Path
app = Path("src/App.jsx")
content = app.read_text(encoding="utf-8")
old = "    />;\n  }  }"
new = "    />;\n  }"
assert content.count(old) == 1, f"Expected 1, found {content.count(old)}"
content = content.replace(old, new, 1)
app.write_text(content, encoding="utf-8")
print("Fixed double brace")
