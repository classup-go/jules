'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Types
interface TeacherProfile {
  id: string
  email: string
  display_name: string
  role: 'teacher'
  avatar_url: string | null
  bio: string | null
  phone: string | null
  city: string | null
  postal_code: string | null
  address: string | null
  experience: string | null
  subjects: string[] | null
  levels: string[] | null
  teaching_mode: string[] | null
  hourly_rate: number | null
  can_travel: boolean
  travel_distance: number | null
  specialties: string[] | null
  certifications: string[] | null
  languages: string[] | null
  is_available: boolean
  rating: number | null
  total_reviews: number
  created_at: string
}

interface Classroom {
  id: string
  title: string
  description: string
  subject: string
  level: string
  price: number
  thumbnail_url: string | null
  is_published: boolean
  enrolled_count: number
  created_at: string
}

// Constants
const SUBJECTS = [
  'Mathématiques', 'Physique-Chimie', 'SVT', 'Français',
  'Histoire-Géographie', 'Anglais', 'Espagnol', 'Allemand',
  'Philosophie', 'SES', 'NSI', 'Informatique', 'Économie',
  'Comptabilité', 'Droit', 'Marketing', 'Management'
]

const LEVELS = [
  '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale',
  'BTS', 'Licence', 'Master', 'Prépa', 'Adulte'
]

const TEACHING_MODES = [
  { value: 'online', label: 'En ligne', icon: '💻' },
  { value: 'in_person', label: 'À domicile', icon: '🏠' },
  { value: 'both', label: 'Les deux', icon: '🔄' }
]

const EXPERIENCES = [
  'Moins d\'1 an', '1 à 3 ans', '3 à 5 ans', '5 à 10 ans', 'Plus de 10 ans'
]

export default function TeacherProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [currentStep, setCurrentStep] = useState(1)
  
  // Profile data
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [stats, setStats] = useState({ students: 0, courses: 0, revenue: 0 })
  
  // Form data
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    city: '',
    postal_code: '',
    address: '',
    bio: '',
    experience: '',
    subjects: [] as string[],
    levels: [] as string[],
    teaching_mode: [] as string[],
    hourly_rate: '',
    can_travel: false,
    travel_distance: '',
    specialties: [] as string[],
    certifications: [] as string[],
    languages: ['Français'] as string[],
    is_available: true
  })
  
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const [newLanguage, setNewLanguage] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFormData({
          display_name: profileData.display_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          postal_code: profileData.postal_code || '',
          address: profileData.address || '',
          bio: profileData.bio || '',
          experience: profileData.experience || '',
          subjects: profileData.subjects || [],
          levels: profileData.levels || [],
          teaching_mode: profileData.teaching_mode || [],
          hourly_rate: profileData.hourly_rate ? String(profileData.hourly_rate) : '',
          can_travel: profileData.can_travel || false,
          travel_distance: profileData.travel_distance ? String(profileData.travel_distance) : '',
          specialties: profileData.specialties || [],
          certifications: profileData.certifications || [],
          languages: profileData.languages || ['Français'],
          is_available: profileData.is_available ?? true
        })
      }

      // Load classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (classroomsData) {
        setClassrooms(classroomsData)
        
        // Calculate stats
        const totalStudents = classroomsData.reduce((acc, c) => acc + (c.enrolled_count || 0), 0)
        const totalRevenue = classroomsData.reduce((acc, c) => acc + ((c.enrolled_count || 0) * (c.price || 0)), 0)
        
        setStats({
          students: totalStudents,
          courses: classroomsData.length,
          revenue: totalRevenue
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    setError('')

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`

      // Try storage upload first
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      let avatarUrl: string

      if (uploadError) {
        // Fallback to base64
        const reader = new FileReader()
        avatarUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        avatarUrl = publicUrl
      }

      // Update profile
      await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)

      setProfile({ ...profile, avatar_url: avatarUrl })
      setSuccess('Photo mise à jour !')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    // Validation
    if (!formData.display_name) return setError('Le nom est requis')
    if (!formData.bio) return setError('La biographie est requise')
    if (formData.subjects.length === 0) return setError('Sélectionnez au moins une matière')
    if (formData.levels.length === 0) return setError('Sélectionnez au moins un niveau')
    if (!formData.hourly_rate) return setError('Le tarif horaire est requis')

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: formData.display_name,
          phone: formData.phone,
          city: formData.city,
          postal_code: formData.postal_code,
          address: formData.address,
          bio: formData.bio,
          experience: formData.experience,
          subjects: formData.subjects,
          levels: formData.levels,
          teaching_mode: formData.teaching_mode,
          hourly_rate: parseFloat(formData.hourly_rate),
          can_travel: formData.can_travel,
          travel_distance: formData.travel_distance ? parseInt(formData.travel_distance) : null,
          specialties: formData.specialties,
          certifications: formData.certifications,
          languages: formData.languages,
          is_available: formData.is_available
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSuccess('Profil sauvegardé !')
      await loadProfile()
      setActiveTab('preview')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item))
    } else {
      setter([...array, item])
    }
  }

  const addToArray = (value: string, array: string[], setter: (arr: string[]) => void, clearInput: () => void) => {
    if (value.trim() && !array.includes(value.trim())) {
      setter([...array, value.trim()])
      clearInput()
    }
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const getCompletionPercentage = () => {
    let completed = 0
    const total = 10
    if (formData.display_name) completed++
    if (formData.phone) completed++
    if (formData.city) completed++
    if (formData.bio) completed++
    if (formData.experience) completed++
    if (formData.subjects.length > 0) completed++
    if (formData.levels.length > 0) completed++
    if (formData.teaching_mode.length > 0) completed++
    if (formData.hourly_rate) completed++
    if (formData.specialties.length > 0 || formData.certifications.length > 0) completed++
    return Math.round((completed / total) * 100)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Chargement du profil...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) return null

  const steps = [
    { number: 1, title: 'Informations', icon: '👤' },
    { number: 2, title: 'Enseignement', icon: '📚' },
    { number: 3, title: 'Tarifs', icon: '💰' },
    { number: 4, title: 'Qualifications', icon: '🎓' }
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with tabs */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
              👨‍🏫 Mon Profil Professeur
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>
              Votre vitrine professionnelle visible par les élèves
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '12px' }}>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'preview' ? 'white' : 'transparent',
                color: activeTab === 'preview' ? '#8b5cf6' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: activeTab === 'preview' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              👁️ Aperçu
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === 'edit' ? 'white' : 'transparent',
                color: activeTab === 'edit' ? '#8b5cf6' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: activeTab === 'edit' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              ✏️ Modifier
            </button>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ color: '#16a34a', fontWeight: '500' }}>{success}</span>
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontWeight: '500' }}>{error}</span>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
        )}
      </div>

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <>
          {/* Profile Header Card */}
          <div style={{ 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)', 
            borderRadius: '24px', 
            overflow: 'hidden',
            marginBottom: '32px',
            position: 'relative'
          }}>
            {/* Background pattern */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', transform: 'translate(30%, -30%)' }} />
            
            <div style={{ padding: '40px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div 
                  onClick={handleAvatarClick}
                  style={{ 
                    width: '140px', 
                    height: '140px', 
                    borderRadius: '20px',
                    border: '4px solid rgba(255,255,255,0.3)',
                    background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {!profile.avatar_url && (
                    <span style={{ fontSize: '48px', color: 'white', fontWeight: '700' }}>
                      {getInitials(profile.display_name)}
                    </span>
                  )}
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-hover">
                    {uploadingAvatar ? (
                      <div style={{ width: '32px', height: '32px', border: '3px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>📷 Modifier</span>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'white', margin: 0 }}>
                      {profile.display_name}
                    </h2>
                    {profile.is_available && (
                      <span style={{ padding: '6px 14px', backgroundColor: '#10b981', borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: 'white' }}>
                        ✓ Disponible
                      </span>
                    )}
                  </div>
                  
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', marginBottom: '16px' }}>
                    {profile.city && `📍 ${profile.city}`} {profile.experience && `• ⏱️ ${profile.experience}`}
                  </p>

                  {profile.bio && (
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.6', maxWidth: '600px', marginBottom: '20px' }}>
                      {profile.bio.length > 200 ? profile.bio.substring(0, 200) + '...' : profile.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>{stats.courses}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Cours</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>{stats.students}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Élèves</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>
                        {profile.rating?.toFixed(1) || '—'}
                      </p>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Note ⭐</p>
                    </div>
                    {profile.hourly_rate && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>{profile.hourly_rate}€</p>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>/ heure</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
            {/* Main Content */}
            <div>
              {/* Subjects & Levels */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>
                  📚 Matières enseignées
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                  {profile.subjects?.length ? profile.subjects.map((subject, i) => (
                    <span key={i} style={{ padding: '8px 16px', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '20px', fontSize: '14px', fontWeight: '500', color: '#8b5cf6' }}>
                      {subject}
                    </span>
                  )) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Aucune matière renseignée</span>
                  )}
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
                  🎯 Niveaux enseignés
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {profile.levels?.length ? profile.levels.map((level, i) => (
                    <span key={i} style={{ padding: '8px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', fontSize: '14px', fontWeight: '500', color: '#10b981' }}>
                      {level}
                    </span>
                  )) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Aucun niveau renseigné</span>
                  )}
                </div>
              </div>

              {/* Courses */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                    🎓 Mes Cours ({classrooms.length})
                  </h3>
                  <Link href="/teacher/classrooms/new" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                    + Créer un cours
                  </Link>
                </div>

                {classrooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ fontSize: '48px', marginBottom: '16px' }}>📚</p>
                    <p style={{ color: '#6b7280', marginBottom: '16px' }}>Vous n'avez pas encore créé de cours</p>
                    <Link href="/teacher/classrooms/new" style={{ display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: '600' }}>
                      Créer mon premier cours
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {classrooms.slice(0, 4).map((classroom) => (
                      <Link
                        key={classroom.id}
                        href={`/teacher/classrooms/${classroom.id}`}
                        style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s' }}
                      >
                        <div style={{ width: '80px', height: '60px', borderRadius: '8px', backgroundColor: '#e5e7eb', backgroundImage: classroom.thumbnail_url ? `url(${classroom.thumbnail_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {!classroom.thumbnail_url && <span style={{ fontSize: '24px' }}>📚</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{classroom.title}</h4>
                          <p style={{ fontSize: '13px', color: '#6b7280' }}>
                            {classroom.subject} • {classroom.level} • {classroom.enrolled_count || 0} élèves
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '16px', fontWeight: '700', color: '#8b5cf6' }}>{classroom.price}€</p>
                          <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: classroom.is_published ? '#dcfce7' : '#fef3c7', color: classroom.is_published ? '#16a34a' : '#d97706', borderRadius: '4px' }}>
                            {classroom.is_published ? 'Publié' : 'Brouillon'}
                          </span>
                        </div>
                      </Link>
                    ))}
                    
                    {classrooms.length > 4 && (
                      <Link href="/teacher/classrooms" style={{ display: 'block', textAlign: 'center', padding: '12px', color: '#8b5cf6', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>
                        Voir tous mes cours ({classrooms.length}) →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Quick Actions */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>⚡ Actions rapides</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setActiveTab('edit')} style={{ width: '100%', padding: '12px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                    ✏️ Modifier le profil
                  </button>
                  <Link href="/teacher/classrooms/new" style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                    📚 Créer un cours
                  </Link>
                  <Link href="/teacher/dashboard" style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                    📊 Tableau de bord
                  </Link>
                </div>
              </div>

              {/* Teaching Modes */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>💼 Modalités</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {profile.teaching_mode?.map((mode, i) => {
                    const modeInfo = TEACHING_MODES.find(m => m.value === mode)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                        <span style={{ fontSize: '24px' }}>{modeInfo?.icon || '📍'}</span>
                        <span style={{ fontWeight: '500', color: '#374151' }}>{modeInfo?.label || mode}</span>
                      </div>
                    )
                  })}
                  {profile.can_travel && profile.travel_distance && (
                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                      🚗 Déplacement jusqu'à {profile.travel_distance} km
                    </p>
                  )}
                </div>
              </div>

              {/* Certifications */}
              {(profile.certifications?.length || profile.specialties?.length) && (
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>🎓 Qualifications</h3>
                  {profile.certifications?.map((cert, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#10b981' }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#374151' }}>{cert}</span>
                    </div>
                  ))}
                  {profile.specialties?.length > 0 && (
                    <>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '16px', marginBottom: '8px' }}>Spécialités :</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profile.specialties.map((spec, i) => (
                          <span key={i} style={{ padding: '4px 10px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Languages */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>🌍 Langues</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {profile.languages?.map((lang, i) => (
                    <span key={i} style={{ padding: '6px 12px', backgroundColor: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EDIT TAB */}
      {activeTab === 'edit' && (
        <>
          {/* Progress Bar */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Complétion du profil</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#8b5cf6' }}>{getCompletionPercentage()}%</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${getCompletionPercentage()}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a855f7)', transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Steps Navigation */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
            {steps.map(step => (
              <button
                key={step.number}
                onClick={() => setCurrentStep(step.number)}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '16px',
                  background: currentStep === step.number ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'white',
                  color: currentStep === step.number ? 'white' : '#374151',
                  border: currentStep === step.number ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: currentStep === step.number ? '0 8px 25px rgba(139, 92, 246, 0.3)' : 'none'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{step.icon}</div>
                <div>{step.title}</div>
              </button>
            ))}
          </div>

          {/* Step Content */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            {/* Step 1: Informations */}
            {currentStep === 1 && (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>👤 Informations de base</h2>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Nom complet *</label>
                    <input type="text" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} placeholder="Jean Dupont" style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Téléphone</label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="06 12 34 56 78" style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Ville *</label>
                      <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Paris" style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Biographie *</label>
                    <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Présentez-vous : votre parcours, votre pédagogie..." rows={5} style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{formData.bio.length}/500 caractères</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Expérience</label>
                    <select value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }}>
                      <option value="">Sélectionnez</option>
                      {EXPERIENCES.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Enseignement */}
            {currentStep === 2 && (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>📚 Matières et niveaux</h2>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Matières enseignées * ({formData.subjects.length})</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {SUBJECTS.map(subject => (
                      <button key={subject} type="button" onClick={() => toggleArrayItem(formData.subjects, subject, (arr) => setFormData({ ...formData, subjects: arr }))} style={{ padding: '10px 16px', backgroundColor: formData.subjects.includes(subject) ? 'rgba(139, 92, 246, 0.1)' : 'white', color: formData.subjects.includes(subject) ? '#8b5cf6' : '#6b7280', border: `2px solid ${formData.subjects.includes(subject) ? '#8b5cf6' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', fontWeight: formData.subjects.includes(subject) ? '600' : '400', fontSize: '14px' }}>
                        {formData.subjects.includes(subject) && '✓ '}{subject}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Niveaux enseignés * ({formData.levels.length})</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {LEVELS.map(level => (
                      <button key={level} type="button" onClick={() => toggleArrayItem(formData.levels, level, (arr) => setFormData({ ...formData, levels: arr }))} style={{ padding: '10px 16px', backgroundColor: formData.levels.includes(level) ? 'rgba(16, 185, 129, 0.1)' : 'white', color: formData.levels.includes(level) ? '#10b981' : '#6b7280', border: `2px solid ${formData.levels.includes(level) ? '#10b981' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', fontWeight: formData.levels.includes(level) ? '600' : '400', fontSize: '14px' }}>
                        {formData.levels.includes(level) && '✓ '}{level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Modes d'enseignement</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {TEACHING_MODES.map(mode => (
                      <button key={mode.value} type="button" onClick={() => toggleArrayItem(formData.teaching_mode, mode.value, (arr) => setFormData({ ...formData, teaching_mode: arr }))} style={{ padding: '20px', backgroundColor: formData.teaching_mode.includes(mode.value) ? 'rgba(139, 92, 246, 0.1)' : 'white', border: `2px solid ${formData.teaching_mode.includes(mode.value) ? '#8b5cf6' : '#e5e7eb'}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{mode.icon}</div>
                        <div style={{ fontWeight: '600', color: formData.teaching_mode.includes(mode.value) ? '#8b5cf6' : '#374151' }}>{mode.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Tarifs */}
            {currentStep === 3 && (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>💰 Tarifs & modalités</h2>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Tarif horaire * (€)</label>
                  <input type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} placeholder="25" min="0" style={{ width: '200px', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '18px', fontWeight: '600', boxSizing: 'border-box' }} />
                  <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>Prix moyen : 20-40€/h</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
                    <input type="checkbox" checked={formData.can_travel} onChange={(e) => setFormData({ ...formData, can_travel: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                    <div>
                      <p style={{ fontWeight: '600' }}>Je peux me déplacer</p>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>Au domicile des élèves</p>
                    </div>
                  </label>
                  {formData.can_travel && (
                    <div style={{ marginTop: '16px', marginLeft: '32px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Distance max (km)</label>
                      <input type="number" value={formData.travel_distance} onChange={(e) => setFormData({ ...formData, travel_distance: e.target.value })} placeholder="10" style={{ width: '120px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
                    <input type="checkbox" checked={formData.is_available} onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                    <div>
                      <p style={{ fontWeight: '600' }}>Disponible pour de nouveaux élèves</p>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>Affiché sur votre profil public</p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* Step 4: Qualifications */}
            {currentStep === 4 && (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>🎓 Qualifications</h2>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Spécialités</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <input type="text" value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray(newSpecialty, formData.specialties, (arr) => setFormData({ ...formData, specialties: arr }), () => setNewSpecialty('')))} placeholder="Ex: Préparation Bac" style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px' }} />
                    <button type="button" onClick={() => addToArray(newSpecialty, formData.specialties, (arr) => setFormData({ ...formData, specialties: arr }), () => setNewSpecialty(''))} style={{ padding: '12px 20px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Ajouter</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.specialties.map((spec, i) => (
                      <span key={i} style={{ padding: '8px 14px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {spec}
                        <button onClick={() => setFormData({ ...formData, specialties: formData.specialties.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', fontSize: '16px' }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Diplômes & Certifications</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <input type="text" value={newCertification} onChange={(e) => setNewCertification(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray(newCertification, formData.certifications, (arr) => setFormData({ ...formData, certifications: arr }), () => setNewCertification('')))} placeholder="Ex: Master Mathématiques" style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px' }} />
                    <button type="button" onClick={() => addToArray(newCertification, formData.certifications, (arr) => setFormData({ ...formData, certifications: arr }), () => setNewCertification(''))} style={{ padding: '12px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Ajouter</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.certifications.map((cert, i) => (
                      <span key={i} style={{ padding: '8px 14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cert}
                        <button onClick={() => setFormData({ ...formData, certifications: formData.certifications.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', fontSize: '16px' }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Langues parlées</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <input type="text" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray(newLanguage, formData.languages, (arr) => setFormData({ ...formData, languages: arr }), () => setNewLanguage('')))} placeholder="Ex: Anglais" style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px' }} />
                    <button type="button" onClick={() => addToArray(newLanguage, formData.languages, (arr) => setFormData({ ...formData, languages: arr }), () => setNewLanguage(''))} style={{ padding: '12px 20px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Ajouter</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.languages.map((lang, i) => (
                      <span key={i} style={{ padding: '8px 14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {lang}
                        {formData.languages.length > 1 && (
                          <button onClick={() => setFormData({ ...formData, languages: formData.languages.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', fontSize: '16px' }}>×</button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)} disabled={currentStep === 1} style={{ padding: '14px 28px', backgroundColor: currentStep === 1 ? '#f3f4f6' : 'white', color: currentStep === 1 ? '#9ca3af' : '#374151', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: currentStep === 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                ← Précédent
              </button>
              {currentStep < 4 ? (
                <button onClick={() => setCurrentStep(currentStep + 1)} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 8px 25px rgba(139, 92, 246, 0.3)' }}>
                  Suivant →
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} style={{ padding: '14px 32px', background: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: saving ? 'wait' : 'pointer', fontWeight: '700', fontSize: '16px' }}>
                  {saving ? '⏳ Enregistrement...' : '✓ Enregistrer le profil'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .avatar-hover:hover { opacity: 1 !important; }
      `}</style>
    </div>
  )
}