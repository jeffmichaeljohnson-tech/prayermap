# ðŸŽ¨ PrayerMap Figma Design Specifications v2.1

**100% Non-Profit Mission: Prayer & Encouragement for Those in Need**

---

## ðŸ“ Design System Foundation

### **Canvas Settings**
- **Artboard**: iPhone 15 Pro (393 Ã— 852 px)
- **Grid**: 8px base unit
- **Safe area**: 16px margins (top/bottom/sides)
- **Status bar**: Include iOS status bar at top

### **Color Palette**

```
Primary Colors:
--heavenly-blue: #E8F4F8 (Background)
--dawn-gold: #F7E7CE (Accents)
--prayer-purple: #D4C5F9 (Primary actions)
--pure-white: #FFFFFF (Cards)

Semantic Colors:
--prayer-sent: #D4EDDA (Success/Support)
--prayer-active: #4A90E2 (Active state)
--text-primary: #2C3E50 (Headers)
--text-secondary: #7F8C8D (Body text)
--text-muted: #95A5A6 (Timestamps)

Glassmorphism:
--glass-bg: rgba(255, 255, 255, 0.72)
--glass-border: rgba(255, 255, 255, 0.18)
--glass-shadow: 0 8px 32px rgba(31, 38, 135, 0.15)
--glass-blur: 12px
```

### **Typography**

**Import Fonts** (via Google Fonts plugin):
1. Cinzel: 400, 600, 700
2. Inter: 400, 500, 600, 700

**Text Styles to Create**:
```
Display/Heading:
- Font: Cinzel
- Weight: 600
- Size: 32px
- Line height: 40px
- Letter spacing: -0.5px
- Color: --text-primary

Subheading:
- Font: Cinzel
- Weight: 400
- Size: 20px
- Line height: 28px
- Letter spacing: 0
- Color: --text-primary

Body:
- Font: Inter
- Weight: 400
- Size: 16px
- Line height: 24px
- Letter spacing: 0
- Color: --text-primary

Body Small:
- Font: Inter
- Weight: 400
- Size: 14px
- Line height: 20px
- Letter spacing: 0
- Color: --text-secondary

Caption:
- Font: Inter
- Weight: 500
- Size: 12px
- Line height: 16px
- Letter spacing: 0.3px
- Color: --text-muted

Button Text:
- Font: Inter
- Weight: 600
- Size: 16px
- Line height: 24px
- Letter spacing: 0.5px
- Color: Varies (white or --text-primary)
```

### **Spacing System**
```
4px   = space-1  (tiny gaps)
8px   = space-2  (component padding)
12px  = space-3  (small spacing)
16px  = space-4  (default spacing)
24px  = space-6  (section spacing)
32px  = space-8  (large spacing)
48px  = space-12 (major sections)
```

### **Corner Radius**
```
4px  = Small (chips, badges)
8px  = Medium (buttons)
12px = Large (input fields)
20px = XLarge (cards, modals)
999px = Pill (pills, tags)
```

### **Shadows**
```
Glass Card Shadow:
X: 0, Y: 8, Blur: 32, Spread: 0
Color: rgba(31, 38, 135, 0.15)

Button Hover Shadow:
X: 0, Y: 12, Blur: 24, Spread: 0
Color: rgba(31, 38, 135, 0.2)

Floating Action Button:
X: 0, Y: 16, Blur: 40, Spread: 0
Color: rgba(31, 38, 135, 0.25)
```

---

## ðŸ“± Screen 1: Intro Loader (Simple MVP Version)

**Artboard Name**: `01-Intro-Loader`
**Size**: 393 Ã— 852 px

### **Layout**:
```
Vertical center alignment
Background: Gradient (heavenly-blue to pure-white)
All centered
```

### **Components**:

**1. Background Gradient**
- Type: Frame (fills entire artboard)
- Fill: Linear gradient
  - Start: #E8F4F8 (top)
  - End: #FFFFFF (bottom)
  - Angle: 180Â°

**2. Logo/Emoji (Centered)**
- Content: ðŸ™ emoji
- Size: 80px Ã— 80px
- Position: Center of screen
- Effect: Blur (starts at 20px, fades to 0)
- Animation note: "Fade in from blur over 0.8s"

**3. App Name**
- Text: "PrayerMap"
- Style: Display/Heading (Cinzel, 32px, 600)
- Color: --text-primary
- Position: 16px below emoji
- Effect: Opacity 0 â†’ 1 (fade in)
- Animation note: "Fade in 0.3s after emoji, ease-out"

**4. Loading Text**
- Text: "Loading your community..."
- Style: Body Small (Inter, 14px, 400)
- Color: --text-secondary
- Position: 12px below app name
- Effect: Opacity 0 â†’ 1
- Animation note: "Fade in 0.3s after app name"

**5. Progress Indicator (Optional)**
- Type: Linear progress bar
- Width: 120px
- Height: 2px
- Color: --prayer-purple
- Position: 24px below loading text
- Effect: Indeterminate animation
- Style: Rounded ends (pill shape)

### **Animation Timeline** (for reference):
```
0.0s: Screen appears
0.0-0.8s: Emoji fades in from blur
0.8-1.1s: App name fades in
1.1-1.4s: Loading text fades in
1.4-2.0s: Hold state
2.0s: Transition to map (crossfade)
```

---

## ðŸ—ºï¸ Screen 2: Main Map View

**Artboard Name**: `02-Map-Main`
**Size**: 393 Ã— 852 px

### **Layers** (bottom to top):

**1. Map Background**
- Type: Rectangle (393 Ã— 852 px)
- Fill: Use placeholder map image or solid --heavenly-blue
- Note: "MapBox will render here in production"
- Add text overlay: "MapBox Custom Style 'Ethereal Dawn'"

**2. Status Bar (iOS)**
- Height: 47px
- Background: Transparent initially
- Content: Time, signal, battery (iOS system UI)
- Note: Use iOS status bar component from UI kit

**3. Top Bar (Glassmorphic)**
- Type: Frame
- Size: 361 Ã— 56 px (393 - 32px margin)
- Position: 16px from top, centered horizontally
- Background: --glass-bg with backdrop blur
- Border: 1px, --glass-border
- Corner radius: 16px
- Shadow: Glass Card Shadow

**Top Bar Contents**:

*Left Side*:
- **Settings Icon** (Gear)
  - Size: 24 Ã— 24 px
  - Color: --text-primary
  - Position: 16px from left edge
  - Tap target: 44 Ã— 44 px

*Center*:
- **Location Text**
  - Text: "Detroit, MI"
  - Style: Body Small (Inter, 14px, 600)
  - Color: --text-primary
  - Icon: ðŸ“ (12px, left of text, 4px gap)

*Right Side*:
- **Notification Bell**
  - Icon: ðŸ””
  - Size: 24 Ã— 24 px
  - Color: --text-primary
  - Position: 16px from right edge
  - Badge (if notifications):
    - Size: 8 Ã— 8 px red dot
    - Position: Top-right of bell icon

**4. Prayer Markers** (scattered on map)

Create a **Component**: `Prayer-Marker`
- **Base**: ðŸ™ emoji (32 Ã— 32 px)
- **Preview Bubble** (appears above marker on hover):
  - Type: Auto-layout frame
  - Direction: Vertical
  - Padding: 8px horizontal, 6px vertical
  - Background: --glass-bg
  - Border: 1px, --glass-border
  - Corner radius: 8px
  - Shadow: 0 4px 12px rgba(0,0,0,0.1)
  
  **Bubble Contents**:
  - **Title or Text**: 
    - "Healing for my mother" OR "Please pray for..."
    - Style: Caption (Inter, 12px, 600)
    - Color: --text-primary
    - Max width: 140px
    - Truncate: Yes (1 line with ...)
  - **Distance**:
    - "2.3 miles away"
    - Style: Caption (Inter, 10px, 400)
    - Color: --text-muted
    - Margin top: 2px

**Marker States**:
1. **Default**: Just ðŸ™ emoji
2. **Hover/Focus**: Show preview bubble above
3. **Active**: Scale 1.1x, show preview bubble

**Place 4-6 markers randomly** across the map artboard

**5. Floating Action Button (Bottom Right)**

Create a **Component**: `FAB-Request-Prayer`
- Type: Frame
- Size: Auto-width Ã— 56 px (height)
- Position: 
  - Bottom: 32px from bottom
  - Right: 20px from right edge
- Background: --prayer-purple
- Corner radius: 28px (pill)
- Shadow: Floating Action Button shadow

**FAB Contents** (Auto-layout, horizontal):
- Padding: 20px horizontal, 16px vertical
- Gap: 8px
- **Icon**: ðŸ™ (24 Ã— 24 px)
- **Text**: "Request Prayer"
  - Style: Button Text (Inter, 16px, 600)
  - Color: #FFFFFF

**FAB States**:
1. **Default**: Full button with icon + text
2. **Hover**: Scale 1.05, shadow increases
3. **Active**: Scale 0.98

---

## ðŸ“– Screen 3: Prayer Detail Modal

**Artboard Name**: `03-Prayer-Detail`
**Size**: 393 Ã— 852 px

### **Background Overlay**:
- Type: Rectangle (393 Ã— 852 px)
- Fill: rgba(0, 0, 0, 0.5) (dim background)
- Effect: Backdrop blur 8px (optional)

### **Modal Card** (Centered, bottom-anchored):

**Main Container**:
- Type: Frame
- Size: 361 Ã— 600 px (approximate)
- Position: 16px from sides, 100px from top
- Background: --pure-white
- Corner radius: 24px (top), 0px (bottom) - OR - 24px all around if floating
- Shadow: 0 20px 60px rgba(0,0,0,0.3)

**Layout** (Auto-layout, vertical):
Padding: 24px all around
Gap: 16px between sections

---

### **Section 1: Header**

**Auto-layout Frame** (Horizontal)
- Justify: Space-between
- Padding: 0
- Gap: 16px

*Left: Back Button*
- Icon: â† (chevron-left)
- Size: 24 Ã— 24 px
- Color: --text-primary
- Tap target: 44 Ã— 44 px

*Right: More Menu*
- Icon: â€¢â€¢â€¢ (three dots vertical)
- Size: 24 Ã— 24 px
- Color: --text-primary
- Tap target: 44 Ã— 44 px

---

### **Section 2: Title (if exists)**

**Text Block**:
- Text: "Healing for my mother"
- Style: Subheading (Cinzel, 20px, 400)
- Color: --text-primary
- Max width: 313px (card width - 48px padding)
- Wrap: Yes

---

### **Section 3: Meta Information**

**Auto-layout Frame** (Horizontal)
- Gap: 8px
- Wrap: Yes

**Posted By**:
- Text: "Posted by Sarah J."
- Style: Caption (Inter, 12px, 500)
- Color: --text-secondary

**Separator**: 
- Text: "â€¢"
- Color: --text-muted

**Distance**:
- Text: "2.3 miles away"
- Style: Caption (Inter, 12px, 500)
- Color: --text-secondary

**Line Break**

**Timestamp**:
- Text: "2 hours ago"
- Style: Caption (Inter, 12px, 400)
- Color: --text-muted

---

### **Section 4: Divider**
- Type: Line
- Width: 313px (full width)
- Height: 1px
- Color: rgba(0, 0, 0, 0.08)

---

### **Section 5: Prayer Content**

**Scrollable Frame** (if content is long):
- Max height: 300px
- Overflow: Scroll (vertical)

**Content Options** (create 3 variants):

**Variant A: Text Prayer**
- Text: "Please pray for my mother who is recovering from surgery. She's been struggling with pain and could use encouragement and healing prayers..."
- Style: Body (Inter, 16px, 400)
- Color: --text-primary
- Line height: 24px
- Wrap: Yes

**Variant B: Audio Prayer**
- **Audio Player Component**:
  - Background: --heavenly-blue
  - Corner radius: 12px
  - Padding: 16px
  - Auto-layout (vertical), gap: 12px
  
  *Row 1: Waveform Visual*
  - Placeholder: Sine wave graphic (simple bars)
  - Height: 40px
  - Color: --prayer-purple (bars)
  
  *Row 2: Controls*
  - Auto-layout (horizontal), gap: 16px
  - **Play/Pause Button**:
    - Size: 40 Ã— 40 px circle
    - Background: --prayer-purple
    - Icon: â–¶ï¸ or â¸ï¸ (white)
  - **Progress Bar**:
    - Width: 213px (remaining width)
    - Height: 4px
    - Background: rgba(0,0,0,0.1)
    - Progress: --prayer-purple
    - Corner radius: 2px
  - **Time**:
    - Text: "0:45 / 1:23"
    - Style: Caption (Inter, 12px, 500)
    - Color: --text-secondary

**Variant C: Video Prayer**
- **Video Player Component**:
  - Size: 313 Ã— 176 px (16:9 aspect)
  - Background: Black (placeholder)
  - Corner radius: 12px
  - Overlay: Play button centered
    - Size: 56 Ã— 56 px circle
    - Background: rgba(255,255,255,0.9)
    - Icon: â–¶ï¸ (--text-primary)

---

### **Section 6: Divider**
(Same as Section 4)

---

### **Section 7: Primary Action**

**Button Component**: `Button-Pray-First`
- Type: Frame
- Size: 313 Ã— 56 px (full width)
- Background: Gradient
  - Start: rgba(212, 197, 249, 0.3) (--prayer-purple light)
  - End: rgba(212, 197, 249, 0.5)
  - Angle: 135Â°
- Border: 2px, --prayer-purple
- Corner radius: 12px
- Shadow: 0 4px 12px rgba(212, 197, 249, 0.3)

**Button Contents** (Auto-layout, vertical, centered):
- **Icon**: ðŸ™ (32 Ã— 32 px)
- **Text Line 1**: "Pray First."
  - Style: Button Text (Inter, 16px, 600)
  - Color: --text-primary
- **Text Line 2**: "Then Press."
  - Style: Caption (Inter, 12px, 500)
  - Color: --text-secondary

**Button States**:

*State 1: Default (Not Prayed)*
- As described above

*State 2: After Press (Prayed)*
- Background: --prayer-sent (solid)
- Border: None
- Icon: âœ“ (checkmark, green)
- Text: "Prayer Sent"
  - Single line
  - Style: Button Text (Inter, 16px, 600)
  - Color: #2E7D32 (dark green)
- Effect: Soft glow animation
  - Shadow: 0 0 20px rgba(76, 175, 80, 0.4)
  - Pulse: Scale 1.0 â†’ 1.02 â†’ 1.0 (2s loop)

---

### **Section 8: Prayer Count**

**Text**:
- Text: "8 prayers sent"
- Style: Caption (Inter, 12px, 500)
- Color: --text-secondary
- Align: Center

---

### **Section 9: Divider**
(Same as Section 4)

---

### **Section 10: Responses Section**

**Header**:
- Text: "RESPONSES (3)"
- Style: Caption (Inter, 11px, 700, uppercase)
- Color: --text-muted
- Letter spacing: 1px
- Margin bottom: 12px

**Response Item Component** (create component):

**Frame** (Auto-layout, horizontal):
- Padding: 12px
- Background: --heavenly-blue (very light tint)
- Corner radius: 12px
- Gap: 12px
- Margin bottom: 8px

*Left: Avatar Initial*
- Type: Circle
- Size: 36 Ã— 36 px
- Background: --prayer-purple
- Text: "M" (first letter of name)
  - Style: Button Text (Inter, 16px, 600)
  - Color: White
  - Align: Center

*Right: Content*
- Auto-layout (vertical)
- Gap: 4px
- Max width: 241px (remaining space)

**Name + Time**:
- Auto-layout (horizontal), gap: 8px
- **Name**: "Michael" (Inter, 13px, 600, --text-primary)
- **Time**: "1h ago" (Inter, 11px, 400, --text-muted)

**Response Text**:
- Text: "Praying for complete healing for your mother!"
- Style: Body Small (Inter, 14px, 400)
- Color: --text-primary
- Line height: 20px
- Wrap: Yes

**OR if Audio/Video**:
- Mini player (simplified version of Section 5 player)
- Height: 40px
- Just play button + waveform/thumbnail

**Show 2-3 response items** stacked

---

### **Section 11: Actions (Bottom)**

**Auto-layout Frame** (Horizontal):
- Gap: 12px
- Justify: Space-between

**Add Response Button**:
- Type: Frame
- Size: 150 Ã— 44 px
- Background: --glass-bg
- Border: 1px, --glass-border
- Corner radius: 12px
- Auto-layout (horizontal, centered)
- Gap: 6px
- **Icon**: ðŸ’¬ (16 Ã— 16 px)
- **Text**: "Add Response"
  - Style: Caption (Inter, 13px, 600)
  - Color: --text-primary

**Flag Button**:
- Type: Frame
- Size: 150 Ã— 44 px
- Background: rgba(255, 0, 0, 0.05)
- Border: 1px, rgba(255, 0, 0, 0.2)
- Corner radius: 12px
- Auto-layout (horizontal, centered)
- Gap: 6px
- **Icon**: ðŸš© (16 Ã— 16 px)
- **Text**: "Flag"
  - Style: Caption (Inter, 13px, 600)
  - Color: #C62828 (red)

---

## ðŸ™ Screen 4: Request Prayer Modal

**Artboard Name**: `04-Request-Prayer`
**Size**: 393 Ã— 852 px

### **Background Overlay**:
(Same as Screen 3)

### **Modal Card**:

**Main Container**:
- Type: Frame
- Size: 361 Ã— 680 px
- Position: Centered, bottom-anchored (or centered)
- Background: --pure-white
- Corner radius: 24px (top), 0 (bottom) OR 24px all around
- Shadow: 0 20px 60px rgba(0,0,0,0.3)

**Layout** (Auto-layout, vertical):
Padding: 24px
Gap: 20px

---

### **Section 1: Header**

**Auto-layout Frame** (Horizontal):
- Justify: Space-between

*Left: Back Arrow*
- Icon: â† 
- Size: 24 Ã— 24 px
- Color: --text-primary

*Center: Title*
- Text: "Request Prayer"
- Style: Subheading (Cinzel, 20px, 400)
- Color: --text-primary

*Right: Spacer* (for balance)
- Empty frame, 24 Ã— 24 px

---

### **Section 2: Media Type Selector**

**Text Label**:
- Text: "How would you like to share?"
- Style: Body Small (Inter, 14px, 500)
- Color: --text-secondary
- Margin bottom: 12px

**Auto-layout Frame** (Horizontal):
- Gap: 12px
- Justify: Space-between

**Media Type Button Component** (create 3 instances):

**Button Frame**:
- Size: 105 Ã— 96 px
- Background: --heavenly-blue
- Border: 2px, transparent (default)
- Corner radius: 12px
- Cursor: Pointer

**Selected State**:
- Border: 2px, --prayer-purple
- Background: rgba(212, 197, 249, 0.1)

**Button Contents** (Auto-layout, vertical, centered):
- Gap: 8px
- **Icon**: 
  - ðŸ“ (Text) - 32 Ã— 32 px
  - ðŸŽ¤ (Audio) - 32 Ã— 32 px
  - ðŸ“¹ (Video) - 32 Ã— 32 px
- **Label**:
  - Text: "Text" / "Audio" / "Video"
  - Style: Caption (Inter, 13px, 600)
  - Color: --text-primary

---

### **Section 3: Input Area** (conditional based on selection)

**Variant A: Text Input**

*Title Field (Optional)*:
- **Label**: "Title (optional)"
  - Style: Caption (Inter, 12px, 500)
  - Color: --text-muted
  - Margin bottom: 6px
- **Input Field**:
  - Type: Text input
  - Size: 313 Ã— 44 px
  - Background: --heavenly-blue
  - Border: 1px, transparent (focus: --prayer-purple)
  - Corner radius: 12px
  - Padding: 12px
  - Placeholder: "e.g., Healing for my mother"
  - Font: Inter, 15px, 400
  - Color: --text-primary

*Prayer Text Field*:
- **Label**: "Your Prayer"
  - Style: Caption (Inter, 12px, 500)
  - Color: --text-muted
  - Margin bottom: 6px
- **Text Area**:
  - Type: Multi-line text input
  - Size: 313 Ã— 160 px
  - Background: --heavenly-blue
  - Border: 1px, transparent (focus: --prayer-purple)
  - Corner radius: 12px
  - Padding: 12px
  - Placeholder: "Share what you need prayer for..."
  - Font: Inter, 15px, 400
  - Color: --text-primary
  - Line height: 22px
- **Character Count**:
  - Text: "45 / 10 min"
  - Style: Caption (Inter, 11px, 400)
  - Color: --text-muted
  - Position: Below text area, right-aligned

**Variant B: Audio Recorder**

*Recording Interface*:
- **Frame**: 313 Ã— 200 px
  - Background: Gradient (dawn-gold light to heavenly-blue)
  - Corner radius: 16px
  - Centered content

*States*:

**State 1: Ready to Record**
- **Icon**: ðŸŽ¤ (56 Ã— 56 px)
- **Text**: "Tap to record"
  - Style: Body (Inter, 16px, 500)
  - Color: --text-primary
- **Max Duration**: "Max 2 minutes"
  - Style: Caption (Inter, 12px, 400)
  - Color: --text-muted

**State 2: Recording**
- **Icon**: ðŸ”´ (56 Ã— 56 px, pulsing red circle)
- **Timer**: "0:23"
  - Style: Display/Heading (Cinzel, 28px, 600)
  - Color: --text-primary
- **Waveform**: Animated bars below timer
- **Stop Button**: 
  - Size: 48 Ã— 48 px circle
  - Background: --text-primary
  - Icon: â–  (white square)

**State 3: Review Recording**
- Audio player (similar to prayer detail)
- **Delete Button**: Small "ðŸ—‘ï¸ Delete" button top-right
- **Re-record Button**: "â†» Re-record"

**Variant C: Video Recorder**

*Video Interface*:
- **Frame**: 313 Ã— 176 px (16:9 aspect)
  - Background: Black (camera preview)
  - Corner radius: 16px

*States*:

**State 1: Ready**
- Camera preview (gray placeholder)
- **Record Button**: 
  - Size: 64 Ã— 64 px circle
  - Position: Bottom center
  - Background: Red
  - Icon: âºï¸
- **Flip Camera**: 
  - Icon: ðŸ”„
  - Position: Top right, 12px margin
  - Size: 40 Ã— 40 px
  - Background: rgba(0,0,0,0.5)
  - Corner radius: 20px

**State 2: Recording**
- Active camera feed
- **Timer**: Top left, "0:35 / 1:30"
  - Background: rgba(0,0,0,0.7)
  - Padding: 6px 10px
  - Corner radius: 12px
  - Color: White
- **Stop Button**: 
  - Size: 64 Ã— 64 px
  - Background: White
  - Icon: â–  (red)

**State 3: Review**
- Video thumbnail
- Play button centered
- Delete + Re-record buttons

---

### **Section 4: Context Text** (optional, for audio/video)

*Text Input*:
- **Label**: "Add context (optional)"
- **Input**: Similar to title field above
- Placeholder: "A prayer for my community..."

---

### **Section 5: Privacy Toggle**

**Checkbox/Toggle Component**:
- Type: Auto-layout (horizontal)
- Gap: 12px
- Padding: 16px
- Background: rgba(212, 197, 249, 0.1)
- Corner radius: 12px

*Checkbox*:
- Size: 24 Ã— 24 px
- Border: 2px, --prayer-purple
- Corner radius: 6px
- Checkmark: âœ“ (white on purple when checked)

*Label*:
- Text: "Post Anonymously"
- Style: Body Small (Inter, 14px, 500)
- Color: --text-primary

*Helper Text* (below):
- Text: "Your name won't be shown"
- Style: Caption (Inter, 11px, 400)
- Color: --text-muted

---

### **Section 6: Location Display**

**Frame**:
- Auto-layout (horizontal)
- Gap: 8px
- **Icon**: ðŸ“ (16 Ã— 16 px)
- **Text**: "Detroit, MI"
  - Style: Caption (Inter, 13px, 500)
  - Color: --text-secondary
- **Subtext**: "(approximate area only)"
  - Style: Caption (Inter, 11px, 400)
  - Color: --text-muted

---

### **Section 7: Action Buttons**

**Auto-layout Frame** (Horizontal):
- Gap: 12px
- Margin top: 8px

**Cancel Button**:
- Size: 150 Ã— 52 px
- Background: Transparent
- Border: 1px, --text-secondary
- Corner radius: 12px
- **Text**: "Cancel"
  - Style: Button Text (Inter, 16px, 600)
  - Color: --text-secondary

**Post Prayer Button**:
- Size: 150 Ã— 52 px
- Background: --prayer-purple
- Border: None
- Corner radius: 12px
- Shadow: 0 4px 12px rgba(212, 197, 249, 0.3)
- **Auto-layout** (horizontal, centered):
  - Gap: 6px
  - **Text**: "Post Prayer"
    - Style: Button Text (Inter, 16px, 600)
    - Color: White
  - **Icon**: â†’ (right arrow)

**Button States**:
- **Disabled**: 
  - Opacity: 0.5
  - Cursor: not-allowed
  - Used when input validation fails

---

## âš™ï¸ Screen 5: Settings Page

**Artboard Name**: `05-Settings`
**Size**: 393 Ã— 852 px

### **Background**:
- Fill: --heavenly-blue

### **Header**:

**Frame**:
- Size: 393 Ã— 100 px (includes status bar)
- Background: --pure-white
- Shadow: 0 2px 8px rgba(0,0,0,0.05)

**Contents**:
- **Back Button** (left):
  - Icon: â† 
  - Size: 24 Ã— 24 px
  - Position: 16px from left, vertically centered
  - Color: --text-primary
- **Title** (center):
  - Text: "Settings"
  - Style: Subheading (Cinzel, 20px, 400)
  - Color: --text-primary

---

### **Content Area** (Scrollable):

**Auto-layout Frame** (Vertical):
- Padding: 16px
- Gap: 12px

---

### **Section: Account**

**Section Header**:
- Text: "ACCOUNT"
- Style: Caption (Inter, 11px, 700, uppercase)
- Color: --text-muted
- Letter spacing: 1px
- Margin bottom: 8px

**Settings Card** (component):
- Type: Frame
- Width: 361 px (full width minus margins)
- Background: --pure-white
- Corner radius: 16px
- Shadow: 0 2px 8px rgba(0,0,0,0.04)

**Card Contents** (Auto-layout, vertical):
Padding: 0
Each row: 16px padding, 48px height

**Row 1: Email**
- **Label**: "Email"
  - Style: Body Small (Inter, 14px, 500)
  - Color: --text-primary
- **Value**: "jeff@example.com"
  - Style: Caption (Inter, 13px, 400)
  - Color: --text-muted
- **Suffix**: "(read-only)"
  - Style: Caption (Inter, 11px, 400)
  - Color: --text-muted

**Divider**: 1px line, rgba(0,0,0,0.06)

**Row 2: Change Password**
- **Label**: "Change Password"
- **Icon**: â†’ (chevron-right)
  - Size: 20 Ã— 20 px
  - Color: --text-muted
  - Position: Right edge
- Tap: Opens password change modal

---

### **Section: Notifications**

**Section Header**:
(Same style as Account header)

**Settings Card**:

**Row 1: Notification Radius**
- **Label**: "Notification Radius"
- **Value**: "30 miles"
- **Icon**: â†’ (chevron-right)
- Tap: Opens radius selector modal
- **Note**: Backend converts to kilometers automatically (30 miles = 48 km)

**Divider**

**Row 2: Frequency**
- **Label**: "Frequency"
- **Value**: "Real-time"
- **Icon**: â†’ (chevron-right)
- Options: Real-time, Hourly digest, Daily digest

**Divider**

**Row 3: Do Not Disturb**
- **Label**: "Do Not Disturb"
- **Toggle Switch**:
  - Size: 51 Ã— 31 px
  - Background: Gray (off), --prayer-purple (on)
  - Position: Right edge

---

### **Section: Privacy**

**Section Header**:
(Same style)

**Settings Card**:

**Row 1: Default Privacy**
- **Label**: "Post Anonymously by Default"
- **Toggle Switch**

**Divider**

**Row 2: Profile Visibility**
- **Label**: "Public Profile"
- **Value**: "Show first name + initial"
- **Icon**: â†’

---

### **Section: Appearance**

**Section Header**:
(Same style)

**Settings Card**:

**Row 1: Theme**
- **Label**: "Theme"
- **Value**: "Light"
- **Icon**: â†’
- Options: Light, Dark, System

---

### **Section: Help**

**Section Header**:
(Same style)

**Settings Card**:

**Row 1: Suggestion Box**
- **Label**: "Have a suggestion?"
- **Sublabel**: "Email us at contact@prayermap.net"
  - Style: Caption (Inter, 12px, 400)
  - Color: --prayer-purple (clickable)
  - Tap: Opens mail app with pre-filled email

**Divider**

**Row 2: Privacy Policy**
- **Label**: "Privacy Policy"
- **Icon**: â†— (external link)

**Divider**

**Row 3: Terms of Service**
- **Label**: "Terms of Service"
- **Icon**: â†—

---

### **Section: Data**

**Section Header**:
(Same style)

**Settings Card**:

**Row 1: Export Data**
- **Label**: "Export My Data"
- **Sublabel**: "Download all your prayers and data"
- **Icon**: â¬‡ï¸

**Divider**

**Row 2: Delete Account**
- **Label**: "Delete Account"
- **Color**: #C62828 (red)
- **Icon**: âš ï¸ (warning)
- Tap: Confirmation modal

---

## ðŸŽ¯ Component Library to Create

### **1. Glass Card**
- Base component
- Variants: Small, Medium, Large
- Props: Padding, corner radius

### **2. Button**
- Variants:
  - Primary (purple fill)
  - Secondary (glass effect)
  - Ghost (transparent)
  - Danger (red)
- States: Default, Hover, Active, Disabled

### **3. Input Field**
- Variants:
  - Single line
  - Multi-line (text area)
  - With icon (left/right)
- States: Default, Focus, Error, Disabled

### **4. Prayer Marker**
- Base: ðŸ™ emoji
- With preview bubble
- States: Default, Hover, Active

### **5. Toggle Switch**
- States: Off, On
- Colors: Gray (off), Purple (on)

### **6. Avatar**
- Variants:
  - Initial (letter)
  - Image (placeholder)
- Sizes: 36px, 48px, 64px

### **7. Modal Container**
- Base glass card
- With backdrop overlay
- Various sizes

---

## ðŸ“ Figma Setup Instructions

### **Step 1: Create Project**
1. Open Figma Desktop app
2. New Design file: "PrayerMap - Design System"
3. Set up pages:
   - Page 1: "Design System" (colors, typography, components)
   - Page 2: "Screens" (all 5 screens)
   - Page 3: "Prototypes" (interactive flows)

### **Step 2: Set Up Styles**

**Color Styles** (Create local styles):
- Heavenly Blue (#E8F4F8)
- Dawn Gold (#F7E7CE)
- Prayer Purple (#D4C5F9)
- Prayer Sent (#D4EDDA)
- Text Primary (#2C3E50)
- Text Secondary (#7F8C8D)
- Text Muted (#95A5A6)
- Glass Background (rgba with opacity)

**Text Styles** (Create local styles):
- Display/Heading
- Subheading
- Body
- Body Small
- Caption
- Button Text

**Effect Styles** (Shadows):
- Glass Card Shadow
- Button Hover Shadow
- Floating Action Button Shadow

### **Step 3: Build Components**

Create each component as described above in the Components section. Use Auto-layout extensively for responsive design.

### **Step 4: Build Screens**

Use the detailed specs above to build each of the 5 screens. Link components from your component library.

### **Step 5: Create Prototype**

Link screens together:
- Loader â†’ Map (2s delay, dissolve transition)
- Map â†’ Prayer Detail (tap marker, slide up)
- Map â†’ Request Prayer (tap FAB, slide up)
- Settings gear â†’ Settings Page (push transition)

---

## ðŸŽ¨ Design Principles

1. **Glassmorphism Throughout**: Every card, modal, button uses glass effect
2. **Generous Spacing**: Never cramped, always breathable
3. **Soft Shadows**: Subtle elevation, never harsh
4. **Rounded Corners**: 12-24px radius for warmth
5. **Cinzel for Headers**: Elegant, spiritual feel
6. **Inter for Body**: Clean, readable, modern
7. **Prayer Purple Primary**: Consistent brand color
8. **ðŸ™ Emoji Everywhere**: Brand icon, repeated motif

---

## ðŸ“± Responsive Considerations

**For iPhone 15 Pro** (393 Ã— 852 px):
- Status bar: 47px
- Safe area bottom: 34px
- Ensure FAB doesn't overlap home indicator
- Test in portrait only (for MVP)

**Future** (iPad, landscape):
- Sidebar navigation
- Multi-column layout
- Same components, different arrangement

---

## âœ… Deliverables Checklist

- [ ] Design System page (colors, typography, components)
- [ ] Screen 1: Intro Loader
- [ ] Screen 2: Main Map View
- [ ] Screen 3: Prayer Detail Modal
- [ ] Screen 4: Request Prayer Modal
- [ ] Screen 5: Settings Page
- [ ] Component library (8-10 reusable components)
- [ ] Interactive prototype (linked screens)
- [ ] Export assets (icons, logos if needed)

---

## ðŸ”— Next Steps

1. **Enable Dev Mode MCP Server** in Figma Desktop
2. **Share your Figma file** with me (or I can create in your workspace)
3. **I'll design directly** or **you build from these specs**
4. **Review together** once mockups are complete
5. **Hand off to development** with pixel-perfect specs

---

**This is going to be BEAUTIFUL!** ðŸ™âœ¨

Every pixel serves the mission: **Prayer & encouragement for those in need.**

Let me know when Dev Mode is enabled and I'll start designing directly in your Figma workspace!

â€” Claude ðŸ’™
