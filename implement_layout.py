#!/usr/bin/env python3
import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════════
# SPRINT 2: Add breakpoint variables
# ═══════════════════════════════════════════════════════════════════
print("📍 Sprint 2: Adding breakpoint variables...")

# Find the isMobile useState and resize listener
pattern = r'(const \[isMobile, setIsMobile\] = useState\(\(\)=>window\.innerWidth<=600\);)'
if re.search(pattern, content):
    replacement = r'''\1
  const isDesktop = !isMobile && window.innerWidth >= 1200;
  const isTablet = !isMobile && !isDesktop;'''
    content = re.sub(pattern, replacement, content, count=1)
    print("✓ Added isDesktop and isTablet variables")

# Update resize listener
resize_pattern = r'useEffect\(\(\)=>\{\s*const fn=\(\)=>setIsMobile\(window\.innerWidth<=600\);'
if re.search(resize_pattern, content):
    replacement = r'''useEffect(()=>{
    const fn=()=>setIsMobile(window.innerWidth<=600);'''
    content = re.sub(resize_pattern, replacement, content, count=1)
    print("✓ Updated resize listener")

# ═══════════════════════════════════════════════════════════════════
# SPRINT 3-6: Add sidebar and mobile nav structure
# ═══════════════════════════════════════════════════════════════════
print("📍 Sprint 3-6: Adding sidebar and mobile nav...")

# Find the main content container and wrap it
# Pattern: <div style={{padding:activeTab==="planilha"?"76px 0 68px":"76px 16px 68px",...}}
old_wrapper = r'''<div style={{padding:activeTab==="planilha"\?"76px 0 68px":"76px 16px 68px",maxWidth:activeTab==="planilha"\?"100%":1100,margin:"0 auto",animation:"fadeIn \.2s"}}>'''

new_wrapper = r'''<div style={{display:"flex",minHeight:"100vh"}}>
        {/* ═══ DESKTOP SIDEBAR ═══ */}
        {isDesktop && (
          <nav style={{
            width:LAYOUT.SIDEBAR_W,background:t.card2,borderRight:`1px solid ${t.borda}`,display:"flex",flexDirection:"column",gap:0,paddingTop:LAYOUT.HEADER_H_DESKTOP,height:"100vh",position:"fixed",left:0,top:0,zIndex:100,overflowY:"auto",overflowX:"hidden"
          }}>
            {[{id:"planilha",label:"Planilha",ico:"📋"},{id:"dashboard",label:"Dashboard",ico:"📊"},{id:"diarias",label:"Diárias",ico:"💰"},{id:"descarga",label:"Descarga",ico:"📦"},{id:"motoristas",label:"Motoristas",ico:"👥"},{id:"config_db",label:"Configurar",ico:"⚙️"}].filter(t=>perms[t.id]!==false).map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{width:"100%",padding:"12px 14px",textAlign:"left",border:"none",background:"transparent",color:activeTab===tab.id?t.ouro:t.txt2,fontWeight:activeTab===tab.id?700:600,fontSize:11,cursor:"pointer",borderLeft:`3px solid ${activeTab===tab.id?t.ouro:"transparent"}`,transition:"all .15s",display:"flex",flexDirection:"column",gap:6}}>
                <span style={{fontSize:18}}>{tab.ico}</span>
                <span style={{fontSize:10,letterSpacing:0.5,lineHeight:1}}>{tab.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <main style={{flex:1,width:"100%",marginLeft:isDesktop?LAYOUT.SIDEBAR_W:0,paddingBottom:!isDesktop?LAYOUT.NAV_H:0}}>
          <div style={{padding:activeTab==="planilha"?"76px 0 68px":"76px 16px 68px",maxWidth:activeTab==="planilha"?"100%":1100,margin:"0 auto",animation:"fadeIn .2s"}}>'''

content = re.sub(old_wrapper, new_wrapper, content, count=1)
print("✓ Wrapped main content with sidebar container")

# Find the closing divs before modals and add mobile nav + closing tags
modals_marker = r'(\n      {/\* MODALS \*/)'
nav_code = r'''
        {/* ═══ MOBILE NAV ═══ */}
        {!isDesktop && (
          <nav style={{position:"fixed",bottom:0,left:0,right:0,height:LAYOUT.NAV_H,background:t.card2,borderTop:`1px solid ${t.borda}`,display:"flex",gap:0,zIndex:101,paddingBottom:0}}>
            {[{id:"planilha",label:"Planilha",ico:"📋"},{id:"dashboard",label:"Dashboard",ico:"📊"},{id:"diarias",label:"Diárias",ico:"💰"},{id:"descarga",label:"Descarga",ico:"📦"},{id:"motoristas",label:"Motoristas",ico:"👥"}].filter(t=>perms[t.id]!==false).map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{flex:1,padding:"6px 4px",border:"none",background:"transparent",color:activeTab===tab.id?t.ouro:t.txt2,fontWeight:activeTab===tab.id?700:500,fontSize:10,cursor:"pointer",borderTop:`2px solid ${activeTab===tab.id?t.ouro:"transparent"}`,transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:16}}>{tab.ico}</span>
                <span style={{fontSize:9,lineHeight:1}}>{tab.label}</span>
              </button>
            ))}
          </nav>
        )}
          </div>
        </main>
      </div>

\1'''

content = re.sub(modals_marker, nav_code, content, count=1)
print("✓ Added mobile nav and closing tags")

# Save
with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Layout implementation complete!")
print("   - Sprint 2: Breakpoints (isMobile/isTablet/isDesktop)")
print("   - Sprint 3-6: Sidebar + Mobile Nav")

