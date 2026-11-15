'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string
  display_name: string
  role: 'student' | 'teacher'
  avatar_url: string | null
  bio: string | null
  phone: string | null
  location: string | null
  level: string | null
  experience: string | null
  subjects: string[] | null
  created_at: string
}

const SCHOOL_LEVELS = [
  { value: '6eme', label: '6ème' },
  { value: '5eme', label: '5ème' },
  { value: '4eme', label: '4ème' },
  { value: '3eme', label: '3ème' },
  { value: '2nde', label: '2nde' },
  { value: '1ere', label: '1ère' },
  { value: 'terminale', label: 'Terminale' },
  { value: 'bts1', label: 'BTS 1ère année' },
  { value: 'bts2', label: 'BTS 2ème année' },
  { value: 'licence1', label: 'Licence 1' },
  { value: 'licence2', label: 'Licence 2' },
  { value: 'licence3', label: 'Licence 3' },
  { value: 'master1', label: 'Master 1' },
  { value: 'master2', label: 'Master 2' },
  { value: 'autre', label: 'Autre' },
]

const AVAILABLE_SUBJECTS = [
  'Mathématiques', 'Physique-Chimie', 'SVT', 'Français', 
  'Histoire-Géographie', 'Anglais', 'Espagnol', 'Allemand',
  'Philosophie', 'SES', 'NSI', 'Informatique', 'Économie',
  'Comptabilité', 'Droit', 'Marketing', 'Management'
]

const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: 'Moins d\'1 an' },
  { value: '1-3', label: '1 à 3 ans' },
  { value: '3-5', label: '3 à 5 ans' },
  { value: '5-10', label: '5 à 10 ans' },
  { value: '10+', label: 'Plus de 10 ans' },
]

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  // Student specific
  const [level, setLevel] = useState('')
  
  // Teacher specific
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])

  // Portfolio
  const [presentationVideoUrl, setPresentationVideoUrl] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [courseExamples, setCourseExamples] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setDisplayName(data.display_name || '')
      setPhone(data.phone || '')
      setLocation(data.location || '')
      setAvatarUrl(data.avatar_url)
      setLevel(data.level || '')
      setBio(data.bio || '')
      setExperience(data.experience || '')
      setSubjects(data.subjects || [])

      // Portfolio
      setPresentationVideoUrl(data.presentation_video_url || '')
      setCourseExamples(data.course_examples || [])
      setAchievements(data.achievements || [])
    }

    setLoading(false)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    setError('')

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.warn('Avatar bucket upload failed:', uploadError)
      // Si le bucket n'existe pas, on sauvegarde en base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: base64 })
          .eq('id', profile.id)

        if (!updateError) {
          setAvatarUrl(base64)
          setSuccess('Photo de profil mise à jour ! (Base64)')
          setTimeout(() => setSuccess(''), 3000)
        } else {
          console.error('Avatar base64 update error:', updateError)
          setError(`Erreur avatar: ${updateError.message}`)
        }
        setUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id)

    if (!updateError) {
      setAvatarUrl(publicUrl)
      setSuccess('Photo de profil mise à jour !')
      setTimeout(() => setSuccess(''), 3000)
    }

    setUploadingAvatar(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setError('')
    setSuccess('')

    const supabase = createClient()
    
    const updateData: Record<string, unknown> = {
      display_name: displayName,
      phone,
      location,
    }

    if (profile.role === 'student') {
      updateData.level = level
    } else {
      updateData.bio = bio
      updateData.experience = experience
      updateData.subjects = subjects

      // Portfolio
      updateData.presentation_video_url = presentationVideoUrl
      updateData.course_examples = courseExamples
      updateData.achievements = achievements
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', profile.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      setError(`Erreur: ${updateError.message || 'Impossible de mettre à jour le profil'}`)
    } else {
      setSuccess('Profil mis à jour avec succès !')
      setTimeout(() => {
        setSuccess('')
        // Refresh profile data
        loadProfile()
      }, 2000)
    }

    setSaving(false)
  }

  const toggleSubject = (subject: string) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(s => s !== subject))
    } else {
      setSubjects([...subjects, subject])
    }
  }

  // Portfolio Functions
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingVideo(true)
    setError('')

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}/presentation-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('teacher-presentations')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Video upload error:', uploadError)
      setError(`Erreur d'upload vidéo: ${uploadError.message}`)
      setUploadingVideo(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('teacher-presentations')
      .getPublicUrl(fileName)

    setPresentationVideoUrl(publicUrl)
    setSuccess('Vidéo uploadée ! Pensez à enregistrer le profil.')
    setTimeout(() => setSuccess(''), 3000)
    setUploadingVideo(false)
  }

  const addCourseExample = () => {
    const title = prompt('Titre du cours :')
    if (!title) return

    const description = prompt('Description :')
    if (!description) return

    const duration = prompt('Durée (ex: 45 minutes) :')

    setCourseExamples([...courseExamples, { title, description, duration }])
  }

  const removeCourseExample = (index: number) => {
    setCourseExamples(courseExamples.filter((_, i) => i !== index))
  }

  const addAchievement = () => {
    const title = prompt('Titre de la réalisation :')
    if (!title) return

    const description = prompt('Description :')
    if (!description) return

    const icon = prompt('Emoji (ex: 🎓) :') || '🎖️'
    const date = prompt('Date (ex: Juin 2020) :')

    setAchievements([...achievements, { title, description, icon, date }])
  }

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index))
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const getLevelLabel = (value: string) => {
    return SCHOOL_LEVELS.find(l => l.value === value)?.label || value
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Chargement du profil...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#6b7280' }}>Profil non trouvé</p>
        <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
          Se connecter
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link 
          href={profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6b7280', textDecoration: 'none', fontSize: '14px', marginBottom: '16px' }}
        >
          <span>←</span> Retour au tableau de bord
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
          {profile.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'} Modifier mon profil
        </h1>
        <p style={{ color: '#6b7280', fontSize: '15px' }}>
          {profile.role === 'teacher' 
            ? 'Complétez votre profil pour attirer plus d\'élèves'
            : 'Complétez votre profil pour une meilleure expérience'
          }
        </p>
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
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }} className="profile-grid">
        {/* Left Column - Avatar */}
        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', position: 'sticky', top: '100px' }}>
            {/* Avatar */}
            <div 
              onClick={handleAvatarClick}
              style={{ 
                width: '140px', 
                height: '140px', 
                borderRadius: '50%', 
                margin: '0 auto 20px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                border: '4px solid #e5e7eb',
                background: avatarUrl ? `url(${avatarUrl}) center/cover` : `linear-gradient(135deg, ${profile.role === 'teacher' ? '#8b5cf6, #a855f7' : '#3b82f6, #60a5fa'})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {!avatarUrl && (
                <span style={{ fontSize: '48px', color: 'white', fontWeight: '700' }}>
                  {getInitials(displayName || 'U')}
                </span>
              )}
              
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s ease'
              }} className="avatar-overlay">
                {uploadingAvatar ? (
                  <div style={{ width: '32px', height: '32px', border: '3px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>📷</span>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>Modifier</span>
                  </>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
              {displayName || 'Utilisateur'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
              {profile.email}
            </p>

            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              backgroundColor: profile.role === 'teacher' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '20px' 
            }}>
              <span style={{ fontSize: '16px' }}>{profile.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: profile.role === 'teacher' ? '#8b5cf6' : '#3b82f6' }}>
                {profile.role === 'teacher' ? 'Professeur' : 'Élève'}
              </span>
            </div>

            {profile.role === 'student' && level && (
              <div style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#fef3c7', borderRadius: '20px', display: 'inline-block' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>
                  📚 {getLevelLabel(level)}
                </span>
              </div>
            )}

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Form */}
        <div>
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>👤</span> Informations personnelles
              </h2>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                    Nom complet <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Votre nom complet"
                    required
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                      📞 Téléphone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                      📍 Ville
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Paris, France"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Student: School Level */}
            {profile.role === 'student' && (
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🎓</span> Niveau scolaire
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                  Indiquez votre niveau actuel pour des recommandations adaptées
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {SCHOOL_LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setLevel(lvl.value)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: level === lvl.value ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        backgroundColor: level === lvl.value ? 'rgba(59, 130, 246, 0.1)' : 'white',
                        color: level === lvl.value ? '#3b82f6' : '#374151',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {level === lvl.value && '✓ '}{lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher: Bio & Experience */}
            {profile.role === 'teacher' && (
              <>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>📝</span> Présentation
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                    Présentez-vous pour donner envie aux élèves de vous choisir
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                      Bio / Description
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Présentez-vous : votre parcours, votre méthode d'enseignement, ce qui vous motive..."
                      rows={5}
                      maxLength={500}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: '1.6'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', textAlign: 'right' }}>
                      {bio.length}/500 caractères
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                      ⏱️ Expérience d'enseignement
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                      {EXPERIENCE_OPTIONS.map((exp) => (
                        <button
                          key={exp.value}
                          type="button"
                          onClick={() => setExperience(exp.value)}
                          style={{
                            padding: '12px 8px',
                            borderRadius: '10px',
                            border: experience === exp.value ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                            backgroundColor: experience === exp.value ? 'rgba(139, 92, 246, 0.1)' : 'white',
                            color: experience === exp.value ? '#8b5cf6' : '#374151',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>📚</span> Matières enseignées
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                    Sélectionnez toutes les matières que vous pouvez enseigner
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {AVAILABLE_SUBJECTS.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '25px',
                          border: subjects.includes(subject) ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                          backgroundColor: subjects.includes(subject) ? 'rgba(139, 92, 246, 0.1)' : 'white',
                          color: subjects.includes(subject) ? '#8b5cf6' : '#6b7280',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {subjects.includes(subject) && '✓ '}{subject}
                      </button>
                    ))}
                  </div>

                  {subjects.length > 0 && (
                    <p style={{ fontSize: '13px', color: '#8b5cf6', marginTop: '16px', fontWeight: '500' }}>
                      ✓ {subjects.length} matière(s) sélectionnée(s)
                    </p>
                  )}
                </div>

                {/* Portfolio Section */}
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>📂</span> Portfolio Enseignant
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Enrichissez votre profil avec une vidéo, des exemples de cours et vos réalisations
                  </p>

                  {/* Vidéo de Présentation */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                      🎥 Vidéo de Présentation
                    </label>

                    {presentationVideoUrl ? (
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', background: '#000', marginBottom: '12px' }}>
                          <video
                            controls
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            src={presentationVideoUrl}
                          >
                            Votre navigateur ne supporte pas la lecture vidéo.
                          </video>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Supprimer cette vidéo ?')) {
                              setPresentationVideoUrl('')
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Supprimer la vidéo
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                          style={{
                            width: '100%',
                            padding: '24px',
                            border: '2px dashed #d1d5db',
                            borderRadius: '12px',
                            backgroundColor: '#f9fafb',
                            cursor: uploadingVideo ? 'wait' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {uploadingVideo ? (
                            <>
                              <div style={{ width: '32px', height: '32px', border: '3px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                              <span style={{ color: '#6b7280', fontSize: '14px' }}>Upload en cours...</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '40px' }}>🎬</span>
                              <span style={{ color: '#374151', fontWeight: '600', fontSize: '15px' }}>Cliquez pour uploader une vidéo</span>
                              <span style={{ color: '#9ca3af', fontSize: '13px' }}>MP4, WebM, MOV (Max 100MB)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Exemples de Cours */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                        📚 Exemples de Cours
                      </label>
                      <button
                        type="button"
                        onClick={addCourseExample}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        + Ajouter
                      </button>
                    </div>

                    {courseExamples.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {courseExamples.map((example, idx) => (
                          <div key={idx} style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                  {example.title}
                                </h4>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                  {example.description}
                                </p>
                                {example.duration && (
                                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    ⏱️ {example.duration}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCourseExample(idx)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'white',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#9ca3af', fontSize: '13px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                        Aucun exemple ajouté
                      </p>
                    )}
                  </div>

                  {/* Réalisations */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                        🏆 Réalisations & Certifications
                      </label>
                      <button
                        type="button"
                        onClick={addAchievement}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        + Ajouter
                      </button>
                    </div>

                    {achievements.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {achievements.map((achievement, idx) => (
                          <div key={idx} style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', gap: '10px' }}>
                            <div style={{ fontSize: '24px', flexShrink: 0 }}>
                              {achievement.icon || '🎖️'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                {achievement.title}
                              </h4>
                              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                {achievement.description}
                              </p>
                              {achievement.date && (
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                                  📅 {achievement.date}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAchievement(idx)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: 'white',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                alignSelf: 'flex-start'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#9ca3af', fontSize: '13px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                        Aucune réalisation ajoutée
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Email (read-only) */}
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>📧 Adresse email</p>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>{profile.email}</p>
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#e5e7eb', padding: '4px 10px', borderRadius: '6px' }}>Non modifiable</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <Link
                href={profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '14px 32px',
                  background: saving ? '#9ca3af' : `linear-gradient(135deg, ${profile.role === 'teacher' ? '#8b5cf6, #a855f7' : '#3b82f6, #8b5cf6'})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: saving ? 'wait' : 'pointer',
                  boxShadow: saving ? 'none' : '0 8px 30px rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {saving ? (
                  <>
                    <span style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Enregistrement...
                  </>
                ) : (
                  <>💾 Enregistrer</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .avatar-overlay { opacity: 0; }
        div:hover > .avatar-overlay { opacity: 1 !important; }
        
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}