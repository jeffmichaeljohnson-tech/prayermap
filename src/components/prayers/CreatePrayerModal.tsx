import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useCreatePrayer } from '../../hooks/useCreatePrayer'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useToast } from '../ui/useToast'
import { ToastContainer } from '../ui/Toast'
import { MIN_PRAYER_LENGTH, MAX_PRAYER_LENGTH, MAX_PRAYER_TITLE_LENGTH } from '../../lib/constants'
import { PrayerApiError } from '../../lib/api/prayers'

export interface CreatePrayerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const modalStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
}

const textStyle = { fontFamily: "'Inter', sans-serif" }
const headingStyle = { fontFamily: "'Cinzel', serif", color: '#2C3E50' }
const mutedStyle = { ...textStyle, color: '#7F8C8D' }
const inputStyle = { ...textStyle, background: '#E8F4F8', borderColor: 'rgba(0, 0, 0, 0.1)' }

/**
 * CreatePrayerModal - Form for creating new prayer requests
 * Phase 1 MVP: TEXT ONLY (min 10 chars, max 1000 chars)
 */
export function CreatePrayerModal({ isOpen, onClose, onSuccess }: CreatePrayerModalProps) {
  const [title, setTitle] = useState('')
  const [textBody, setTextBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  const { position, loading: locationLoading, error: locationError, refresh: refreshLocation } = useGeolocation()
  const { mutate: createPrayer, isPending: isSubmitting } = useCreatePrayer()
  const { toasts, showToast, removeToast } = useToast()

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setTextBody('')
      setIsAnonymous(false)
    } else {
      refreshLocation()
    }
  }, [isOpen, refreshLocation])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedTextBody = textBody.trim()

    if (trimmedTextBody.length < MIN_PRAYER_LENGTH) {
      showToast(`Please add more detail (at least ${MIN_PRAYER_LENGTH} characters)`, 'error')
      return
    }
    if (trimmedTextBody.length > MAX_PRAYER_LENGTH) {
      showToast(`Please keep your prayer under ${MAX_PRAYER_LENGTH} characters`, 'error')
      return
    }
    if (!position) {
      showToast(locationLoading ? 'Please wait while we get your location...' : 'Location is required. Please enable location access and try again.', locationLoading ? 'info' : 'error')
      return
    }

    createPrayer(
      {
        title: title.trim() || null,
        text_body: trimmedTextBody,
        is_anonymous: isAnonymous,
        latitude: position.latitude,
        longitude: position.longitude,
        city_region: null,
      },
      {
        onSuccess: () => {
          showToast('🙏 Your prayer has been posted!', 'success', 4000)
          setTitle('')
          setTextBody('')
          setIsAnonymous(false)
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 500)
        },
        onError: (error) => {
          const message = error instanceof PrayerApiError ? error.message : error instanceof Error ? error.message : 'Failed to post prayer. Please try again.'
          showToast(message || 'Failed to post prayer', 'error')
        },
      }
    )
  }

  if (!isOpen) return null

  const charCount = textBody.length
  const isTextValid = textBody.trim().length >= MIN_PRAYER_LENGTH && textBody.trim().length <= MAX_PRAYER_LENGTH
  const canSubmit = isTextValid && position && !locationLoading && !isSubmitting

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-4" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 md:relative md:inset-auto z-50 glass-card rounded-t-3xl md:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-display font-bold" style={headingStyle}>Request Prayer</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100" aria-label="Close modal">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold mb-2" style={mutedStyle}>Title (optional)</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => e.target.value.length <= MAX_PRAYER_TITLE_LENGTH && setTitle(e.target.value)}
              placeholder="e.g., Healing for my mother"
              maxLength={MAX_PRAYER_TITLE_LENGTH}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-prayer-purple focus:border-transparent transition-all"
              style={inputStyle}
            />
            {title.length > 0 && <p className="text-xs mt-1" style={{ ...textStyle, color: '#95A5A6' }}>{title.length}/{MAX_PRAYER_TITLE_LENGTH} characters</p>}
          </div>

          <div>
            <label htmlFor="textBody" className="block text-sm font-semibold mb-2" style={mutedStyle}>Share what's on your heart <span className="text-red-500">*</span></label>
            <textarea
              id="textBody"
              value={textBody}
              onChange={(e) => e.target.value.length <= MAX_PRAYER_LENGTH && setTextBody(e.target.value)}
              placeholder="Please pray for..."
              rows={6}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-prayer-purple focus:border-transparent resize-none transition-all"
              style={inputStyle}
            />
            <p className={`text-xs mt-2 ${charCount < MIN_PRAYER_LENGTH || charCount > MAX_PRAYER_LENGTH ? 'text-red-500' : 'text-gray-500'}`} style={textStyle}>
              {charCount < MIN_PRAYER_LENGTH ? `At least ${MIN_PRAYER_LENGTH} characters needed` : `${charCount}/${MAX_PRAYER_LENGTH} characters`}
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(212, 197, 249, 0.1)' }}>
            <input type="checkbox" id="anonymous" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="mt-1 w-5 h-5 rounded border-gray-300 text-prayer-purple focus:ring-prayer-purple focus:ring-2" style={{ accentColor: '#D4C5F9' }} />
            <div className="flex-1">
              <label htmlFor="anonymous" className="block text-sm font-semibold cursor-pointer" style={{ ...textStyle, color: '#2C3E50' }}>Post Anonymously</label>
              <p className="text-xs mt-1" style={{ ...textStyle, color: '#95A5A6' }}>Your name won't be shown</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: '#E8F4F8' }}>
            <MapPinIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#7F8C8D' }} />
            <div className="flex-1 min-w-0">
              {locationLoading ? (
                <p className="text-sm" style={mutedStyle}>Getting your location...</p>
              ) : position ? (
                <div>
                  <p className="text-sm font-medium" style={{ ...textStyle, color: '#2C3E50' }}>Location found</p>
                  <p className="text-xs" style={{ ...textStyle, color: '#95A5A6' }}>(approximate area only)</p>
                </div>
              ) : locationError ? (
                <div>
                  <p className="text-sm text-red-600 font-medium" style={textStyle}>Location unavailable</p>
                  <p className="text-xs text-red-500 mt-1" style={textStyle}>{locationError.message || 'Unable to get your location'}</p>
                  <button type="button" onClick={refreshLocation} className="text-xs text-prayer-purple hover:underline mt-1" style={textStyle}>Try again</button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border border-gray-300 font-semibold transition-all hover:bg-gray-50" style={mutedStyle}>Cancel</button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ ...textStyle, background: 'linear-gradient(135deg, #D4C5F9 0%, #9B59B6 100%)' }}
            >
              {isSubmitting ? 'Posting...' : 'Post Prayer'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
