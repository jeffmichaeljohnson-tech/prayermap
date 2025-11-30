/**
 * Moderation Route Configuration
 */

import { lazy } from 'react';

const ModerationPage = lazy(() => import('@/pages/ModerationPage'));

export const moderationRoute = {
  path: '/moderation',
  element: <ModerationPage />
};
