'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  assignment_id?: string;
  submission_id?: string;
  classroom_id?: string;
  action_url?: string;
  is_read: boolean;
  priority: string;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH'
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'assignment_created': '📝',
      'assignment_due_soon': '⏰',
      'assignment_graded': '✅',
      'submission_received': '📬',
      'new_message': '💬',
      'course_update': '📚'
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return '#dc2626';
    if (priority === 'high') return '#ea580c';

    const colors: Record<string, string> = {
      'assignment_created': '#2b8cee',
      'assignment_due_soon': '#ea580c',
      'assignment_graded': '#16a34a',
      'submission_received': '#7c3aed',
      'new_message': '#db2777',
      'course_update': '#0891b2'
    };
    return colors[type] || '#6b7280';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: isOpen ? '#f3f4f6' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.2s'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: unreadCount > 9 ? '20px' : '18px',
            height: '18px',
            borderRadius: '9px',
            backgroundColor: '#dc2626',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '52px',
          right: '0',
          width: '400px',
          maxHeight: '600px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111418'
            }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#617589'
                }}>
                  ({unreadCount})
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#2b8cee',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '500px'
          }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ color: '#617589' }}>Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                <p style={{ color: '#617589', marginBottom: '8px' }}>Aucune notification</p>
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>Vous êtes à jour !</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const icon = getNotificationIcon(notification.type);
                  const color = getNotificationColor(notification.type, notification.priority);

                  const content = (
                    <div
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: notification.is_read ? 'transparent' : '#f9fafb',
                        cursor: notification.action_url ? 'pointer' : 'default',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                      onMouseEnter={(e) => {
                        if (notification.action_url) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = notification.is_read ? 'transparent' : '#f9fafb';
                      }}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: `${color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0
                      }}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: notification.is_read ? '500' : '600',
                            color: '#111418'
                          }}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '4px',
                              backgroundColor: color,
                              flexShrink: 0,
                              marginLeft: '8px',
                              marginTop: '4px'
                            }} />
                          )}
                        </div>
                        <p style={{
                          fontSize: '13px',
                          color: '#617589',
                          marginBottom: '4px',
                          lineHeight: '1.4'
                        }}>
                          {notification.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#9ca3af'
                          }}>
                            {formatTime(notification.created_at)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              deleteNotification(notification.id);
                            }}
                            style={{
                              fontSize: '12px',
                              color: '#9ca3af',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              padding: '4px 8px'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );

                  return notification.action_url ? (
                    <Link
                      key={notification.id}
                      href={notification.action_url}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={notification.id}>
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #f3f4f6',
              textAlign: 'center'
            }}>
              <Link
                href="/notifications"
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2b8cee',
                  textDecoration: 'none'
                }}
                onClick={() => setIsOpen(false)}
              >
                Voir toutes les notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
