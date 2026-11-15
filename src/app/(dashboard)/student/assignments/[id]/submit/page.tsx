'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HomeworkFileUpload from '@/components/homework/homework-file-upload';

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  due_date: string;
  max_points: number;
  assignment_type: string;
  resource_urls: string[];
  late_submission_allowed: boolean;
  allow_resubmission: boolean;
  max_attempts: number;
  classroom_id: string;
}

export default function SubmitAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      const response = await fetch(`/api/assignments/${id}`);

      if (response.ok) {
        const data = await response.json();
        setAssignment(data.assignment);

        // Check existing submissions
        const submissionsResponse = await fetch(`/api/submissions?assignmentId=${id}`);
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          setAttemptCount(submissionsData.submissions?.length || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignment) return;

    // Validate submission
    if (assignment.assignment_type === 'text' && !submissionText.trim()) {
      alert('Veuillez ajouter du texte à votre soumission');
      return;
    }

    if (assignment.assignment_type === 'file_upload' && submissionFiles.length === 0) {
      alert('Veuillez ajouter au moins un fichier');
      return;
    }

    // Check if past due date
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const isLate = now > dueDate;

    if (isLate && !assignment.late_submission_allowed) {
      alert('La date limite est dépassée et les soumissions en retard ne sont pas autorisées');
      return;
    }

    // Confirm if late
    if (isLate) {
      const confirm = window.confirm(
        'La date limite est dépassée. Votre soumission sera marquée comme retard. Continuer ?'
      );
      if (!confirm) return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: id,
          submissionText,
          submissionFiles
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la soumission');
      }

      const { submission } = await response.json();
      // Show success modal instead of redirecting
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(error.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push(`/student/assignments?classroom=${assignment?.classroom_id}`);
  };

  const isLate = assignment && new Date(assignment.due_date) < new Date();
  const canSubmit = assignment && (
    attemptCount < assignment.max_attempts ||
    (assignment.allow_resubmission && attemptCount < assignment.max_attempts)
  );

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
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
          Devoir non trouvé
        </h2>
        <Link
          href={`/student/assignments?classroom=${assignment?.classroom_id}`}
          style={{ color: '#2b8cee', fontWeight: '600', textDecoration: 'none' }}
        >
          Retour aux devoirs →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Link
        href={`/student/assignments?classroom=${assignment.classroom_id}`}
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

      {/* Assignment Details */}
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
          marginBottom: '16px'
        }}>
          {assignment.title}
        </h1>

        {/* Status Badges */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: isLate ? '#fee2e2' : '#dbeafe',
            color: isLate ? '#dc2626' : '#2b8cee'
          }}>
            {isLate ? '⚠️ En retard' : '⏰ À temps'}
          </span>
          <span style={{
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: '#f3f4f6',
            color: '#617589'
          }}>
            📊 {assignment.max_points} points
          </span>
          <span style={{
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: '#f3f4f6',
            color: '#617589'
          }}>
            📅 {new Date(assignment.due_date).toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Description */}
        {assignment.description && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111418',
              marginBottom: '8px'
            }}>
              Description
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#617589',
              lineHeight: '1.6'
            }}>
              {assignment.description}
            </p>
          </div>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111418',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📝 Instructions
            </h3>
            <div style={{
              fontSize: '14px',
              color: '#111418',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}>
              {assignment.instructions}
            </div>
          </div>
        )}

        {/* Resources */}
        {assignment.resource_urls && assignment.resource_urls.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111418',
              marginBottom: '12px'
            }}>
              📎 Ressources
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignment.resource_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>📄</span>
                  <span style={{ fontSize: '14px', color: '#2b8cee', fontWeight: '500' }}>
                    Ressource {index + 1}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Attempt Info */}
        {attemptCount > 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <p style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
              ⚠️ Vous avez déjà soumis {attemptCount} tentative{attemptCount > 1 ? 's' : ''}.
              {assignment.allow_resubmission
                ? ` ${assignment.max_attempts - attemptCount} tentative${assignment.max_attempts - attemptCount > 1 ? 's' : ''} restante${assignment.max_attempts - attemptCount > 1 ? 's' : ''}.`
                : ' Les re-soumissions ne sont pas autorisées.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Submission Form */}
      {canSubmit ? (
        <form onSubmit={handleSubmit}>
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
              marginBottom: '24px'
            }}>
              Votre soumission
            </h2>

            {/* Text Submission */}
            {(assignment.assignment_type === 'text' || assignment.assignment_type === 'mixed') && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111418'
                }}>
                  Texte de votre devoir {assignment.assignment_type === 'text' && '*'}
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Saisissez votre réponse ici..."
                  rows={10}
                  required={assignment.assignment_type === 'text'}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #dbe0e6',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}

            {/* File Upload */}
            {(assignment.assignment_type === 'file_upload' || assignment.assignment_type === 'mixed') && (
              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111418'
                }}>
                  Fichiers {assignment.assignment_type === 'file_upload' && '*'}
                </label>
                <HomeworkFileUpload
                  onUpload={(files) => setSubmissionFiles(files)}
                  maxFiles={5}
                  maxSize={50}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #dbe0e6',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{ fontSize: '14px', color: '#617589' }}>
              {isLate && assignment.late_submission_allowed
                ? '⚠️ Votre soumission sera marquée comme en retard'
                : 'Vérifiez votre travail avant de soumettre'
              }
            </p>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '14px 32px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Soumission...' : '✅ Soumettre le devoir'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          backgroundColor: '#fee2e2',
          borderRadius: '16px',
          border: '1px solid #fca5a5',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '8px'
          }}>
            Soumission non autorisée
          </h3>
          <p style={{ color: '#991b1b', fontSize: '14px' }}>
            {attemptCount >= assignment.max_attempts
              ? 'Vous avez atteint le nombre maximum de tentatives'
              : isLate && !assignment.late_submission_allowed
              ? 'Les soumissions en retard ne sont pas autorisées'
              : 'Vous ne pouvez pas soumettre ce devoir'
            }
          </p>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              ✅
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#111418',
              marginBottom: '12px'
            }}>
              Devoir soumis !
            </h2>

            {/* Message */}
            <p style={{
              fontSize: '16px',
              color: '#617589',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              Votre travail a été soumis avec succès. Votre professeur le corrigera et vous recevrez une notification avec votre note et ses commentaires.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Retour aux devoirs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
