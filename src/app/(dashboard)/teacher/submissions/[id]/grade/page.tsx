'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HomeworkFileUpload from '@/components/homework/homework-file-upload';
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
  student: {
    id: string;
    display_name: string;
    email: string;
  };
  assignment: {
    id: string;
    title: string;
    description: string;
    max_points: number;
    passing_grade: number;
    classroom_id: string;
  };
}

export default function GradeSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = use(params);
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackFiles, setFeedbackFiles] = useState<string[]>([]);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}`);

      if (response.ok) {
        const data = await response.json();
        setSubmission(data.submission);

        // Pre-fill form if already graded
        if (data.submission.grade !== null) {
          setGrade(data.submission.grade);
        }
        if (data.submission.feedback_text) {
          setFeedbackText(data.submission.feedback_text);
        }
        if (data.submission.feedback_files) {
          setFeedbackFiles(data.submission.feedback_files);
        }
      } else {
        console.error('Failed to fetch submission');
      }
    } catch (error) {
      console.error('Failed to fetch submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!submission) return;

    if (grade < 0 || grade > submission.assignment.max_points) {
      alert(`La note doit être entre 0 et ${submission.assignment.max_points}`);
      return;
    }

    setGrading(true);

    try {
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          feedbackText,
          feedbackFiles
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la notation');
      }

      // Redirect back to submissions list
      router.push(`/teacher/assignments/${submission.assignment.id}/submissions`);
    } catch (error: any) {
      console.error('Grading error:', error);
      alert(error.message || 'Erreur lors de la notation');
    } finally {
      setGrading(false);
    }
  };


  const calculatePercentage = () => {
    if (!submission) return 0;
    return ((grade / submission.assignment.max_points) * 100).toFixed(1);
  };

  const willPass = () => {
    if (!submission) return false;
    const percentage = (grade / submission.assignment.max_points) * 100;
    return percentage >= submission.assignment.passing_grade;
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Link
        href={`/teacher/assignments/${submission.assignment.id}/submissions`}
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
        ← Retour aux soumissions
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Left Column - Submission Content */}
        <div>
          {/* Student Info */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #dbe0e6',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#2b8cee'
              }}>
                {submission.student.display_name?.charAt(0) || 'E'}
              </div>
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#111418',
                  marginBottom: '4px'
                }}>
                  {submission.student.display_name}
                </h2>
                <p style={{ fontSize: '14px', color: '#617589' }}>
                  {submission.student.email}
                </p>
              </div>
              {submission.is_late && (
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  marginLeft: 'auto'
                }}>
                  ⚠️ En retard
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #f3f4f6'
            }}>
              <div>
                <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                  Soumis le
                </p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                  {new Date(submission.submitted_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                  Tentative
                </p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                  #{submission.attempt_number}
                </p>
              </div>
            </div>
          </div>

          {/* Assignment Info */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #dbe0e6',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111418',
              marginBottom: '8px'
            }}>
              {submission.assignment.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#617589', marginBottom: '16px' }}>
              {submission.assignment.description}
            </p>
            <div style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              gap: '24px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: '#617589' }}>Points max : </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                  {submission.assignment.max_points}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#617589' }}>Note de passage : </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                  {submission.assignment.passing_grade}%
                </span>
              </div>
            </div>
          </div>

          {/* Submission Content */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #dbe0e6',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#111418',
              marginBottom: '16px'
            }}>
              Travail soumis
            </h3>

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
        </div>

        {/* Right Column - Grading Form */}
        <div>
          <form onSubmit={handleSubmitGrade}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #dbe0e6',
              padding: '24px',
              position: 'sticky',
              top: '24px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111418',
                marginBottom: '24px'
              }}>
                Noter le devoir
              </h3>

              {/* Grade Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111418'
                }}>
                  Note *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max={submission.assignment.max_points}
                    step="0.5"
                    required
                    value={grade}
                    onChange={(e) => setGrade(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      paddingRight: '80px',
                      borderRadius: '12px',
                      border: '2px solid #dbe0e6',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#617589'
                  }}>
                    / {submission.assignment.max_points}
                  </span>
                </div>

                {/* Grade Preview */}
                <div style={{
                  marginTop: '12px',
                  padding: '16px',
                  backgroundColor: willPass() ? '#d1fae5' : '#fee2e2',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: willPass() ? '#16a34a' : '#dc2626',
                    marginBottom: '4px'
                  }}>
                    {calculatePercentage()}%
                  </p>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: willPass() ? '#16a34a' : '#dc2626'
                  }}>
                    {willPass() ? '✅ Réussi' : '❌ Échoué'}
                  </p>
                </div>
              </div>

              {/* Feedback Text */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111418'
                }}>
                  Feedback
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Commentaires et suggestions pour l'étudiant..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #dbe0e6',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Feedback Files */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111418'
                }}>
                  Fichiers de correction (optionnel)
                </label>
                <HomeworkFileUpload
                  onUpload={(files) => setFeedbackFiles(files)}
                  maxFiles={3}
                  maxSize={50}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={grading}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: grading ? 'not-allowed' : 'pointer',
                  opacity: grading ? 0.7 : 1
                }}
              >
                {grading ? 'Enregistrement...' : '✅ Enregistrer la note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
