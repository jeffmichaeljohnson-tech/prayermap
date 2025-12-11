import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatDuration } from '@/lib/mediaUpload';

interface VideoPlayerProps {
  uri: string;
  duration?: number | null;
  compact?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function VideoPlayer({ uri, duration, compact = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, player]);

  const toggleControls = useCallback(() => {
    setShowControls(!showControls);
  }, [showControls]);

  // Handle playback status updates
  React.useEffect(() => {
    const subscription = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });

    const timeSubscription = player.addListener('timeUpdate', (time) => {
      setCurrentTime(time.currentTime);
    });

    return () => {
      subscription.remove();
      timeSubscription.remove();
    };
  }, [player]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Pressable onPress={togglePlayback} style={styles.compactPlayer}>
          <VideoView
            player={player}
            style={styles.compactVideo}
            nativeControls={false}
          />
          {!isPlaying && (
            <View style={styles.compactPlayOverlay}>
              <FontAwesome name="play" size={24} color="#fff" />
            </View>
          )}
        </Pressable>
        {duration && (
          <Text style={styles.compactDuration}>{formatDuration(duration)}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleControls} style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
        />

        {/* Controls Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            <Pressable onPress={togglePlayback} style={styles.playButton}>
              <FontAwesome
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#fff"
              />
            </Pressable>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: duration
                      ? `${(currentTime / duration) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>

            {/* Time Display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatDuration(currentTime)}
                {duration && ` / ${formatDuration(duration)}`}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },
  timeContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  compactPlayer: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  compactVideo: {
    width: '100%',
    height: '100%',
  },
  compactPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDuration: {
    fontSize: 14,
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
});

export default VideoPlayer;
