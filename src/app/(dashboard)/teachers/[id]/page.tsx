'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TeacherProfile } from '@/types/teacher-profile';
import { TEACHING_MODES } from '@/types/teacher-profile';

// Solution pour l'erreur d'import de TeacherReview
interface TeacherReview {
  id: string;
  teacher_id: string;
  student_id: string;
  rating: number;
  comment: string;
  created_at: string;
  student?: {
    display_name: string;
    avatar_url: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherPublicProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any | null>(null); // Utilisation de any temporairement pour accepter les nouveaux champs
  const [reviews, setReviews] = useState<TeacherReview[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeacher();
    fetchReviews();
  }, [id]);

  const fetchTeacher = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'teacher')
        .single();

      if (fetchError) throw fetchError;
      setTeacher(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('teacher_reviews')
        .select(`
          *,
          student:student_id (
            display_name,
            avatar_url
          )
        `)
        .eq('teacher_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;
      setReviews((data as unknown as TeacherReview[]) || []);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleContact = () => {
    alert('Fonctionnalité de messagerie à venir !');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Chargement...</div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>😕</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Professeur introuvable</div>
        <button onClick={() => router.push('/find-teachers')} style={{ marginTop: '20px', padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Retour à la recherche
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => router.back()} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '30px' }}>
        ← Retour
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
        {/* Sidebar */}
        <div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: teacher.avatar_url ? `url(${teacher.avatar_url}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '0 auto 20px',
            }} />

            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '5px' }}>
              {teacher.display_name}
              {/* Correction 1: Vérification sécurisée pour 'verified' */}
              {teacher?.verified && <span style={{ marginLeft: '8px', fontSize: '24px' }}>✓</span>}
            </h1>

            <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '15px' }}>📍 {teacher.city}</div>

            {/* Correction 2: rating can be null */}
            {(teacher.rating ?? 0) > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2563eb' }}>
                  {Number(teacher.rating).toFixed(1)} ⭐
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>{teacher.total_reviews} avis</div>
              </div>
            )}

            {teacher.hourly_rate && (
              <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2563eb' }}>{teacher.hourly_rate}€</div>
              </div>
            )}

            <button onClick={handleContact} style={{ width: '100%', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', marginBottom: '10px' }}>
              💬 Contacter
            </button>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Informations Rapides</h3>

            {/* Correction 3: total_students check */}
            {(teacher?.total_students ?? 0) > 0 && (
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>👥</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>Élèves</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{teacher.total_students} élèves accompagnés</div>
                </div>
              </div>
            )}
            
            {/* ... Reste des infos rapides ... */}
          </div>
        </div>

        {/* Main Content */}
        <div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>À Propos</h2>
            <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {teacher.bio || 'Aucune biographie disponible.'}
            </p>
          </div>

          {/* Correction 4: Optional Chaining sur subjects, levels, et teaching_mode */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>Matières Enseignées</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {teacher.subjects?.map((subject: string) => (
                <span key={subject} style={{ padding: '8px 16px', background: '#dbeafe', color: '#1e40af', borderRadius: '20px', fontSize: '14px' }}>
                  {subject}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>Niveaux Enseignés</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {teacher.levels?.map((level: string) => (
                <span key={level} style={{ padding: '8px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '20px', fontSize: '14px' }}>
                  {level}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>Modes d'Enseignement</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {TEACHING_MODES.map(mode => (
                teacher.teaching_mode?.includes(mode.value) && (
                  <div key={mode.value} style={{ padding: '20px', background: '#f3e8ff', border: '2px solid #8b5cf6', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{mode.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b21a8' }}>{mode.label}</div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Portfolio Section */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📂</span> Portfolio Enseignant
            </h2>

            {/* Vidéo de Présentation */}
            {teacher.presentation_video_url && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  🎥 Vidéo de Présentation
                </h3>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', background: '#000' }}>
                  <video
                    controls
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    src={teacher.presentation_video_url}
                  >
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                </div>
              </div>
            )}

            {/* Exemples de Cours */}
            {teacher.course_examples && teacher.course_examples.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  📚 Exemples de Cours
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                  {teacher.course_examples.map((example: any, idx: number) => (
                    <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.transform = 'translateY(-4px)';
                           e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.transform = 'translateY(0)';
                           e.currentTarget.style.boxShadow = 'none';
                         }}>
                      {example.thumbnail && (
                        <div style={{ width: '100%', height: '140px', background: `url(${example.thumbnail}) center/cover`, backgroundColor: '#f3f4f6' }} />
                      )}
                      <div style={{ padding: '15px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
                          {example.title || 'Exemple de cours'}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5', marginBottom: '10px' }}>
                          {example.description || 'Description du cours'}
                        </p>
                        {example.duration && (
                          <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>⏱️</span> {example.duration}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Réalisations */}
            {teacher.achievements && teacher.achievements.length > 0 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  🏆 Réalisations & Certifications
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {teacher.achievements.map((achievement: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '15px', padding: '15px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                      <div style={{ fontSize: '32px', flexShrink: 0 }}>
                        {achievement.icon || '🎖️'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: '#111827' }}>
                          {achievement.title}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5', marginBottom: '6px' }}>
                          {achievement.description}
                        </p>
                        {achievement.date && (
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            📅 {achievement.date}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message si portfolio vide */}
            {!teacher.presentation_video_url && (!teacher.course_examples || teacher.course_examples.length === 0) && (!teacher.achievements || teacher.achievements.length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📂</div>
                <p>Ce professeur n'a pas encore ajouté de portfolio.</p>
              </div>
            )}
          </div>

          {/* Avis Section */}
          {reviews.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                ⭐ Avis des Étudiants ({reviews.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{ padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: review.student?.avatar_url ? `url(${review.student.avatar_url}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{review.student?.display_name || 'Étudiant'}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(review.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < review.rating ? '#fbbf24' : '#d1d5db', fontSize: '18px' }}>★</span>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}