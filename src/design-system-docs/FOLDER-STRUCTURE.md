# PrayerMap - Export Folder Structure

Complete folder organization for your design handoff package with visual exports.

---

## 📂 Recommended Structure

```
prayermap-handoff/
│
├── 📄 documentation/
│   ├── 00-MASTER-HANDOFF-DOCUMENT.md
│   ├── 01-SCREEN-INVENTORY.md
│   ├── 02-DESIGN-SYSTEM.md
│   ├── 03-SCREEN-SPECIFICATIONS.md
│   ├── 04-COMPONENT-LIBRARY.md
│   ├── 05-INTERACTIONS-AND-ANIMATIONS.md
│   ├── 06-TECHNICAL-IMPLEMENTATION.md
│   ├── README.md
│   ├── QUICK-REFERENCE.md
│   ├── HANDOFF-SUMMARY.md
│   ├── EXPORT-GUIDE.md
│   └── FOLDER-STRUCTURE.md (this file)
│
├── 🖼️ exports/
│   │
│   ├── screens/
│   │   ├── desktop/
│   │   │   ├── 01-loading-screen@2x.png
│   │   │   ├── 02-auth-modal@2x.png
│   │   │   ├── 03-map-view-default@2x.png
│   │   │   ├── 03-map-view-with-preview@2x.png
│   │   │   ├── 04-prayer-detail-default@2x.png
│   │   │   ├── 04-prayer-detail-form-expanded@2x.png
│   │   │   ├── 04-prayer-detail-with-text@2x.png
│   │   │   ├── 05-request-prayer-modal@2x.png
│   │   │   ├── 05-request-prayer-audio@2x.png
│   │   │   ├── 05-request-prayer-video@2x.png
│   │   │   ├── 06-inbox-all-tab@2x.png
│   │   │   ├── 06-inbox-received-tab@2x.png
│   │   │   └── 06-inbox-empty-state@2x.png
│   │   │
│   │   └── mobile/ (optional)
│   │       ├── 01-loading-screen-mobile@2x.png
│   │       ├── 02-auth-modal-mobile@2x.png
│   │       ├── 03-map-view-mobile@2x.png
│   │       ├── 04-prayer-detail-mobile@2x.png
│   │       ├── 05-request-prayer-mobile@2x.png
│   │       └── 06-inbox-mobile@2x.png
│   │
│   ├── components/
│   │   ├── prayer-marker-default@2x.png
│   │   ├── prayer-marker-hover@2x.png
│   │   ├── prayer-marker-prayed@2x.png
│   │   ├── preview-bubble@2x.png
│   │   ├── connection-line-default@2x.png
│   │   ├── connection-line-hover@2x.png
│   │   ├── tab-system@2x.png
│   │   ├── prayer-card@2x.png
│   │   ├── notification-badge@2x.png
│   │   └── loading-spinner@2x.png
│   │
│   ├── animations/
│   │   ├── prayer-animation/
│   │   │   ├── frame-0-start@2x.png
│   │   │   ├── frame-1-camera-moving@2x.png
│   │   │   ├── frame-2-camera-arrived@2x.png
│   │   │   ├── frame-3-line-drawing@2x.png
│   │   │   ├── frame-4-line-complete@2x.png
│   │   │   ├── frame-5-spotlights@2x.png
│   │   │   └── frame-6-complete@2x.png
│   │   │
│   │   ├── modal-entrance/
│   │   │   ├── modal-slide-up-start@2x.png
│   │   │   ├── modal-slide-up-mid@2x.png
│   │   │   └── modal-slide-up-end@2x.png
│   │   │
│   │   └── particle-flow/
│   │       ├── particles-position-1@2x.png
│   │       ├── particles-position-2@2x.png
│   │       └── particles-position-3@2x.png
│   │
│   ├── states/
│   │   ├── loading-states/
│   │   │   ├── skeleton-prayer-card@2x.png
│   │   │   ├── spinner-dark@2x.png
│   │   │   └── spinner-light@2x.png
│   │   │
│   │   ├── empty-states/
│   │   │   ├── inbox-empty@2x.png
│   │   │   ├── map-no-prayers@2x.png
│   │   │   └── no-results@2x.png
│   │   │
│   │   └── error-states/
│   │       ├── form-validation-error@2x.png
│   │       ├── network-error@2x.png
│   │       └── map-load-error@2x.png
│   │
│   └── icons/
│       ├── prayer-hands-emoji@2x.png
│       ├── sparkles-emoji@2x.png
│       ├── music-note-emoji@2x.png
│       ├── video-camera-emoji@2x.png
│       ├── inbox-icon@2x.png
│       ├── settings-icon@2x.png
│       ├── send-icon@2x.png
│       ├── close-icon@2x.png
│       ├── mic-icon@2x.png
│       └── video-icon@2x.png
│
└── 📦 archive/
    ├── raw-exports/ (unoptimized originals)
    ├── video-recordings/ (screen recordings)
    └── working-files/ (PSDs, Sketch, etc.)
```

---

## 📁 Folder Descriptions

### `/documentation/`
**Contains:** All markdown documentation files  
**Purpose:** Complete written specifications  
**Size:** ~5-10 MB total  
**Share with:** Everyone (developers, designers, PMs)

---

### `/exports/screens/desktop/`
**Contains:** Full-screen captures at desktop resolution  
**Resolution:** 1440x900 @ 2x (2880x1800)  
**Format:** PNG  
**Purpose:** Show complete screen layouts  
**Size:** ~500KB - 1MB per file  
**Total:** ~8-13 files

---

### `/exports/screens/mobile/`
**Contains:** Mobile viewport captures (optional)  
**Resolution:** 375x812 @ 2x (750x1624)  
**Format:** PNG  
**Purpose:** Show mobile-specific behaviors  
**Size:** ~300KB - 600KB per file  
**Total:** ~6 files

---

### `/exports/components/`
**Contains:** Individual component exports  
**Resolution:** Varies by component  
**Background:** Transparent PNG when possible  
**Purpose:** Show component states in isolation  
**Size:** ~50KB - 200KB per file  
**Total:** ~10-15 files

---

### `/exports/animations/`
**Contains:** Animation frame sequences  
**Format:** PNG sequence or GIF/MP4  
**Purpose:** Show animation progression  
**Size:** ~300KB - 500KB per frame  
**Subfolders:** One per major animation

---

### `/exports/states/`
**Contains:** Loading, empty, and error states  
**Format:** PNG  
**Purpose:** Document edge cases  
**Size:** ~100KB - 300KB per file  
**Organization:** Grouped by state type

---

### `/exports/icons/`
**Contains:** All icons and emoji used  
**Resolution:** Various (24px, 32px, 48px @ 2x)  
**Background:** Transparent  
**Purpose:** Quick reference for icon usage  
**Size:** ~10KB - 50KB per file

---

### `/archive/`
**Contains:** Raw files, recordings, working files  
**Purpose:** Backup and reference  
**Organization:** Separated by file type  
**Note:** Don't share this with developers (internal only)

---

## 📦 Packaging Options

### Option 1: GitHub Repository (Recommended)

**Structure:**
```
prayermap-design-handoff/
├── README.md (main handoff readme)
├── docs/ (all .md files)
├── exports/ (all images)
└── .gitignore
```

**Advantages:**
- Version control
- Easy updates
- Collaborative review
- Git LFS for large images
- Free hosting

**Setup:**
```bash
git init prayermap-design-handoff
cd prayermap-design-handoff
git lfs install
git lfs track "*.png"
git add .
git commit -m "Initial design handoff"
git remote add origin [your-repo-url]
git push -u origin main
```

---

### Option 2: ZIP Archive

**Create separate ZIPs:**

**prayermap-documentation.zip** (~10 MB)
- All .md files
- README with instructions

**prayermap-exports-screens.zip** (~50-100 MB)
- All screen exports (desktop + mobile)
- Organized in folders

**prayermap-exports-components.zip** (~10-20 MB)
- All component exports
- All icon exports

**prayermap-exports-animations.zip** (~50-100 MB)
- All animation frames
- Video recordings if available

**Total:** 4 ZIP files, ~120-230 MB

**Share via:**
- Dropbox
- Google Drive
- WeTransfer
- Box
- OneDrive

---

### Option 3: Notion / Confluence Page

**Structure:**

**Page Hierarchy:**
```
🙏 PrayerMap Design Handoff
├── 📖 Project Overview
│   └── Embed: 00-MASTER-HANDOFF-DOCUMENT.md
├── 🎨 Design System
│   ├── Embed: 02-DESIGN-SYSTEM.md
│   └── Gallery: Color swatches
├── 🖼️ Screen Gallery
│   ├── Loading Screen
│   │   ├── Image: Export
│   │   └── Specs: Link to doc
│   ├── Auth Modal
│   └── [etc...]
├── 🧩 Components
│   └── Gallery: Component exports
├── 🎬 Animations
│   └── Video embeds or GIF previews
└── 💻 Technical Docs
    └── Embed: 06-TECHNICAL-IMPLEMENTATION.md
```

**Advantages:**
- Visual + text together
- Easy navigation
- Comments and feedback
- Version history
- Team collaboration

---

### Option 4: Figma File + Docs

**In Figma:**

**Pages:**
1. **📱 Screens** - All screen designs
2. **🧩 Components** - Component library
3. **🎨 Design System** - Colors, typography, styles
4. **🎬 Animations** - Animation sequences with notes
5. **📖 Documentation** - Embedded or linked markdown

**Advantages:**
- Design source of truth
- Interactive prototypes
- Dev Mode for measurements
- Comment system
- Easy updates

**Link External Docs:**
- Add links in Figma descriptions
- Use Figma plugins like "Markdown Table"
- Or host docs separately and link

---

## 📋 Index File (Create This)

Create an `INDEX.md` file as the entry point:

```markdown
# PrayerMap Design Handoff - Index

## 📚 Documentation
- [Master Handoff Document](documentation/00-MASTER-HANDOFF-DOCUMENT.md) ⭐ START HERE
- [README - How to Use This Package](documentation/README.md)
- [Quick Reference](documentation/QUICK-REFERENCE.md)
- [Screen Inventory](documentation/01-SCREEN-INVENTORY.md)
- [Design System](documentation/02-DESIGN-SYSTEM.md)
- [Screen Specifications](documentation/03-SCREEN-SPECIFICATIONS.md)
- [Component Library](documentation/04-COMPONENT-LIBRARY.md)
- [Interactions & Animations](documentation/05-INTERACTIONS-AND-ANIMATIONS.md)
- [Technical Implementation](documentation/06-TECHNICAL-IMPLEMENTATION.md)

## 🖼️ Visual Exports

### Screens
- [Desktop Screens](exports/screens/desktop/) - 13 files
- [Mobile Screens](exports/screens/mobile/) - 6 files

### Components
- [Component Library](exports/components/) - 10 files

### Animations
- [Prayer Animation](exports/animations/prayer-animation/) - 7 frames
- [Modal Animations](exports/animations/modal-entrance/) - 3 frames

### States
- [Loading States](exports/states/loading-states/)
- [Empty States](exports/states/empty-states/)
- [Error States](exports/states/error-states/)

## 🎯 Quick Links
- **For Developers:** [Technical Implementation](documentation/06-TECHNICAL-IMPLEMENTATION.md)
- **For Designers:** [Design System](documentation/02-DESIGN-SYSTEM.md)
- **For QA:** [Screen Specifications](documentation/03-SCREEN-SPECIFICATIONS.md)
- **For Quick Lookup:** [Quick Reference](documentation/QUICK-REFERENCE.md)

## 📦 Package Info
- **Total Size:** ~200-250 MB
- **Documentation:** 12 files, ~150 pages
- **Screen Exports:** 19 files
- **Component Exports:** 10 files
- **Animation Frames:** 13 files
- **Last Updated:** [Date]
- **Version:** 1.0
```

---

## 🏷️ File Naming Best Practices

### Screens
```
[number]-[screen-name]-[state]@[scale]x.png

Examples:
01-loading-screen@2x.png
03-map-view-default@2x.png
04-prayer-detail-form-expanded@2x.png
```

### Components
```
[component-name]-[state]@[scale]x.png

Examples:
prayer-marker-default@2x.png
preview-bubble@2x.png
connection-line-hover@2x.png
```

### Animations
```
[animation-name]-frame-[number]-[description]@[scale]x.png

Examples:
prayer-animation-frame-1-camera@2x.png
modal-entrance-frame-2-mid@2x.png
```

### Icons
```
[icon-name]-[variant]@[scale]x.png

Examples:
inbox-icon@2x.png
sparkles-emoji@2x.png
mic-icon-active@2x.png
```

---

## 📊 Size Guidelines

### Target File Sizes

| Asset Type | Target Size | Max Size |
|------------|-------------|----------|
| Full screen (desktop) | 500KB - 1MB | 2MB |
| Full screen (mobile) | 300KB - 600KB | 1MB |
| Component | 50KB - 200KB | 500KB |
| Icon | 10KB - 50KB | 100KB |
| Animation frame | 300KB - 500KB | 1MB |

### Total Package Size
- **Documentation only:** ~10 MB
- **With screen exports:** ~100 MB
- **Complete package:** ~200-250 MB
- **With videos:** ~500 MB - 1 GB

---

## ✅ Pre-Share Checklist

Before sharing your handoff package:

### File Organization
- [ ] All files in correct folders
- [ ] File names follow convention
- [ ] No duplicate files
- [ ] No temp/backup files included
- [ ] Index.md file created

### Documentation
- [ ] All .md files included
- [ ] Links in docs work (relative paths)
- [ ] README.md at root level
- [ ] Version number updated
- [ ] Last updated date added

### Exports
- [ ] All required screens exported
- [ ] Images optimized (compressed)
- [ ] Correct resolution (@2x or @3x)
- [ ] Proper color profile (sRGB)
- [ ] Backgrounds appropriate (opaque/transparent)

### Quality
- [ ] All images sharp and clear
- [ ] Text readable in all exports
- [ ] Colors accurate
- [ ] No artifacts or compression issues
- [ ] Correct states captured

### Technical
- [ ] File sizes reasonable
- [ ] ZIP files under 2GB each (if using ZIP)
- [ ] All links tested
- [ ] Compatible with Mac and Windows
- [ ] README includes setup instructions

---

## 🚀 Sharing Instructions

### For GitHub

**In your README.md:**
```markdown
# Download Instructions

## Clone Repository
git clone https://github.com/[username]/prayermap-handoff.git
cd prayermap-handoff

## If using Git LFS for images
git lfs pull

## Start with
Open `documentation/00-MASTER-HANDOFF-DOCUMENT.md`
```

---

### For ZIP Files

**In your README.txt:**
```
PrayerMap Design Handoff Package
================================

CONTENTS:
- documentation/ - All specification documents
- exports/ - All visual assets
- INDEX.md - Navigation guide

GETTING STARTED:
1. Extract all ZIP files to same directory
2. Open INDEX.md for navigation
3. Start with documentation/00-MASTER-HANDOFF-DOCUMENT.md

PACKAGE INFO:
- Version: 1.0
- Date: [Date]
- Total Size: ~200 MB
- Files: 50+ documents and images

CONTACT:
[Your contact info]
```

---

### For Cloud Storage (Dropbox, Drive, etc.)

**Folder Structure:**
```
📁 PrayerMap Handoff (Shared Folder)
├── 📄 START-HERE.txt (instructions)
├── 📂 documentation/
├── 📂 exports/
└── 📄 INDEX.md
```

**START-HERE.txt:**
```
Welcome to PrayerMap Design Handoff!

This folder contains complete design specifications
and visual assets for building PrayerMap.

QUICK START:
1. Open INDEX.md for full navigation
2. Read documentation/00-MASTER-HANDOFF-DOCUMENT.md
3. Explore exports/ folder for visual assets

PACKAGE CONTENTS:
- 12 documentation files (~150 pages)
- 40+ image exports
- Complete design system
- Technical implementation guide

NEED HELP?
See documentation/README.md for guidance.
```

---

## 🎯 Delivery Checklist by Role

### For Developers
**Must Include:**
- [ ] All documentation files
- [ ] Desktop screen exports (primary reference)
- [ ] Component exports (for details)
- [ ] Technical implementation guide
- [ ] Quick reference guide

**Optional:**
- Mobile exports
- Animation frames
- Video recordings

---

### For Designers
**Must Include:**
- [ ] Design system documentation
- [ ] All screen exports
- [ ] All component exports
- [ ] Color/typography specs

**Optional:**
- Technical implementation guide
- Animation frames

---

### For Product Managers
**Must Include:**
- [ ] Master handoff document
- [ ] Screen inventory
- [ ] All screen exports (overview)

**Optional:**
- Detailed technical docs
- Component details

---

## 💡 Tips for Organized Handoffs

### Use Consistent Naming
- Numbers for sequences (01, 02, 03)
- Lowercase with hyphens (screen-name)
- Always include @2x suffix

### Add Metadata Files
Create `metadata.json` for each folder:
```json
{
  "folder": "screens/desktop",
  "fileCount": 13,
  "totalSize": "12.4 MB",
  "resolution": "2880x1800",
  "format": "PNG",
  "colorProfile": "sRGB",
  "created": "2025-11-19"
}
```

### Create Thumbnails
Generate smaller preview images:
- Original: `03-map-view-default@2x.png` (2880x1800)
- Thumbnail: `03-map-view-default-thumb.png` (720x450)

### Version Control
If making updates:
```
v1.0/ (initial handoff)
v1.1/ (updated animations)
v2.0/ (major revision)
```

---

**Your handoff package is now perfectly organized and ready to share! 📦✨**

**Remember:** A well-organized handoff saves hours of back-and-forth questions.
