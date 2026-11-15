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
  created_at: string;
  classroom: {
    title: string;
    subject: string;
  };
  submissions: any[];
}

export default function TeacherHomeworkHub() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'draft', 'closed'
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    try {
      // Fetch classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id)
        .order('title');

      if (classroomsData) setClassrooms(classroomsData);

      // Fetch assignments with submissions count
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`
          *,
          classroom:classrooms(title, subject),
          submissions(id, status, student_id, grade)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (assignmentsData) {
        setAssignments(assignmentsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    // Filter by status
    if (filter === 'active' && assignment.status !== 'published') return false;
    if (filter === 'draft' && assignment.status !== 'draft') return false;
    if (filter === 'closed' && assignment.status !== 'closed') return false;

    // Filter by classroom
    if (selectedClassroom !== 'all' && assignment.classroom_id !== selectedClassroom) return false;

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
    const active = assignments.filter(a => a.status === 'published').length;
    const draft = assignments.filter(a => a.status === 'draft').length;

    const totalSubmissions = assignments.reduce((acc, a) => acc + a.submissions.length, 0);
    const toGrade = assignments.reduce((acc, a) => {
      return acc + a.submissions.filter((s: any) => s.status === 'submitted').length;
    }, 0);
    const graded = assignments.reduce((acc, a) => {
      return acc + a.submissions.filter((s: any) => s.status === 'graded').length;
    }, 0);

    return { total, active, draft, totalSubmissions, toGrade, graded };
  };

  const stats = getStats();

  const getAssignmentStats = (assignment: Assignment) => {
    const total = assignment.submissions.length;
    const submitted = assignment.submissions.filter((s: any) => s.status === 'submitted').length;
    const graded = assignment.submissions.filter((s: any) => s.status === 'graded').length;

    return { total, submitted, graded };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; color: string; label: string }> = {
      published: { bg: '#d1fae5', color: '#16a34a', label: 'Publié' },
      draft: { bg: '#f3f4f6', color: '#6b7280', label: 'Brouillon' },
      closed: { bg: '#fee2e2', color: '#dc2626', label: 'Fermé' }
    };
    return badges[status] || badges.draft;
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours < 48; // Due within 48 hours
  };

  const isPastDue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

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
          Gérez vos devoirs, suivez les soumissions et notez vos élèves
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Total devoirs</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2b8cee' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>
            {stats.active} actifs • {stats.draft} brouillons
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Soumissions</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalSubmissions}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>
            Total reçues
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>À noter</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ea580c' }}>{stats.toGrade}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>
            En attente de notation
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>Notés</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#7c3aed' }}>{stats.graded}</div>
          <div style={{ fontSize: '12px', color: '#617589', marginTop: '8px' }}>
            {stats.totalSubmissions > 0 ? Math.round((stats.graded / stats.totalSubmissions) * 100) : 0}% du total
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #dbe0e6',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
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

          {/* Classroom Filter */}
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #dbe0e6',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">Toutes les classes</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'all', label: 'Tous', count: assignments.length },
              { key: 'active', label: 'Actifs', count: stats.active },
              { key: 'draft', label: 'Brouillons', count: stats.draft },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: filter === f.key ? 'none' : '1px solid #dbe0e6',
                  backgroundColor: filter === f.key ? '#2b8cee' : 'white',
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

        {/* Create Button */}
        <Link
          href={classrooms.length > 0 ? `/teacher/assignments/new?classroom=${classrooms[0].id}` : '/teacher/classrooms/new'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#16a34a',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <span>+</span>
          Créer un devoir
        </Link>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '64px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
            {searchQuery || selectedClassroom !== 'all' ? 'Aucun devoir trouvé' : 'Aucun devoir créé'}
          </h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>
            {searchQuery || selectedClassroom !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Créez votre premier devoir pour commencer à évaluer vos élèves'
            }
          </p>
          {!searchQuery && selectedClassroom === 'all' && (
            <Link
              href={classrooms.length > 0 ? `/teacher/assignments/new?classroom=${classrooms[0].id}` : '/teacher/classrooms/new'}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#2b8cee',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              {classrooms.length > 0 ? 'Créer un devoir' : 'Créer une classe d\'abord'}
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredAssignments.map((assignment) => {
            const assignmentStats = getAssignmentStats(assignment);
            const statusBadge = getStatusBadge(assignment.status);
            const dueSoon = isDueSoon(assignment.due_date);
            const pastDue = isPastDue(assignment.due_date);

            return (
              <div
                key={assignment.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: dueSoon ? '2px solid #fbbf24' : pastDue ? '2px solid #fca5a5' : '1px solid #dbe0e6',
                  padding: '24px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <Link
                        href={`/teacher/assignments/${assignment.id}/submissions`}
                        style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#111418',
                          textDecoration: 'none'
                        }}
                      >
                        {assignment.title}
                      </Link>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color
                      }}>
                        {statusBadge.label}
                      </span>
                      {dueSoon && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>
                          ⏰ Bientôt
                        </span>
                      )}
                      {pastDue && assignment.status === 'published' && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626'
                        }}>
                          ⚠️ Échéance passée
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#617589' }}>
                        📚 {assignment.classroom.title}
                      </span>
                      <span style={{ fontSize: '14px', color: '#617589' }}>
                        📊 {assignment.max_points} points
                      </span>
                      <span style={{ fontSize: '14px', color: pastDue ? '#dc2626' : dueSoon ? '#ea580c' : '#617589', fontWeight: pastDue || dueSoon ? '600' : 'normal' }}>
                        📅 {new Date(assignment.due_date).toLocaleString('fr-FR', {
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

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href={`/teacher/assignments/${assignment.id}/submissions`}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: assignmentStats.submitted > 0 ? '#ea580c' : '#2b8cee',
                        color: 'white',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '14px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {assignmentStats.submitted > 0 ? `Noter (${assignmentStats.submitted})` : 'Voir détails'}
                    </Link>
                  </div>
                </div>

                {/* Stats Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b8cee' }}>
                      {assignmentStats.total}
                    </div>
                    <div style={{ fontSize: '12px', color: '#617589' }}>Soumissions</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>
                      {assignmentStats.submitted}
                    </div>
                    <div style={{ fontSize: '12px', color: '#617589' }}>À noter</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                      {assignmentStats.graded}
                    </div>
                    <div style={{ fontSize: '12px', color: '#617589' }}>Notés</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
