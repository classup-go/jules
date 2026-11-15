'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VideoUploadProps {
  onUpload: (storagePath: string, metadata: { duration: number; size: number }) => void;
  maxSize?: number; // in MB, default 500MB
}

export default function VideoUpload({ onUpload, maxSize = 500 }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error('Impossible de lire la durée de la vidéo'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError('');
    setProgress(0);
    setUploadedPath(null);

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`La vidéo dépasse la limite de ${maxSize}MB`);
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        setUploading(false);
        return;
      }

      // Get video duration
      const duration = await getVideoDuration(file);

      // Generate storage path
      const ext = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      // Simulate progress (Supabase doesn't provide real-time upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Upload to videos-private bucket
      const { data, error: uploadError } = await supabase.storage
        .from('videos-private')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw new Error(uploadError.message || 'Erreur lors du téléchargement');
      }

      setProgress(100);

      // Call callback with storage path and metadata
      onUpload(data.path, {
        duration: Math.floor(duration),
        size: file.size
      });

      setUploadedPath(data.path);

      // Reset uploading state after a brief delay
      setTimeout(() => {
        setUploading(false);
      }, 500);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erreur lors du téléchargement');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleChangeFile = () => {
    setFileName('');
    setUploadedPath(null);
    setProgress(0);
    inputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      {!uploading && !uploadedPath ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%',
            border: '2px dashed #dbe0e6',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2b8cee';
            e.currentTarget.style.backgroundColor = '#f0f7ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#dbe0e6';
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎥</div>
          <p style={{ color: '#2b8cee', fontWeight: '600', marginBottom: '4px' }}>
            Télécharger une vidéo
          </p>
          <p style={{ fontSize: '13px', color: '#617589' }}>
            MP4, MOV, AVI • Max {maxSize}MB
          </p>
        </button>
      ) : uploading ? (
        <div style={{
          width: '100%',
          border: '2px solid #2b8cee',
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: '#f0f7ff'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '32px' }}>🎥</div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111418',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {fileName}
              </p>
              <p style={{ fontSize: '13px', color: '#617589' }}>
                Téléchargement en cours...
              </p>
            </div>
          </div>

          <div style={{
            height: '8px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#2b8cee',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
                width: `${progress}%`
              }}
            />
          </div>

          <p style={{
            fontSize: '13px',
            color: '#617589',
            textAlign: 'center'
          }}>
            {progress}% téléchargé
          </p>
        </div>
      ) : (
        <div style={{
          width: '100%',
          border: '2px solid #16a34a',
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#16a34a',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {fileName}
            </p>
            <p style={{ fontSize: '13px', color: '#15803d' }}>
              Vidéo téléchargée avec succès
            </p>
          </div>
          <button
            type="button"
            onClick={handleChangeFile}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '1px solid #16a34a',
              borderRadius: '8px',
              color: '#16a34a',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Changer
          </button>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>
            ⚠️ {error}
          </p>
        </div>
      )}
    </div>
  );
}
