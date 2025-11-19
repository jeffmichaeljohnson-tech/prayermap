import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useGeolocation } from './hooks/useGeolocation'
import { usePrayersNearby } from './hooks/usePrayers'
import { useQueryClient } from '@tanstack/react-query'
import Map from './components/map/Map'
import { AuthModal } from './components/auth/AuthModal'
import { PrayerDetailModal } from './components/prayers/PrayerDetailModal'
import { CreatePrayerModal } from './components/prayers/CreatePrayerModal'
import { FloatingButton } from './components/layout/FloatingButton'
import { sendPrayerSupport, checkIfSupported } from './lib/api/prayers'

/**
 * Main App Component
 * 
 * NEW UX FLOW: Map-first, auth overlay
 * - Map loads immediately (no auth required)
 * - Prayers visible to anonymous users
 * - Auth modal appears as overlay (not blocking)
 * - User can see map and prayers through glassmorphic modal
 * - Auth only required for creating/supporting prayers
 */
function App() {
  const [selectedPrayerId, setSelectedPrayerId] = useState<number | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreatePrayerModal, setShowCreatePrayerModal] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [authModalDismissed, setAuthModalDismissed] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const { position: userLocation } = useGeolocation()
  const queryClient = useQueryClient()

  // Debug logging
  useEffect(() => {
    console.log('[App] Auth loading:', authLoading, 'User:', user?.email || 'no user')
    console.log('[App] showAuthModal:', showAuthModal, 'authModalDismissed:', authModalDismissed)
  }, [authLoading, user, showAuthModal, authModalDismissed])

  // Show auth modal on first load if not authenticated (unless dismissed)
  useEffect(() => {
    console.log('[App] useEffect check - authLoading:', authLoading, 'user:', !!user, 'dismissed:', authModalDismissed)
    if (!authLoading && !user && !authModalDismissed) {
      console.log('[App] Setting showAuthModal to true IMMEDIATELY')
      // Show immediately - no delay needed
      setShowAuthModal(true)
    } else {
      console.log('[App] Not showing auth modal - conditions not met')
    }
  }, [authLoading, user, authModalDismissed])

  // Fetch prayers nearby - NO AUTH REQUIRED
  const {
    data: prayers = [],
    error: prayersError,
  } = usePrayersNearby(
    userLocation
      ? {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          radiusKm: 30,
        }
      : null,
    {
      enabled: !!userLocation,
    }
  )

  // Check if selected prayer is supported (only if authenticated)
  useEffect(() => {
    if (!selectedPrayerId || !user) {
      setIsSupported(false)
      return
    }

    checkIfSupported(selectedPrayerId, user.id)
      .then(setIsSupported)
      .catch(() => setIsSupported(false))
  }, [selectedPrayerId, user])

  // Get selected prayer data
  const selectedPrayer = prayers.find(
    (p) => p.prayer_id === selectedPrayerId
  ) || null

  // Handle prayer marker click - NO AUTH REQUIRED
  const handlePrayerClick = (prayerId: number | string) => {
    setSelectedPrayerId(Number(prayerId))
  }

  const handlePrayerSupport = async (prayerId: number) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    try {
      await sendPrayerSupport(prayerId)
      setIsSupported(true)
      queryClient.invalidateQueries({ queryKey: ['prayers'] })
    } catch (error) {
      console.error('Error sending prayer support:', error)
    }
  }

  const handleRequestPrayerClick = () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowCreatePrayerModal(true)
  }

  const handlePrayerCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['prayers'] })
  }

  const handleAuthModalClose = () => {
    setShowAuthModal(false)
    setAuthModalDismissed(true)
  }

  // Show brief loading state while auth initializes (but don't block map)
  if (authLoading) {
    console.log('[App] RENDERING: Loading screen')
    return (
      <div className="flex items-center justify-center min-h-screen bg-heavenly-blue">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🙏</div>
          <p className="text-gray-600 font-body">Loading PrayerMap...</p>
        </div>
      </div>
    )
  }

  console.log('[App] RENDERING: Main app - authLoading:', authLoading, 'user:', !!user, 'showAuthModal:', showAuthModal)

  // Prepare prayer markers: extract lat/lng from location data
  const prayerMarkers = prayers.map((prayer) => {
    let lat = 0
    let lng = 0

    if ((prayer as any).location && typeof (prayer as any).location === 'string') {
      const match = (prayer as any).location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
      if (match) {
        lng = parseFloat(match[1])
        lat = parseFloat(match[2])
      }
    } else if ((prayer as any).latitude && (prayer as any).longitude) {
      lat = (prayer as any).latitude
      lng = (prayer as any).longitude
    } else if (userLocation) {
      lat = userLocation.latitude
      lng = userLocation.longitude
    }

    return {
      prayerId: prayer.prayer_id,
      longitude: lng,
      latitude: lat,
      title: prayer.title || undefined,
      distance: prayer.distance_km,
    }
  })

  console.log('[App] RENDERING: Returning main app JSX')
  console.log('[App] Current state - user:', !!user, 'showAuthModal:', showAuthModal, 'authLoading:', authLoading)
  
  // Ensure AuthModal shows when no user (force it if needed)
  const shouldShowAuth = !user && !authModalDismissed && !authLoading
  
  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#E8F4F8', minHeight: '100vh' }}>
      {/* Debug info - remove after fixing */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          fontSize: '10px',
          fontFamily: 'monospace'
        }}>
          <div>Auth: {authLoading ? 'loading' : user ? 'yes' : 'no'}</div>
          <div>Modal: {showAuthModal || shouldShowAuth ? 'show' : 'hide'}</div>
          <div>Dismissed: {authModalDismissed ? 'yes' : 'no'}</div>
        </div>
      )}
      
      {/* Map Component - ALWAYS VISIBLE */}
      <Map
        prayers={prayerMarkers}
        onPrayerClick={handlePrayerClick}
        showUserLocation={!!user} // Only show user location if authenticated
        className="w-full h-full"
      />

      {/* Floating "+" Button - Always visible, triggers auth if needed */}
      <FloatingButton onClick={handleRequestPrayerClick} />

      {/* Auth Modal - OVERLAY (not blocking) - Force show if no user */}
      <AuthModal
        isOpen={showAuthModal || shouldShowAuth}
        onClose={handleAuthModalClose}
        defaultMode="signin"
        showSkipOption={true}
      />

      {/* Create Prayer Modal */}
      <CreatePrayerModal
        isOpen={showCreatePrayerModal}
        onClose={() => setShowCreatePrayerModal(false)}
        onSuccess={handlePrayerCreated}
      />

      {/* Prayer Detail Modal - NO AUTH REQUIRED TO VIEW */}
      <PrayerDetailModal
        prayer={selectedPrayer}
        isOpen={!!selectedPrayer}
        onClose={() => setSelectedPrayerId(null)}
        onSupport={handlePrayerSupport}
        isSupported={isSupported}
      />

      {/* Error State (if prayers fail to load) */}
      {prayersError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg shadow-lg">
          <p className="font-semibold">Error loading prayers</p>
          <p className="text-sm">
            {prayersError instanceof Error
              ? prayersError.message
              : 'Failed to load prayers. Please refresh the page.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default App
