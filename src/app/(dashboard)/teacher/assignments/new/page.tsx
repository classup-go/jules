'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HomeworkFileUpload from '@/components/homework/homework-file-upload';

interface Classroom {
  id: string;
  title: string;
  subject: string;
  level: string;
}

export default function NewAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomIdFromUrl = searchParams.get('classroom');

  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(classroomIdFromUrl || '');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    assignmentType: 'file_upload',
    maxPoints: 100,
    passingGrade: 60,
    dueDate: '',
    dueTime: '23:59',
    lateSubmissionAllowed: true,
    latePenaltyPercent: 10,
    allowResubmission: false,
    maxAttempts: 1,
    resourceUrls: [] as string[],
    status: 'draft'
  });

  // Fetch teacher's classrooms on mount
  useEffect(() => {
    const fetchClassrooms = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('classrooms')
          .select('id, title, subject, level')
          .eq('teacher_id', user.id)
          .order('title');

        if (data) {
          setClassrooms(data);
        }
      }
    };

    fetchClassrooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomId) {
      alert('Veuillez sélectionner une classe');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const dueDateTime = `${formData.dueDate}T${formData.dueTime}:00Z`;

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroomId,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          assignmentType: formData.assignmentType,
          maxPoints: formData.maxPoints,
          passingGrade: formData.passingGrade,
          dueDate: dueDateTime,
          lateSubmissionAllowed: formData.lateSubmissionAllowed,
          latePenaltyPercent: formData.latePenaltyPercent,
          allowResubmission: formData.allowResubmission,
          maxAttempts: formData.maxAttempts,
          resourceUrls: formData.resourceUrls,
          status: formData.status
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }

      const { assignment } = await response.json();
      router.push(`/teacher/classrooms/${selectedClassroomId}`);
    } catch (error: any) {
      console.error('Assignment creation error:', error);
      alert(error.message || 'Erreur lors de la création du devoir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {classroomIdFromUrl && (
        <Link
          href={`/teacher/classrooms/${classroomIdFromUrl}`}
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
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #dbe0e6',
        padding: '32px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '24px' }}>
          Créer un devoir
        </h1>

        <form onSubmit={handleSubmit}>
          {/* Classroom Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Classe *
            </label>
            <select
              required
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              disabled={!!classroomIdFromUrl}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
                backgroundColor: classroomIdFromUrl ? '#f9fafb' : 'white',
                cursor: classroomIdFromUrl ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">Sélectionnez une classe</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.title} - {classroom.subject} ({classroom.level})
                </option>
              ))}
            </select>
            {classroomIdFromUrl && (
              <p style={{ fontSize: '12px', color: '#617589', marginTop: '6px' }}>
                La classe a été pré-sélectionnée depuis la page de classe
              </p>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Titre *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Dissertation sur la Révolution Française"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez brièvement le devoir..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Instructions détaillées
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Consignes détaillées pour les étudiants..."
              rows={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Assignment Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>
              Type de devoir
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { key: 'file_upload', icon: '📎', label: 'Fichiers' },
                { key: 'text', icon: '📝', label: 'Texte' },
                { key: 'mixed', icon: '📋', label: 'Mixte' }
              ].map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, assignmentType: type.key }))}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: formData.assignmentType === type.key ? '2px solid #2b8cee' : '2px solid #dbe0e6',
                    backgroundColor: formData.assignmentType === type.key ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>{type.icon}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: formData.assignmentType === type.key ? '#2b8cee' : '#617589'
                  }}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Points and Passing Grade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
                Points maximum
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={formData.maxPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, maxPoints: parseInt(e.target.value) || 100 }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dbe0e6',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
                Note de passage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={formData.passingGrade}
                onChange={(e) => setFormData(prev => ({ ...prev, passingGrade: parseInt(e.target.value) || 60 }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dbe0e6',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Due Date and Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
                Date limite *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dbe0e6',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
                Heure
              </label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dbe0e6',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Late Submission Settings */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}>
              <input
                type="checkbox"
                checked={formData.lateSubmissionAllowed}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  lateSubmissionAllowed: e.target.checked
                }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                Autoriser les soumissions en retard
              </span>
            </label>

            {formData.lateSubmissionAllowed && (
              <div style={{ marginLeft: '30px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#617589', marginBottom: '8px' }}>
                  Pénalité par jour de retard (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.latePenaltyPercent}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    latePenaltyPercent: parseInt(e.target.value) || 0
                  }))}
                  style={{
                    width: '120px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #dbe0e6',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Resubmission Settings */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}>
              <input
                type="checkbox"
                checked={formData.allowResubmission}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  allowResubmission: e.target.checked
                }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                Autoriser les re-soumissions
              </span>
            </label>

            {formData.allowResubmission && (
              <div style={{ marginLeft: '30px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#617589', marginBottom: '8px' }}>
                  Nombre maximum de tentatives
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    maxAttempts: parseInt(e.target.value) || 1
                  }))}
                  style={{
                    width: '120px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #dbe0e6',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Resource Files */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Fichiers ressources (optionnel)
            </label>
            <p style={{ fontSize: '13px', color: '#617589', marginBottom: '12px' }}>
              Ajoutez des documents, guides ou ressources pour aider les étudiants
            </p>
            <HomeworkFileUpload
              onUpload={(files) => setFormData(prev => ({ ...prev, resourceUrls: files }))}
              maxFiles={5}
              maxSize={50}
              existingFiles={formData.resourceUrls}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>
              Statut
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: formData.status === 'draft' ? '2px solid #2b8cee' : '2px solid #dbe0e6',
                backgroundColor: formData.status === 'draft' ? 'rgba(43, 140, 238, 0.05)' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === 'draft'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontWeight: '600', fontSize: '14px', color: '#111418', marginBottom: '4px' }}>
                    Brouillon
                  </p>
                  <p style={{ fontSize: '12px', color: '#617589' }}>
                    Non visible par les étudiants
                  </p>
                </div>
              </label>

              <label style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: formData.status === 'published' ? '2px solid #2b8cee' : '2px solid #dbe0e6',
                backgroundColor: formData.status === 'published' ? 'rgba(43, 140, 238, 0.05)' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === 'published'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontWeight: '600', fontSize: '14px', color: '#111418', marginBottom: '4px' }}>
                    Publié
                  </p>
                  <p style={{ fontSize: '12px', color: '#617589' }}>
                    Visible et accessible
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: '#2b8cee',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Création...' : 'Créer le devoir'}
            </button>
            {classroomIdFromUrl ? (
              <Link
                href={`/teacher/classrooms/${classroomIdFromUrl}`}
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#617589',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                Annuler
              </Link>
            ) : (
              <Link
                href="/teacher/assignments"
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#617589',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                Annuler
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
