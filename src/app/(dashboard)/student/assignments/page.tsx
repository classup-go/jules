'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  status: string;
  submissions: any[];
}

export default function StudentAssignmentsPage() {
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroom');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'todo', 'submitted', 'graded'

  useEffect(() => {
    fetchAssignments();
  }, [classroomId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Build URL with optional classroomId parameter
      const url = classroomId
        ? `/api/assignments?classroomId=${classroomId}`
        : `/api/assignments`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMySubmission = (assignment: Assignment) => {
    return assignment.submissions && assignment.submissions.length > 0
      ? assignment.submissions[0]
      : null;
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const submission = getMySubmission(assignment);
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const isPastDue = now > dueDate;

    if (submission) {
      if (submission.status === 'graded') {
        return {
          label: `${submission.grade}/${assignment.max_points}`,
          color: submission.passed ? '#16a34a' : '#dc2626',
          bg: submission.passed ? '#d1fae5' : '#fee2e2',
          icon: submission.passed ? '✅' : '❌'
        };
      }
      return {
        label: 'Soumis',
        color: '#2b8cee',
        bg: '#dbeafe',
        icon: '📤'
      };
    }

    if (isPastDue) {
      return {
        label: 'En retard',
        color: '#dc2626',
        bg: '#fee2e2',
        icon: '⚠️'
      };
    }

    return {
      label: 'À faire',
      color: '#ea580c',
      bg: '#fed7aa',
      icon: '⏳'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isPast = date < now;

    const formatted = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    return { formatted, isPast };
  };

  const getTimeRemaining = (dateString: string) => {
    const due = new Date(dateString);
    const now = new Date();
    const diff = due.getTime() - now.getTime();

    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
    return 'Moins d\'1h';
  };

  const filteredAssignments = assignments.filter(assignment => {
    const submission = getMySubmission(assignment);
    const status = getAssignmentStatus(assignment);

    if (filter === 'todo') return !submission && status.label === 'À faire';
    if (filter === 'submitted') return submission && submission.status === 'submitted';
    if (filter === 'graded') return submission && submission.status === 'graded';
    return true;
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px'
      }}>
        <p style={{ color: '#617589' }}>Chargement des devoirs...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#111418',
          marginBottom: '8px'
        }}>
          Mes devoirs
        </h1>
        <p style={{ color: '#617589', fontSize: '14px' }}>
          Consultez et soumettez vos devoirs
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '8px',
        borderRadius: '12px',
        border: '1px solid #dbe0e6'
      }}>
        {[
          { key: 'all', label: 'Tous', count: assignments.length },
          { key: 'todo', label: 'À faire', count: assignments.filter(a => !getMySubmission(a) && new Date(a.due_date) > new Date()).length },
          { key: 'submitted', label: 'Soumis', count: assignments.filter(a => getMySubmission(a)?.status === 'submitted').length },
          { key: 'graded', label: 'Notés', count: assignments.filter(a => getMySubmission(a)?.status === 'graded').length }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: filter === f.key ? '#2b8cee' : 'transparent',
              color: filter === f.key ? 'white' : '#617589',
              fontWeight: filter === f.key ? '600' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {f.label}
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: filter === f.key ? 'rgba(255, 255, 255, 0.2)' : '#f3f4f6',
              color: filter === f.key ? 'white' : '#617589'
            }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
          <p style={{ color: '#111418', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
            Aucun devoir
          </p>
          <p style={{ color: '#617589' }}>
            {filter === 'all' ? 'Aucun devoir pour le moment' : `Aucun devoir ${filter === 'todo' ? 'à faire' : filter === 'submitted' ? 'soumis' : 'noté'}`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredAssignments.map((assignment) => {
            const submission = getMySubmission(assignment);
            const status = getAssignmentStatus(assignment);
            const dateInfo = formatDate(assignment.due_date);
            const timeRemaining = getTimeRemaining(assignment.due_date);

            return (
              <Link
                key={assignment.id}
                href={submission
                  ? `/student/submissions/${submission.id}`
                  : `/student/assignments/${assignment.id}/submit`
                }
                style={{
                  textDecoration: 'none',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #dbe0e6',
                  padding: '24px',
                  display: 'block',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2b8cee';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(43, 140, 238, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#dbe0e6';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#111418',
                      marginBottom: '8px'
                    }}>
                      {assignment.title}
                    </h3>
                    {assignment.description && (
                      <p style={{
                        fontSize: '14px',
                        color: '#617589',
                        lineHeight: '1.6',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {assignment.description}
                      </p>
                    )}
                  </div>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: status.bg,
                    color: status.color,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{status.icon}</span>
                    {status.label}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Date limite
                    </p>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: dateInfo.isPast ? '#dc2626' : '#111418'
                    }}>
                      {dateInfo.formatted}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      {timeRemaining ? 'Temps restant' : 'Points'}
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                      {timeRemaining || `${assignment.max_points} pts`}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      {submission ? 'Soumis le' : 'Action'}
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#2b8cee' }}>
                      {submission
                        ? new Date(submission.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                        : 'Soumettre →'
                      }
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
