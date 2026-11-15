'use client';

import { useState, useEffect } from 'react';

interface HomeworkFileDisplayProps {
  filePath: string;
  showRemove?: boolean;
  onRemove?: () => void;
}

export default function HomeworkFileDisplay({
  filePath,
  showRemove = false,
  onRemove
}: HomeworkFileDisplayProps) {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    generateSignedUrl();
  }, [filePath]);

  const generateSignedUrl = async () => {
    // If it's already a full URL (old data), use it directly
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      setSignedUrl(filePath);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, bucket: 'homework-files' })
      });

      if (!response.ok) {
        throw new Error('Failed to generate signed URL');
      }

      const data = await response.json();
      setSignedUrl(data.signedUrl);
    } catch (err: any) {
      console.error('Signed URL error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['zip', 'rar'].includes(ext || '')) return '📦';
    return '📎';
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || 'Fichier';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <span style={{ fontSize: '24px' }}>⏳</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#617589' }}>
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fca5a5'
      }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#dc2626' }}>
            Erreur de chargement
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <span style={{ fontSize: '24px' }}>{getFileIcon(filePath)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '13px',
          fontWeight: '500',
          color: '#111418',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {getFileName(filePath)}
        </p>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '11px',
            color: '#2b8cee',
            textDecoration: 'none'
          }}
        >
          Voir le fichier
        </a>
      </div>
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: '6px 12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Supprimer
        </button>
      )}
    </div>
  );
}
