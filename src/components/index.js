/**
 * Shared, presentational components. Nothing in src/components reads storage
 * or calls a service: data comes in through props, events go out through
 * callbacks. Components that need data belong in a feature.
 */

// Pixel-art primitives, drawn from grids - no image assets.
export { default as PixelSprite } from './pixel/PixelSprite';
export { default as PixelIcon } from './pixel/PixelIcon';
export { default as PetSprite, petSpriteHeight, tallestPetSpriteHeight } from './pixel/PetSprite';

// Building blocks for screens.
export { PixelPanel } from './ui/PixelPanel';
export { BackButton } from './ui/BackButton';
export { PixelButton } from './ui/PixelButton';
export { Pill } from './ui/Pill';
export { EmptyState } from './ui/EmptyState';
export { ProgressBar } from './ui/ProgressBar';

// Things that float above a screen.
export { AlertProvider, useAlert } from './overlays/PixelAlert';
export { default as PaywallModal } from './overlays/PaywallModal';
export { default as StreakCelebration } from './overlays/StreakCelebration';
