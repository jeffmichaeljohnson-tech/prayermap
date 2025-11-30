/**
 * Waveform Visualization Component
 * Real-time audio waveform display with ethereal glass styling
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface WaveformVisualizationProps {
  /** Audio data array (0-1 normalized values) */
  audioData: number[];
  /** Whether audio is currently playing/recording */
  isActive: boolean;
  /** Width of the visualization */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Color scheme */
  variant?: 'prayer' | 'voice' | 'music';
  /** Whether to show real-time animation */
  animated?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Current playback position (0-1) for playback visualization */
  progress?: number;
}

export function WaveformVisualization({
  audioData,
  isActive,
  width = 200,
  height = 40,
  variant = 'voice',
  animated = true,
  className,
  progress = 0
}: WaveformVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Color schemes for different variants
  const colorSchemes = {
    prayer: {
      active: 'rgba(168, 85, 247, 0.8)', // Purple
      inactive: 'rgba(168, 85, 247, 0.3)',
      progress: 'rgba(251, 191, 36, 0.9)', // Amber
      background: 'rgba(255, 255, 255, 0.1)'
    },
    voice: {
      active: 'rgba(59, 130, 246, 0.8)', // Blue
      inactive: 'rgba(59, 130, 246, 0.3)',
      progress: 'rgba(34, 197, 94, 0.9)', // Green
      background: 'rgba(255, 255, 255, 0.1)'
    },
    music: {
      active: 'rgba(236, 72, 153, 0.8)', // Pink
      inactive: 'rgba(236, 72, 153, 0.3)',
      progress: 'rgba(251, 191, 36, 0.9)', // Amber
      background: 'rgba(255, 255, 255, 0.1)'
    }
  };

  const colors = colorSchemes[variant];

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with ethereal background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    if (audioData.length === 0) {
      // Show placeholder bars when no data
      drawPlaceholderBars(ctx);
      return;
    }

    // Calculate bar properties
    const barCount = Math.min(audioData.length, Math.floor(width / 3));
    const barWidth = Math.max(1, Math.floor(width / barCount) - 1);
    const barSpacing = 1;

    // Draw waveform bars
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * audioData.length);
      const amplitude = audioData[dataIndex] || 0;
      
      // Calculate bar height (minimum 2px for visibility)
      const barHeight = Math.max(2, amplitude * height * 0.8);
      const x = i * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;

      // Determine color based on progress and state
      let color = colors.inactive;
      
      if (progress > 0) {
        // Playback mode - show progress
        const progressPosition = progress * barCount;
        color = i < progressPosition ? colors.progress : colors.inactive;
      } else if (isActive) {
        // Recording mode - show active state
        color = colors.active;
      }

      // Add glow effect for active bars
      if ((progress > 0 && i < progress * barCount) || (isActive && progress === 0)) {
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }

      // Draw rounded rectangle bar
      ctx.fillStyle = color;
      drawRoundedRect(ctx, x, y, barWidth, barHeight, 1);
    }
  };

  const drawPlaceholderBars = (ctx: CanvasRenderingContext2D) => {
    const barCount = Math.floor(width / 3);
    const barWidth = 2;
    const barSpacing = 1;

    for (let i = 0; i < barCount; i++) {
      // Create subtle random heights for placeholder
      const barHeight = 2 + Math.sin(i * 0.5) * 2;
      const x = i * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = colors.inactive;
      drawRoundedRect(ctx, x, y, barWidth, barHeight, 1);
    }
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    if (height < 2 * radius) radius = height / 2;
    if (width < 2 * radius) radius = width / 2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
  };

  // Animation loop for real-time updates
  useEffect(() => {
    if (animated) {
      const animate = () => {
        drawWaveform();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      drawWaveform();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioData, isActive, progress, width, height, variant, animated]);

  return (
    <div className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        className="rounded-md"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          filter: isActive ? 'brightness(1.1)' : 'brightness(0.9)'
        }}
      />
      
      {/* Ethereal glow effect overlay */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-md opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse, ${colors.active} 0%, transparent 70%)`,
            filter: 'blur(1px)'
          }}
          animate={{
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
    </div>
  );
}