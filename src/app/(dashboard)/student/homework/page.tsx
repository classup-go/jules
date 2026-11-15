'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  status: string;
  classroom_id: string;
  passing_grade: number;
  classroom: {
    title: string;
    subject: string;
  };
  submissions: any[];
}

export default function StudentHomeworkHub() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'todo', 'submitted', 'graded', 'late'
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    try {
      // Get enrolled classrooms
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('classroom_id')
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const classroomIds = enrollments.map(e => e.classroom_id);

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`
          *,
          classroom:classrooms(title, subject),
          submissions!left(id, status, grade, percentage, passed, student_id, submitted_at)
        `)
        .in('classroom_id', classroomIds)
        .eq('status', 'published')
        .order('due_date', { ascending: true });

      if (assignmentsData) {
        // Filter submissions to only show current user's
        const enrichedAssignments = assignmentsData.map((assignment: any) => ({
          ...assignment,
          submissions: assignment.submissions?.filter((s: any) => s.student_id === user.id) || []
        }));
        setAssignments(enrichedAssignments);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const submission = assignment.submissions[0];
    const isPastDue = new Date(assignment.due_date) < new Date();

    // Filter by status
    if (filter === 'todo' && (submission || isPastDue)) return false;
    if (filter === 'submitted' && (!submission || submission.status !== 'submitted')) return false;
    if (filter === 'graded' && (!submission || submission.status !== 'graded')) return false;
    if (filter === 'late' && !isPastDue) return false;

    // Filter by subject
    if (selectedSubject !== 'all' && assignment.classroom.subject !== selectedSubject) return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        assignment.title.toLowerCase().includes(query) ||
        assignment.description?.toLowerCase().includes(query) ||
        assignment.classroom.title.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getStats = () => {
    const total = assignments.length;
    const todo = assignments.filter(a => !a.submissions[0] && new Date(a.due_date) > new Date()).length;
    const submitted = assignments.filter(a => a.submissions[0]?.status === 'submitted').length;
    const graded = assignments.filter(a => a.submissions[0]?.status === 'graded').length;
    const late = assignments.filter(a => !a.submissions[0] && new Date(a.due_date) < new Date()).length;

    const avgGrade = graded > 0
      ? (assignments
          .filter(a => a.submissions[0]?.status === 'graded')
          .reduce((acc, a) => acc + (a.submissions[0]?.percentage || 0), 0) / graded).toFixed(1)
      : 0;

    return { total, todo, submitted, graded, late, avgGrade };
  };

  const stats = getStats();

  const subjects = Array.from(new Set(assignments.map(a => a.classroom.subject)));

  const getAssignmentStatus = (assignment: Assignment) => {
    const submission = assignment.submissions[0];
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const isPastDue = now > dueDate;
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isUrgent = hoursUntilDue > 0 && hoursUntilDue < 24;

    if (submission) {
      if (submission.status === 'graded') {
        return {
          label: `${submission.grade || 0}/${assignment.max_points}`,
          bg: submission.passed ? '#d1fae5' : '#fee2e2',
          color: submission.passed ? '#16a34a' : '#dc2626',
          icon: submission.passed ? '✅' : '❌',
          priority: 0
        };
      }
      return {
        label: 'Soumis',
        bg: '#dbeafe',
        color: '#2b8cee',
        icon: '📤',
        priority: 1
      };
    }

    if (isPastDue) {
      return {
        label: 'En retard',
        bg: '#fee2e2',
        color: '#dc2626',
        icon: '⚠️',
        priority: 3
      };
    }

    if (isUrgent) {
      return {
        label: hoursUntilDue < 1 ? 'Urgent !' : 'Bientôt',
        bg: '#fef3c7',
        color: '#ea580c',
        icon: '⏰',
        priority: 4
      };
    }

    return {
      label: 'À faire',
      bg: '#f3f4f6',
      color: '#617589',
      icon: '📝',
      priority: 2
    };
  };

  // Sort by priority: Urgent > Late > To Do > Submitted > Graded
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const statusA = getAssignmentStatus(a);
    const statusB = getAssignmentStatus(b);
    return statusB.priority - statusA.priority;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
          📝 Mes Devoirs
        </h1>
        <p style={{ color: '#617589', fontSize: '16px' }}>
          Suivez vos devoirs, soumettez vos travaux et consultez vos notes
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Total</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2b8cee' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>devoirs</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px solid #fbbf24',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>À faire</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ea580c' }}>{stats.todo}</div>
          <div style={{ fontSize: '12px', color: '#ea580c', marginTop: '8px', fontWeight: '600' }}>
            {stats.late > 0 && `${stats.late} en retard`}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Soumis</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2b8cee' }}>{stats.submitted}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>en attente</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Notés</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#16a34a' }}>{stats.graded}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>
            Moyenne: {stats.avgGrade}%
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #dbe0e6',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher un devoir..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid #dbe0e6',
            fontSize: '14px',
            minWidth: '250px',
            flex: 1
          }}
        />

        {/* Subject Filter */}
        {subjects.length > 1 && (
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #dbe0e6',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">Toutes les matières</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        )}

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tous', count: assignments.length },
            { key: 'todo', label: 'À faire', count: stats.todo },
            { key: 'submitted', label: 'Soumis', count: stats.submitted },
            { key: 'graded', label: 'Notés', count: stats.graded },
            { key: 'late', label: 'En retard', count: stats.late },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: filter === f.key ? 'none' : '1px solid #dbe0e6',
                backgroundColor: filter === f.key ? (f.key === 'late' ? '#fee2e2' : '#2b8cee') : 'white',
                color: filter === f.key ? (f.key === 'late' ? '#dc2626' : 'white') : '#617589',
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
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '12px',
                backgroundColor: filter === f.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6'
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      {sortedAssignments.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '64px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✨</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
            {searchQuery || selectedSubject !== 'all' ? 'Aucun devoir trouvé' : 'Aucun devoir pour le moment'}
          </h3>
          <p style={{ color: '#617589' }}>
            {searchQuery || selectedSubject !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Vos professeurs n\'ont pas encore publié de devoirs'
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {sortedAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const submission = assignment.submissions[0];
            const dueDate = new Date(assignment.due_date);

            return (
              <Link
                key={assignment.id}
                href={submission
                  ? `/student/submissions/${submission.id}`
                  : `/student/assignments/${assignment.id}/submit?classroom=${assignment.classroom_id}`
                }
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: status.priority >= 3 ? `2px solid ${status.color}` : '1px solid #dbe0e6',
                  padding: '24px',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', margin: 0 }}>
                        {assignment.title}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: status.bg,
                        color: status.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>{status.icon}</span>
                        {status.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', color: '#617589' }}>
                        📚 {assignment.classroom.title}
                      </span>
                      <span style={{ fontSize: '14px', color: '#617589' }}>
                        📊 {assignment.max_points} points
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: status.priority >= 3 ? status.color : '#617589',
                        fontWeight: status.priority >= 3 ? '600' : 'normal'
                      }}>
                        📅 {dueDate.toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {assignment.description && (
                      <p style={{
                        fontSize: '14px',
                        color: '#617589',
                        marginTop: '8px',
                        lineHeight: '1.6'
                      }}>
                        {assignment.description.length > 150
                          ? assignment.description.substring(0, 150) + '...'
                          : assignment.description
                        }
                      </p>
                    )}
                  </div>

                  <div style={{
                    padding: '12px 24px',
                    backgroundColor: status.priority >= 3 ? status.bg : '#2b8cee',
                    color: status.priority >= 3 ? status.color : 'white',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    marginLeft: '16px'
                  }}>
                    {submission ? (submission.status === 'graded' ? 'Voir note' : 'En attente') : 'Soumettre'} →
                  </div>
                </div>

                {/* Additional Info */}
                {submission?.status === 'graded' && (
                  <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: '24px'
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#617589' }}>Note obtenue: </span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: submission.passed ? '#16a34a' : '#dc2626'
                      }}>
                        {submission.percentage}%
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#617589' }}>Note de passage: </span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                        {assignment.passing_grade}%
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
