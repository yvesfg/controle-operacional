import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with the main content padding that needs adjustment
# Line ~2647: padding:activeTab==="planilha"?"76px 0 68px":"76px 16px 68px"

# We need to:
# 1. Add sidebar HTML before the main content div
# 2. Wrap content with sidebar container
# 3. Adjust padding based on screen size

# Convert back to string for manipulation
content = ''.join(lines)

# Find and replace the main content section
# Current: <div style={{padding:activeTab==="planilha"?"76px 0 68px":"76px 16px 68px",...}}

old_main_container = r'''<div style=\{\{padding:activeTab==="planilha"\?"76px 0 68px":"76px 16px 68px",maxWidth:activeTab==="planilha"\?"100%":1100,margin:"0 auto",animation:"fadeIn .2s"\}\}>'''

new_main_container = r'''<div style={{display:"flex",width:"100%"}}>
        {/* DESKTOP SIDEBAR */}
        {isDesktop && (
          <div style={{
            width: LAYOUT.SIDEBAR_W,
            background: t.card2,
            borderRight: `1px solid ${t.borda}`,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            paddingTop: LAYOUT.HEADER_H_DESKTOP,
            height: `100vh`,
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 100,
            overflowY: "auto"
          }}>
            {[
              {id:"planilha",label:"Planilha",ico:"📋"},
              {id:"dashboard",label:"Dashboard",ico:"📊"},
              {id:"diarias",label:"Diárias",ico:"💰"},
              {id:"descarga",label:"Descarga",ico:"📦"},
              {id:"motoristas",label:"Motoristas",ico:"👥"},
              {id:"config_db",label:"Config",ico:"⚙️"},
            ].map(tab=>perms[tab.id]!==false && (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
                width:"100%",padding:"12px 14px",textAlign:"left",border:"none",background:"transparent",color:activeTab===tab.id?t.ouro:t.txt2,fontWeight:activeTab===tab.id?700:600,fontSize:11,cursor:"pointer",borderLeft:`3px solid ${activeTab===tab.id?t.ouro:"transparent"}`,transition:"all .15s"
              }}>
                <div style={{fontSize:16,marginBottom:4}}>{tab.ico}</div>
                <div style={{fontSize:10,letterSpacing:0.5}}>{tab.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* MAIN CONTENT */}
        <div style={{
          flex: 1,
          marginLeft: isDesktop ? LAYOUT.SIDEBAR_W : 0,
          paddingBottom: !isDesktop ? LAYOUT.NAV_H : 0
        }}>
          <div style={{padding:activeTab==="planilha"?"76px 0 68px":"76px 16px 68px",maxWidth:activeTab==="planilha"?"100%":1100,margin:"0 auto",animation:"fadeIn .2s"}}>'''

content = re.sub(
    r'<div style=\{\{padding:activeTab==="planilha"\?"76px 0 68px":"76px 16px 68px",maxWidth:activeTab==="planilha"\?"100%":1100,margin:"0 auto",animation:"fadeIn \.2s"\}\}>',
    new_main_container,
    content,
    count=1
)

# Find the closing div and add sidebar/nav closing
# Need to close the main content div we just opened
# Find the last </div> before the modals start and add proper closing

# For now, let's add the bottom nav before the modals section
# Find where modals start (search for "MODALS" comment or first modal div)

modals_marker = r'\n      \{/\* MODALS \*/'
nav_html = r'''
        {/* MOBILE NAV - 5 ITEMS + MAIS */}
        {!isDesktop && (
          <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: LAYOUT.NAV_H,
            background: t.card2,
            borderTop: `1px solid ${t.borda}`,
            display: "flex",
            gap: 0,
            zIndex: 101,
            paddingBottom: 0
          }}>
            {[
              {id:"planilha",label:"Planilha",ico:"📋"},
              {id:"dashboard",label:"Dashboard",ico:"📊"},
              {id:"diarias",label:"Diárias",ico:"💰"},
              {id:"descarga",label:"Descarga",ico:"📦"},
              {id:"motoristas",label:"Motoristas",ico:"👥"},
            ].map(tab=>perms[tab.id]!==false && (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
                flex:1,padding:"6px 4px",border:"none",background:"transparent",color:activeTab===tab.id?t.ouro:t.txt2,fontWeight:activeTab===tab.id?700:500,fontSize:10,cursor:"pointer",borderTop:`2px solid ${activeTab===tab.id?t.ouro:"transparent"}`,transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3
              }}>
                <div style={{fontSize:16}}>{tab.ico}</div>
                <div style={{fontSize:9,lineHeight:1}}>{tab.label}</div>
              </button>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* MODALS */'''

content = re.sub(
    r'\n      \{/\* MODALS \*/',
    nav_html,
    content,
    count=1
)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added sidebar and mobile nav!")
