'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import HomeworkFileDisplay from '@/components/homework/homework-file-display';

interface Submission {
  id: string;
  submission_text: string;
  submission_files: string[];
  submitted_at: string;
  is_late: boolean;
  status: string;
  grade: number | null;
  percentage: number | null;
  passed: boolean | null;
  feedback_text: string | null;
  feedback_files: string[];
  attempt_number: number;
  assignment: {
    id: string;
    title: string;
    description: string;
    max_points: number;
    passing_grade: number;
    classroom_id: string;
    allow_resubmission: boolean;
    max_attempts: number;
  };
}

export default function StudentSubmissionViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = use(params);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}`);

      if (response.ok) {
        const data = await response.json();
        setSubmission(data.submission);
      } else {
        console.error('Failed to fetch submission');
      }
    } catch (error) {
      console.error('Failed to fetch submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const canResubmit = () => {
    if (!submission) return false;
    return (
      submission.assignment.allow_resubmission &&
      submission.attempt_number < submission.assignment.max_attempts
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

  if (!submission) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>
          Soumission non trouvée
        </h2>
      </div>
    );
  }

  const isGraded = submission.status === 'graded';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Link
        href={`/student/assignments?classroom=${submission.assignment.classroom_id}`}
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
        ← Retour aux devoirs
      </Link>

      {/* Assignment Info */}
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
          {submission.assignment.title}
        </h1>
        <p style={{ fontSize: '14px', color: '#617589', marginBottom: '24px' }}>
          {submission.assignment.description}
        </p>

        {/* Status Badges */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {isGraded ? (
            <>
              <span style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: submission.passed ? '#d1fae5' : '#fee2e2',
                color: submission.passed ? '#16a34a' : '#dc2626'
              }}>
                {submission.passed ? '✅ Réussi' : '❌ Échoué'}
              </span>
              <span style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: '#dbeafe',
                color: '#2b8cee'
              }}>
                📊 {submission.grade}/{submission.assignment.max_points} ({submission.percentage}%)
              </span>
            </>
          ) : (
            <span style={{
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#fef3c7',
              color: '#92400e'
            }}>
              ⏳ En attente de notation
            </span>
          )}
          {submission.is_late && (
            <span style={{
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#fee2e2',
              color: '#dc2626'
            }}>
              ⚠️ Soumis en retard
            </span>
          )}
          <span style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: '#f3f4f6',
            color: '#617589'
          }}>
            Tentative #{submission.attempt_number}
          </span>
        </div>
      </div>

      {/* Grade Card (if graded) */}
      {isGraded && (
        <div style={{
          backgroundColor: submission.passed ? '#d1fae5' : '#fee2e2',
          borderRadius: '16px',
          border: `2px solid ${submission.passed ? '#16a34a' : '#dc2626'}`,
          padding: '32px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '14px',
            fontWeight: '600',
            color: submission.passed ? '#16a34a' : '#dc2626',
            marginBottom: '12px'
          }}>
            Votre note
          </p>
          <p style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: submission.passed ? '#16a34a' : '#dc2626',
            marginBottom: '8px',
            lineHeight: 1
          }}>
            {submission.grade}<span style={{ fontSize: '32px' }}>/{submission.assignment.max_points}</span>
          </p>
          <p style={{
            fontSize: '20px',
            fontWeight: '600',
            color: submission.passed ? '#16a34a' : '#dc2626'
          }}>
            {submission.percentage}%
          </p>
          {!submission.passed && (
            <p style={{
              fontSize: '14px',
              color: '#991b1b',
              marginTop: '12px'
            }}>
              Note de passage : {submission.assignment.passing_grade}%
            </p>
          )}
        </div>
      )}

      {/* Feedback (if provided) */}
      {isGraded && submission.feedback_text && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#111418',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            💬 Feedback de l'enseignant
          </h2>
          <div style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#111418',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap'
          }}>
            {submission.feedback_text}
          </div>

          {/* Feedback Files */}
          {submission.feedback_files && submission.feedback_files.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111418',
                marginBottom: '12px'
              }}>
                Fichiers de correction
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {submission.feedback_files.map((filePath, index) => (
                  <HomeworkFileDisplay
                    key={index}
                    filePath={filePath}
                    showRemove={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Your Submission */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #dbe0e6',
        padding: '32px',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#111418',
          marginBottom: '16px'
        }}>
          Votre soumission
        </h2>

        <p style={{
          fontSize: '13px',
          color: '#617589',
          marginBottom: '20px'
        }}>
          Soumis le {new Date(submission.submitted_at).toLocaleString('fr-FR')}
        </p>

        {/* Text Content */}
        {submission.submission_text && (
          <div style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#111418',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}>
              {submission.submission_text}
            </p>
          </div>
        )}

        {/* Files */}
        {submission.submission_files && submission.submission_files.length > 0 && (
          <div>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111418',
              marginBottom: '12px'
            }}>
              Fichiers joints
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {submission.submission_files.map((filePath, index) => (
                <HomeworkFileDisplay
                  key={index}
                  filePath={filePath}
                  showRemove={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resubmit Option */}
      {canResubmit() && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111418',
              marginBottom: '4px'
            }}>
              Soumettre à nouveau
            </p>
            <p style={{ fontSize: '14px', color: '#617589' }}>
              {submission.assignment.max_attempts - submission.attempt_number} tentative{submission.assignment.max_attempts - submission.attempt_number > 1 ? 's' : ''} restante{submission.assignment.max_attempts - submission.attempt_number > 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href={`/student/assignments/${submission.assignment.id}/submit`}
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
            Re-soumettre →
          </Link>
        </div>
      )}
    </div>
  );
}
