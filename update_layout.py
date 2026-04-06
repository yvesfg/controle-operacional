import re

# Read App.jsx
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isDesktop and isTablet variables after isMobile
isMobile_pattern = r"(const \[isMobile, setIsMobile\] = useState\(\(\)=>window\.innerWidth<=600\);)"
replacement = r"""\1
  const isDesktop = isMobile ? false : window.innerWidth >= 1200;
  const isTablet = !isMobile && !isDesktop;"""
content = re.sub(isMobile_pattern, replacement, content, count=1)

# 2. Update the resize listener to recalculate all three
resize_pattern = r"(const fn=\(\)=>setIsMobile\(window\.innerWidth<=600\);)"
content = re.sub(resize_pattern, 
    r"""const fn=()=>{
    const w = window.innerWidth;
    setIsMobile(w <= 600);
  };""", content, count=1)

print("✓ Added isDesktop and isTablet")
print("✓ Updated resize listener")

# Write back
with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Done!")
