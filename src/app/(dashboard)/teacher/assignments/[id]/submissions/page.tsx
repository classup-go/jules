'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Student {
  id: string;
  display_name: string;
  email: string;
}

interface Submission {
  id: string;
  student_id: string;
  status: string;
  grade: number | null;
  percentage: number | null;
  submitted_at: string;
  is_late: boolean;
  student: Student;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  classroom_id: string;
  classroom: {
    id: string;
    title: string;
  };
}

export default function AssignmentSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = use(params);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'submitted', 'pending', 'graded'

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch assignment details
      const assignmentResponse = await fetch(`/api/assignments/${assignmentId}`);
      if (assignmentResponse.ok) {
        const assignmentData = await assignmentResponse.json();
        setAssignment(assignmentData.assignment);

        // Fetch submissions
        const submissionsResponse = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          setSubmissions(submissionsData.submissions || []);
        }

        // Fetch enrolled students
        const supabase = createClient();
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student:users(id, display_name, email)')
          .eq('classroom_id', assignmentData.assignment.classroom_id)
          .eq('status', 'active');

        if (enrollments) {
          const students = enrollments.map((e: any) => e.student).filter(Boolean);
          setEnrolledStudents(students);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSubmissions = () => {
    if (filter === 'all') return submissions;
    if (filter === 'submitted') return submissions.filter(s => s.status === 'submitted');
    if (filter === 'graded') return submissions.filter(s => s.status === 'graded');
    return submissions;
  };

  const getStudentsWithoutSubmission = () => {
    const submittedStudentIds = submissions.map(s => s.student_id);
    return enrolledStudents.filter(s => !submittedStudentIds.includes(s.id));
  };

  const getSubmissionStats = () => {
    const total = enrolledStudents.length;
    const submitted = submissions.length;
    const graded = submissions.filter(s => s.status === 'graded').length;
    const late = submissions.filter(s => s.is_late).length;
    const pending = total - submitted;

    return { total, submitted, graded, late, pending };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (submission: Submission | null, isLate: boolean = false) => {
    if (!submission) {
      return (
        <span style={{
          padding: '6px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600',
          backgroundColor: '#fee2e2',
          color: '#dc2626'
        }}>
          ❌ Non soumis
        </span>
      );
    }

    if (submission.status === 'graded') {
      return (
        <span style={{
          padding: '6px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600',
          backgroundColor: '#d1fae5',
          color: '#16a34a'
        }}>
          ✅ Noté ({submission.grade}/{assignment?.max_points})
        </span>
      );
    }

    if (isLate || submission.is_late) {
      return (
        <span style={{
          padding: '6px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600',
          backgroundColor: '#fef3c7',
          color: '#92400e'
        }}>
          ⚠️ En retard
        </span>
      );
    }

    return (
      <span style={{
        padding: '6px 14px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '600',
        backgroundColor: '#dbeafe',
        color: '#2b8cee'
      }}>
        📝 Soumis
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px'
      }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>
          Devoir non trouvé
        </h2>
      </div>
    );
  }

  const stats = getSubmissionStats();
  const filteredSubmissions = getFilteredSubmissions();
  const pendingStudents = getStudentsWithoutSubmission();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Link
        href={`/teacher/classrooms/${assignment.classroom_id}`}
        style={{
          color: '#617589',
          textDecoration: 'none',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '24px'
        }}
      >
        ← Retour à la classe
      </Link>

      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #dbe0e6',
        padding: '32px',
        marginBottom: '24px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#111418',
          marginBottom: '8px'
        }}>
          {assignment.title}
        </h1>
        <p style={{ fontSize: '14px', color: '#617589', marginBottom: '24px' }}>
          {assignment.classroom.title}
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
              Total élèves
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>
              {stats.total}
            </p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#dbeafe',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '12px', color: '#2563eb', marginBottom: '4px' }}>
              Soumis
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
              {stats.submitted}
            </p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#d1fae5',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>
              Notés
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
              {stats.graded}
            </p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>
              En retard
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
              {stats.late}
            </p>
          </div>
          <div style={{
            padding: '16px',
            backgroundColor: '#fee2e2',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>
              Non soumis
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
              {stats.pending}
            </p>
          </div>
        </div>
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
          { key: 'all', label: `Tous (${enrolledStudents.length})` },
          { key: 'submitted', label: `Soumis (${stats.submitted})` },
          { key: 'graded', label: `Notés (${stats.graded})` },
          { key: 'pending', label: `Non soumis (${stats.pending})` }
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

      {/* Submissions List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {filter !== 'pending' ? (
          filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/teacher/submissions/${submission.id}/grade`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #dbe0e6',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2b8cee';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#dbe0e6';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#2b8cee'
                  }}>
                    {submission.student.display_name?.charAt(0) || 'E'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111418',
                      marginBottom: '4px'
                    }}>
                      {submission.student.display_name}
                    </p>
                    <p style={{ fontSize: '13px', color: '#617589' }}>
                      {submission.student.email}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                      Soumis le
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                      {formatDate(submission.submitted_at)}
                    </p>
                  </div>
                  {getStatusBadge(submission)}
                </div>
              </Link>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #dbe0e6'
            }}>
              <p style={{ color: '#617589' }}>Aucune soumission trouvée</p>
            </div>
          )
        ) : (
          pendingStudents.length > 0 ? (
            pendingStudents.map((student) => (
              <div
                key={student.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #dbe0e6',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#dc2626'
                  }}>
                    {student.display_name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111418',
                      marginBottom: '4px'
                    }}>
                      {student.display_name}
                    </p>
                    <p style={{ fontSize: '13px', color: '#617589' }}>
                      {student.email}
                    </p>
                  </div>
                </div>
                {getStatusBadge(null)}
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #dbe0e6'
            }}>
              <p style={{ color: '#16a34a', fontWeight: '600' }}>
                ✅ Tous les élèves ont soumis !
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
