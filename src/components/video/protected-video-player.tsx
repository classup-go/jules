'use client';

import { useState, useRef, useEffect } from 'react';

interface ProtectedVideoPlayerProps {
  lessonId: string;
  onProgress?: (progress: number) => void;
}

interface VideoStreamData {
  videoUrl: string;
  token: string;
  expiresAt: string;
  watermark: {
    text: string;
    position: string;
  };
  lessonId: string;
  lessonTitle: string;
}

export default function ProtectedVideoPlayer({
  lessonId,
  onProgress
}: ProtectedVideoPlayerProps) {
  const [videoData, setVideoData] = useState<VideoStreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyticsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastAnalyticsUpdate, setLastAnalyticsUpdate] = useState(0);

  // Fetch video URL on mount
  useEffect(() => {
    fetchVideoUrl();

    // Cleanup on unmount
    return () => {
      if (analyticsIntervalRef.current) {
        clearInterval(analyticsIntervalRef.current);
      }
    };
  }, [lessonId]);

  // Start analytics tracking when video is loaded
  useEffect(() => {
    if (videoData && videoRef.current) {
      startAnalyticsTracking();

      // Load saved position from analytics
      loadSavedPosition();
    }

    return () => {
      if (analyticsIntervalRef.current) {
        clearInterval(analyticsIntervalRef.current);
      }
    };
  }, [videoData]);

  const fetchVideoUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/video/stream/${lessonId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec du chargement de la vidéo');
      }

      const data: VideoStreamData = await response.json();
      setVideoData(data);
    } catch (err: any) {
      console.error('Video fetch error:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedPosition = async () => {
    try {
      const response = await fetch(`/api/video/analytics?lessonId=${lessonId}`);

      if (response.ok) {
        const data = await response.json();
        const savedPosition = data.analytics?.last_position;

        if (savedPosition && savedPosition > 5 && videoRef.current) {
          videoRef.current.currentTime = savedPosition;
        }
      }
    } catch (err) {
      console.error('Failed to load saved position:', err);
    }
  };

  const startAnalyticsTracking = () => {
    // Send analytics every 10 seconds
    analyticsIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.paused) return;

      const currentTime = video.currentTime;
      const duration = video.duration;

      // Avoid sending duplicate analytics too quickly
      if (currentTime - lastAnalyticsUpdate < 5) {
        return;
      }

      // Consider video completed if watched 90% or more
      const watchPercentage = (currentTime / duration) * 100;
      const completed = watchPercentage >= 90;

      try {
        await fetch('/api/video/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            watchDuration: Math.floor(currentTime),
            lastPosition: Math.floor(currentTime),
            completed
          })
        });

        setLastAnalyticsUpdate(currentTime);

        // Notify parent component of progress
        if (onProgress && duration > 0) {
          onProgress(watchPercentage);
        }
      } catch (err) {
        console.error('Analytics update failed:', err);
      }
    }, 10000); // Every 10 seconds
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Disable right-click
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !onProgress) return;

    const currentTime = video.currentTime;
    const duration = video.duration;

    if (duration > 0) {
      const percentage = (currentTime / duration) * 100;
      onProgress(percentage);
    }
  };

  // Prevent screenshots and screen recording (basic protection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert('Les captures d\'écran sont désactivées pour cette vidéo');
      }

      // Prevent common screen recording shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        alert('L\'enregistrement d\'écran est désactivé');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#f3f4f6',
        borderRadius: '12px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#2b8cee',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#617589', fontSize: '14px' }}>Chargement de la vidéo...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#fef2f2',
        borderRadius: '12px',
        flexDirection: 'column',
        gap: '16px',
        padding: '32px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '8px'
        }}>
          🚫
        </div>
        <p style={{
          color: '#dc2626',
          fontWeight: '600',
          fontSize: '16px',
          marginBottom: '8px'
        }}>
          {error}
        </p>
        <button
          onClick={fetchVideoUrl}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2b8cee',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!videoData) {
    return null;
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#000'
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={videoData.videoUrl}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block'
        }}
        onError={(e) => {
          console.error('Video playback error:', e);
          setError('Erreur de lecture de la vidéo. Veuillez réessayer.');
        }}
      />

      {/* Watermark Overlay */}
      {videoData.watermark && (
        <div
          style={{
            position: 'absolute',
            top: videoData.watermark.position.includes('top') ? '16px' : 'auto',
            bottom: videoData.watermark.position.includes('bottom') ? '60px' : 'auto',
            left: videoData.watermark.position.includes('left') ? '16px' : 'auto',
            right: videoData.watermark.position.includes('right') ? '16px' : 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 10
          }}
        >
          {videoData.watermark.text}
        </div>
      )}

      {/* Prevent Selection Overlay (invisible) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />

      {/* CSS to prevent screenshots and downloads */}
      <style jsx>{`
        video {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        video::-webkit-media-controls-download-button {
          display: none !important;
        }
        video::-webkit-media-controls-enclosure {
          overflow: hidden;
        }
        video::-internal-media-controls-download-button {
          display: none;
        }
      `}</style>
    </div>
  );
}
