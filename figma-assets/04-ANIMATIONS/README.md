# Animation Exports

All animations exported as Lottie JSON files.

## Folders
- `/loading/` - Loading screen animations
- `/auth/` - Authentication flow animations
- `/prayer-animation/` - Prayer send sequence animations
- `/modals/` - Modal transitions (if Lottie)
- `/micro-interactions/` - Small UI animations
- `/previews/` - MP4/GIF previews for documentation

## Naming Convention
`[animation-name].json`

Example: `loading-pulse.json`

## Implementation
```javascript
// React Native
import LottieView from 'lottie-react-native';
<LottieView source={require('./loading-pulse.json')} autoPlay loop />

// Web
import { Player } from '@lottiefiles/react-lottie-player';
<Player src="/animations/loading-pulse.json" autoplay loop />
```
