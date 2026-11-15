'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  status: string;
  classroom_id: string;
  classroom?: {
    id: string;
    title: string;
    subject: string;
  };
  submissions: any[];
}

export default function TeacherAssignmentsPage() {
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroom');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'published', 'draft'

  useEffect(() => {
    fetchAssignments();
  }, [classroomId, filter]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classroomId) {
        params.set('classroomId', classroomId);
      }
      params.set('status', filter);

      const url = `/api/assignments?${params.toString()}`;
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

  const getStatusBadge = (status: string) => {
    const styles = {
      published: { bg: '#d1fae5', color: '#16a34a', label: 'Publié' },
      draft: { bg: '#f3f4f6', color: '#617589', label: 'Brouillon' },
      closed: { bg: '#fee2e2', color: '#dc2626', label: 'Fermé' }
    };

    const style = styles[status as keyof typeof styles] || styles.draft;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isPast = date < now;

    const formatted = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });

    return (
      <span style={{ color: isPast ? '#dc2626' : '#111418' }}>
        {isPast && '⚠️ '}
        {formatted}
      </span>
    );
  };

  const getSubmissionStats = (submissions: any[]) => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.status === 'graded').length;
    const late = submissions.filter(s => s.is_late).length;

    return { total, graded, late };
  };

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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
            Devoirs
          </h1>
          <p style={{ color: '#617589', fontSize: '14px' }}>
            Gérez les devoirs de votre classe
          </p>
        </div>
        <Link
          href={`/teacher/assignments/new?classroom=${classroomId}`}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2b8cee',
            color: 'white',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + Nouveau devoir
        </Link>
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
          { key: 'all', label: 'Tous' },
          { key: 'published', label: 'Publiés' },
          { key: 'draft', label: 'Brouillons' }
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
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
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
          <p style={{ color: '#617589', marginBottom: '24px' }}>
            Créez votre premier devoir pour commencer
          </p>
          <Link
            href={`/teacher/assignments/new?classroom=${classroomId}`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#2b8cee',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Créer un devoir
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {assignments.map((assignment) => {
            const stats = getSubmissionStats(assignment.submissions || []);

            return (
              <Link
                key={assignment.id}
                href={`/teacher/assignments/${assignment.id}/submissions`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
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
                        WebkitBoxOrient: 'vertical',
                        marginBottom: '8px'
                      }}>
                        {assignment.description}
                      </p>
                    )}
                    {!classroomId && assignment.classroom && (
                      <p style={{
                        fontSize: '13px',
                        color: '#2b8cee',
                        fontWeight: '500'
                      }}>
                        📚 {assignment.classroom.title} - {assignment.classroom.subject}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(assignment.status)}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Date limite
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>
                      {formatDate(assignment.due_date)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Soumissions
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                      {stats.total}
                      {stats.late > 0 && (
                        <span style={{ color: '#dc2626', marginLeft: '4px' }}>
                          ({stats.late} en retard)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Notés
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                      {stats.graded} / {stats.total}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Points max
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                      {assignment.max_points}
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
