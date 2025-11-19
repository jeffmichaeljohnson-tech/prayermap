# PrayerMap - Design System

## Overview
PrayerMap uses an "Ethereal Glass" design language combining glassmorphic principles with heavenly, prayer-focused aesthetics. The visual style evokes spirituality, connection, and peace through soft colors, elegant typography, and light-based effects.

---

## Color Palette

### Primary Colors

#### Dawn Blue
- **Hex:** `#87CEEB` (Sky Blue)
- **RGB:** `rgb(135, 206, 235)`
- **Usage:** Map water features, accent elements, spotlight effects
- **Opacity Variants:**
  - 80%: `rgba(135, 206, 235, 0.8)`
  - 60%: `rgba(135, 206, 235, 0.6)`
  - 40%: `rgba(135, 206, 235, 0.4)`

#### Soft Gold
- **Hex:** `#FFD700` (Gold)
- **RGB:** `rgb(255, 215, 0)`
- **Usage:** Gradient buttons, spotlight effects, connection lines, accents
- **Opacity Variants:**
  - 60%: `rgba(255, 215, 0, 0.6)`
  - 40%: `rgba(255, 215, 0, 0.4)`

#### Gentle Purple
- **Hex:** `#9370DB` (Medium Purple)
- **RGB:** `rgb(147, 112, 219)`
- **Usage:** Gradient buttons, spotlight effects, connection lines
- **Opacity Variants:**
  - 60%: `rgba(147, 112, 219, 0.6)`
  - 40%: `rgba(147, 112, 219, 0.4)`

#### Soft Pink
- **Hex:** `#FFC0CB` (Pink)
- **RGB:** `rgb(255, 192, 203)`
- **Usage:** Gradient elements, notification badges, accents
- **Opacity Variants:**
  - 50%: `rgba(255, 192, 203, 0.5)`
  - 40%: `rgba(255, 192, 203, 0.4)`

### Neutral Colors

#### White
- **Hex:** `#FFFFFF`
- **RGB:** `rgb(255, 255, 255)`
- **Usage:** Glass backgrounds, text on dark, card backgrounds
- **Opacity Variants:**
  - 95%: `rgba(255, 255, 255, 0.95)` - Glass Strong
  - 80%: `rgba(255, 255, 255, 0.8)` - Glass Medium
  - 60%: `rgba(255, 255, 255, 0.6)` - Glass Light
  - 30%: `rgba(255, 255, 255, 0.3)` - Glass Subtle
  - 15%: `rgba(255, 255, 255, 0.15)` - Glass Very Subtle
  - 10%: `rgba(255, 255, 255, 0.1)` - Glass Minimal

#### Black
- **Hex:** `#000000`
- **RGB:** `rgb(0, 0, 0)`
- **Usage:** Modal overlays, shadows
- **Opacity Variants:**
  - 30%: `rgba(0, 0, 0, 0.3)` - Modal backdrop
  - 20%: `rgba(0, 0, 0, 0.2)` - Subtle shadows
  - 10%: `rgba(0, 0, 0, 0.1)` - Very subtle shadows

#### Gray Scale
- **Gray 900:** `#111827` - Not used (keeping for reference)
- **Gray 800:** `#1F2937` - Primary dark text
- **Gray 700:** `#374151` - Secondary text, icons
- **Gray 600:** `#4B5563` - Tertiary text, placeholders
- **Gray 500:** `#6B7280` - Disabled text
- **Gray 400:** `#9CA3AF` - Borders
- **Gray 300:** `#D1D5DB` - Light borders
- **Gray 200:** `#E5E7EB` - Backgrounds
- **Gray 100:** `#F3F4F6` - Light backgrounds
- **Gray 50:** `#F9FAFB` - Lightest backgrounds

### Gradient Definitions

#### Primary Button Gradient
```css
background: linear-gradient(to right, #FFD700, #9370DB);
/* from-yellow-300 to-purple-300 */
```
**Usage:** Primary CTA buttons (Send Prayer, Submit Prayer)

#### Rainbow Connection Gradient
```css
background: linear-gradient(90deg, 
  hsl(45, 100%, 70%) 0%,     /* Gold */
  hsl(200, 80%, 70%) 50%,    /* Sky Blue */
  hsl(270, 60%, 70%) 100%    /* Purple */
);
```
**Usage:** Prayer connection memorial lines

#### Ethereal Particle Gradient
```css
background: linear-gradient(90deg, 
  rgba(255, 215, 0, 0.4),    /* Gold */
  rgba(255, 192, 203, 0.4),  /* Pink */
  rgba(147, 112, 219, 0.4),  /* Purple */
  rgba(135, 206, 250, 0.4),  /* Sky Blue */
  rgba(255, 215, 0, 0.4)     /* Gold */
);
background-size: 300% 300%;
```
**Usage:** Animated border on selected reply type, floating particles

#### Spotlight Gradients
```css
/* Yellow Spotlight */
background: linear-gradient(to top, 
  rgba(255, 215, 0, 0.6),
  rgba(255, 215, 0, 0.4),
  transparent
);

/* Purple Spotlight */
background: linear-gradient(to top, 
  rgba(147, 112, 219, 0.6),
  rgba(147, 112, 219, 0.4),
  transparent
);
```
**Usage:** Prayer send animation spotlight effects

---

## Typography

### Font Families

#### Display Font: Cinzel
- **Type:** Serif
- **Import:** Google Fonts
- **CDN:** `https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap`
- **Usage:** Headers, titles, modal headings, brand elements
- **Weights Available:** 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)

#### Body Font: Inter
- **Type:** Sans-serif
- **Import:** Google Fonts
- **CDN:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap`
- **Usage:** Body text, UI elements, labels, descriptions
- **Weights Available:** 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)

### Text Styles

#### Display 1 - App Title
- **Font:** Cinzel
- **Weight:** 700 (Bold)
- **Size:** 48px
- **Line Height:** 1.2
- **Color:** Gray 800 (#374151)
- **Usage:** "PrayerMap" on loading screen

#### Display 2 - Tagline
- **Font:** Cinzel
- **Weight:** 400 (Regular)
- **Size:** 20px
- **Line Height:** 1.4
- **Letter Spacing:** 2px (0.125rem)
- **Color:** Gray 700 (#374151)
- **Usage:** "Prayer. Shared." on auth modal

#### H1 - Modal Titles
- **Font:** Cinzel
- **Weight:** 600 (Semi-Bold)
- **Size:** 24px
- **Line Height:** 1.3
- **Color:** Gray 800 (#1F2937)
- **Usage:** Modal headings (e.g., "Request Prayer", "Inbox")

#### H2 - Section Headers
- **Font:** Cinzel
- **Weight:** 600 (Semi-Bold)
- **Size:** 20px
- **Line Height:** 1.3
- **Color:** Gray 800 (#1F2937)
- **Usage:** Map header "PrayerMap"

#### H3 - Prayer Titles
- **Font:** Inter
- **Weight:** 600 (Semi-Bold)
- **Size:** 18px
- **Line Height:** 1.4
- **Color:** Gray 800 (#1F2937)
- **Usage:** Prayer card titles, user names in detail view

#### H4 - Card Titles
- **Font:** Inter
- **Weight:** 600 (Semi-Bold)
- **Size:** 16px
- **Line Height:** 1.4
- **Color:** Gray 800 (#1F2937)
- **Usage:** Prayer titles in list view

#### Body Large
- **Font:** Inter
- **Weight:** 400 (Regular)
- **Size:** 16px
- **Line Height:** 1.6
- **Color:** Gray 700 (#374151)
- **Usage:** Prayer content, main body text

#### Body Regular
- **Font:** Inter
- **Weight:** 400 (Regular)
- **Size:** 14px
- **Line Height:** 1.5
- **Color:** Gray 700 (#374151)
- **Usage:** Default body text, descriptions

#### Body Small
- **Font:** Inter
- **Weight:** 400 (Regular)
- **Size:** 12px
- **Line Height:** 1.5
- **Color:** Gray 600 (#4B5563)
- **Usage:** Meta information, timestamps, helper text

#### Label Medium
- **Font:** Inter
- **Weight:** 500 (Medium)
- **Size:** 14px
- **Line Height:** 1.4
- **Color:** Gray 700 (#374151)
- **Usage:** Form labels, button text

#### Label Small
- **Font:** Inter
- **Weight:** 500 (Medium)
- **Size:** 12px
- **Line Height:** 1.4
- **Color:** Gray 600 (#4B5563)
- **Usage:** Small labels, tags

#### Caption
- **Font:** Inter
- **Weight:** 400 (Regular)
- **Size:** 11px
- **Line Height:** 1.4
- **Color:** Gray 500 (#6B7280)
- **Usage:** Very small text, footnotes

#### Button Text Large
- **Font:** Inter
- **Weight:** 600 (Semi-Bold)
- **Size:** 16px
- **Line Height:** 1
- **Color:** Gray 800 (#1F2937)
- **Usage:** Primary action buttons

#### Button Text Regular
- **Font:** Inter
- **Weight:** 500 (Medium)
- **Size:** 14px
- **Line Height:** 1
- **Color:** Gray 700 (#374151)
- **Usage:** Secondary buttons, tabs

---

## Spacing System

### Base Unit: 4px

All spacing follows a 4px grid system (Tailwind default).

### Spacing Scale

| Token | Value | Pixels | Tailwind Class | Usage |
|-------|-------|--------|----------------|-------|
| xs | 0.25rem | 4px | `p-1`, `m-1`, `gap-1` | Tiny spacing |
| sm | 0.5rem | 8px | `p-2`, `m-2`, `gap-2` | Small spacing |
| md | 0.75rem | 12px | `p-3`, `m-3`, `gap-3` | Medium-small |
| base | 1rem | 16px | `p-4`, `m-4`, `gap-4` | Base spacing |
| lg | 1.25rem | 20px | `p-5`, `m-5`, `gap-5` | Large spacing |
| xl | 1.5rem | 24px | `p-6`, `m-6`, `gap-6` | Extra large |
| 2xl | 2rem | 32px | `p-8`, `m-8`, `gap-8` | 2x large |
| 3xl | 3rem | 48px | `p-12`, `m-12`, `gap-12` | 3x large |

### Common Spacing Patterns

#### Modal Padding
- **Default:** 24px (1.5rem) - `p-6`
- **Mobile:** 16px (1rem) - `p-4`

#### Card Padding
- **Default:** 16px (1rem) - `p-4`
- **Compact:** 12px (0.75rem) - `p-3`

#### Button Padding
- **Vertical:** 16px (1rem)
- **Horizontal:** 32px (2rem)
- **Class:** `px-8 py-4`

#### Section Gaps
- **Small:** 8px (0.5rem) - `gap-2`
- **Medium:** 12px (0.75rem) - `gap-3`
- **Large:** 16px (1rem) - `gap-4`

#### Screen Padding
- **Default:** 16px (1rem) - `p-4`
- **Desktop:** 24px (1.5rem) - `p-6`

---

## Border Radius

### Radius Scale

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| sm | 8px | `rounded-lg` | Small cards |
| md | 12px | `rounded-xl` | Default cards |
| lg | 16px | `rounded-2xl` | Large cards, modals |
| xl | 24px | `rounded-3xl` | Extra large modals |
| full | 9999px | `rounded-full` | Buttons, avatars, circles |

### Common Patterns
- **Modals:** `rounded-3xl` (24px)
- **Cards:** `rounded-xl` (12px)
- **Buttons:** `rounded-full` (9999px)
- **Inputs:** `rounded-xl` (12px)
- **Small Elements:** `rounded-lg` (8px)

---

## Effects & Shadows

### Glassmorphic Effect

#### Glass Strong
```css
.glass-strong {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}
```
**Usage:** Modals, primary cards, headers

#### Glass Medium
```css
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}
```
**Usage:** Secondary cards, input fields, buttons

#### Glass Subtle
```css
.glass-subtle {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
}
```
**Usage:** Hover states, preview bubbles

### Shadow Styles

#### Shadow Small
```css
box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
```
**Tailwind:** `shadow-sm`
**Usage:** Small cards, subtle elevation

#### Shadow Medium
```css
box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
```
**Tailwind:** `shadow-md`
**Usage:** Default cards, buttons

#### Shadow Large
```css
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
```
**Tailwind:** `shadow-lg`
**Usage:** Modals, primary cards

#### Shadow Extra Large
```css
box-shadow: 0 20px 60px 0 rgba(0, 0, 0, 0.15);
```
**Tailwind:** `shadow-xl`
**Usage:** Floating action buttons, important elements

#### Shadow 2XL
```css
box-shadow: 0 25px 80px 0 rgba(0, 0, 0, 0.2);
```
**Tailwind:** `shadow-2xl`
**Usage:** Hover states on primary buttons

---

## Animations & Transitions

### Timing Functions

#### Default Ease
```css
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```
**Tailwind:** `ease-in-out`
**Usage:** Default transitions

#### Ease Out
```css
transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
```
**Tailwind:** `ease-out`
**Usage:** Enter animations, expanding elements

#### Ease In
```css
transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
```
**Tailwind:** `ease-in`
**Usage:** Exit animations

#### Spring
```javascript
transition: { type: "spring", damping: 25, stiffness: 300 }
```
**Library:** Motion (Framer Motion)
**Usage:** Modal entrances, button interactions

### Duration Scale

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| Fast | 150ms | `duration-150` | Micro-interactions, hover |
| Normal | 200ms | `duration-200` | Default transitions |
| Medium | 300ms | `duration-300` | Modals, panels |
| Slow | 500ms | `duration-500` | Large animations |
| Very Slow | 1000ms | `duration-1000` | Special effects |

### Common Animations

#### Fade In/Out
```javascript
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.2 }}
```

#### Scale Pop
```javascript
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

#### Slide Up (Mobile Modal)
```javascript
initial={{ y: "100%", opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
exit={{ y: "100%", opacity: 0 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}
```

#### Pulse (Prayer Animation)
```javascript
animate={{ scale: [1, 1.2, 1] }}
transition={{ duration: 1, repeat: Infinity }}
```

#### Gradient Flow (Particle Border)
```javascript
animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
```

#### Spotlight Beam
```javascript
animate={{
  scaleY: [0, 1],
  opacity: [0, 1, 0]
}}
transition={{ duration: 2, ease: "easeOut" }}
```

---

## Icons

### Icon Library: Lucide React
**Package:** `lucide-react`
**Style:** Outline icons with rounded ends

### Icon Sizes

| Context | Size | Tailwind Class |
|---------|------|----------------|
| Small | 16px | `w-4 h-4` |
| Medium | 20px | `w-5 h-5` |
| Large | 24px | `w-6 h-6` |
| Extra Large | 32px | `w-8 h-8` |

### Icons Used

- **Inbox:** Inbox messages/prayers
- **Settings:** App settings
- **Send:** Send prayer/submit
- **X:** Close modals
- **Type:** Text input mode
- **Mic:** Audio recording mode
- **Video:** Video recording mode
- **Upload:** File upload
- **Plus:** Add new item
- **Trash2:** Delete item
- **Check:** Completion/success

### Emoji Icons

- **🙏** Prayer hands - Primary app icon, prayer markers
- **✨** Sparkles - Success state, magical moments
- **🎵** Music note - Audio prayer indicator
- **🎥** Video camera - Video prayer indicator

---

## Component States

### Interactive States

#### Default → Hover → Active → Disabled

**Button Example:**
- **Default:** Glass background, no scale
- **Hover:** Slight scale (1.05), shadow increase
- **Active:** Scale down (0.95)
- **Disabled:** Reduced opacity (0.5), no interaction

**Card Example:**
- **Default:** Glass background, standard shadow
- **Hover:** Glass subtle, shadow increase, cursor pointer
- **Active:** Selected state with border
- **Disabled:** Grayed out, opacity 0.6

### Loading States

#### Spinner
- Color: Gray 700
- Size: Medium (20px)
- Animation: Continuous rotation

#### Skeleton
- Background: Gray 200
- Animation: Pulse effect
- Used for: Content loading placeholders

#### Progress Indicators
- Style: Gradient bar (gold to purple)
- Height: 4px
- Animation: Smooth fill

---

## Responsive Breakpoints

Following Tailwind CSS defaults:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| sm | 640px | Small tablets |
| md | 768px | Tablets |
| lg | 1024px | Small desktops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large desktops |

### Mobile-First Approach
- Default styles target mobile (< 640px)
- Use `sm:`, `md:`, `lg:` prefixes for larger screens
- Modals: Bottom-anchored on mobile, centered on desktop
