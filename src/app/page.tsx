'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PricingCheckoutButton from '@/components/pricing/PricingCheckoutButton'

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
      if (window.scrollY > 400) setStatsVisible(true)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const subjects = [
    { name: 'Mathématiques', icon: '📐', color: '#3b82f6', students: '2.5k' },
    { name: 'Physique-Chimie', icon: '⚗️', color: '#8b5cf6', students: '1.8k' },
    { name: 'Français', icon: '📝', color: '#ec4899', students: '2.1k' },
    { name: 'Histoire-Géo', icon: '🗺️', color: '#f59e0b', students: '1.2k' },
    { name: 'Anglais', icon: '🌍', color: '#10b981', students: '1.9k' },
    { name: 'SVT', icon: '🌱', color: '#06b6d4', students: '980' },
    { name: 'Philosophie', icon: '💭', color: '#6366f1', students: '750' },
    { name: 'Informatique', icon: '💻', color: '#ef4444', students: '1.5k' },
  ]

  const features = [
    {
      icon: '🎥',
      title: 'Cours en direct',
      description: 'Sessions live interactives avec vos professeurs, tableau blanc partagé et chat en temps réel.',
      color: '#3b82f6'
    },
    {
      icon: '📚',
      title: 'Contenus illimités',
      description: 'Accédez à des milliers de cours, exercices, QCM et fiches de révision dans toutes les matières.',
      color: '#8b5cf6'
    },
    {
      icon: '🎯',
      title: 'Suivi personnalisé',
      description: 'Progression adaptée à votre niveau avec des recommandations intelligentes et des statistiques détaillées.',
      color: '#10b981'
    },
    {
      icon: '🏆',
      title: 'Certification',
      description: 'Obtenez des certificats reconnus à la fin de chaque parcours pour valoriser vos compétences.',
      color: '#f59e0b'
    },
    {
      icon: '💬',
      title: 'Messagerie directe',
      description: 'Communiquez directement avec vos professeurs pour poser vos questions à tout moment.',
      color: '#ec4899'
    },
    {
      icon: '📱',
      title: '100% Mobile',
      description: 'Apprenez où vous voulez, quand vous voulez, sur tous vos appareils.',
      color: '#06b6d4'
    },
  ]

  const testimonials = [
    {
      name: 'Marie L.',
      role: 'Élève Terminale S',
      avatar: '👩‍🎓',
      content: 'Grâce à Jules Class Go, j\'ai augmenté ma moyenne en maths de 8 à 15 ! Les cours en direct sont super bien expliqués.',
      rating: 5,
      subject: 'Mathématiques'
    },
    {
      name: 'Thomas D.',
      role: 'Élève Première',
      avatar: '👨‍🎓',
      content: 'La plateforme est intuitive et les QCM m\'aident vraiment à progresser. Je recommande à 100% !',
      rating: 5,
      subject: 'Physique-Chimie'
    },
    {
      name: 'Prof. Martin',
      role: 'Professeur certifié',
      avatar: '👨‍🏫',
      content: 'Un outil formidable pour enseigner. Le tableau blanc interactif et le suivi des élèves sont exceptionnels.',
      rating: 5,
      subject: 'Mathématiques'
    },
    {
      name: 'Sophie R.',
      role: 'Parent d\'élève',
      avatar: '👩',
      content: 'Mon fils a retrouvé confiance en lui. Les professeurs sont pédagogues et disponibles.',
      rating: 5,
      subject: 'Français'
    },
  ]

  const stats = [
    { value: '15K+', label: 'Élèves actifs', icon: '👨‍🎓' },
    { value: '500+', label: 'Professeurs certifiés', icon: '👨‍🏫' },
    { value: '50K+', label: 'Cours disponibles', icon: '📚' },
    { value: '98%', label: 'Taux de satisfaction', icon: '⭐' },
  ]

  const pricingPlans = [
    {
      name: 'Découverte',
      price: 'Gratuit',
      period: '',
      description: 'Pour découvrir la plateforme',
      features: [
        'Accès aux cours gratuits',
        '5 QCM par mois',
        'Forum communautaire',
        'Application mobile',
      ],
      cta: 'Commencer gratuitement',
      popular: false,
      color: '#6b7280'
    },
    {
      name: 'Essentiel',
      price: '19€',
      period: '/mois',
      description: 'Pour progresser efficacement',
      features: [
        'Tous les cours en ligne',
        'QCM illimités',
        'Fiches de révision',
        'Suivi de progression',
        'Support par email',
      ],
      cta: 'Essai gratuit 7 jours',
      popular: true,
      color: '#3b82f6'
    },
    {
      name: 'Premium',
      price: '39€',
      period: '/mois',
      description: 'Pour viser l\'excellence',
      features: [
        'Tout de l\'offre Essentiel',
        'Cours en direct illimités',
        'Professeur dédié',
        'Corrections personnalisées',
        'Certificats de réussite',
        'Support prioritaire 24/7',
      ],
      cta: 'Essai gratuit 14 jours',
      popular: false,
      color: '#8b5cf6'
    },
  ]

  const faqs = [
    {
      question: 'Comment fonctionne Jules Class Go ?',
      answer: 'Jules Class Go est une plateforme d\'apprentissage en ligne qui met en relation élèves et professeurs certifiés. Vous pouvez suivre des cours en direct, accéder à des contenus pédagogiques et progresser à votre rythme.'
    },
    {
      question: 'Les professeurs sont-ils qualifiés ?',
      answer: 'Tous nos professeurs sont certifiés et passent par un processus de sélection rigoureux. Ils sont diplômés dans leur domaine et ont une expérience pédagogique prouvée.'
    },
    {
      question: 'Puis-je annuler mon abonnement ?',
      answer: 'Oui, vous pouvez annuler votre abonnement à tout moment depuis votre espace personnel. Aucun engagement de durée n\'est requis.'
    },
    {
      question: 'Y a-t-il une application mobile ?',
      answer: 'Oui, Jules Class Go est disponible sur mobile via notre application web responsive. Vous pouvez apprendre sur smartphone, tablette ou ordinateur.'
    },
    {
      question: 'Comment devenir professeur sur la plateforme ?',
      answer: 'Pour devenir professeur, créez un compte enseignant et soumettez vos qualifications. Notre équipe vérifiera votre profil sous 48h.'
    },
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: isScrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        borderBottom: isScrolled ? '1px solid #e5e7eb' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ fontSize: '32px' }}>🎓</span>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>Jules Class Go</span>
          </Link>

          {/* Desktop Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-menu">
            <Link href="#matieres" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', fontSize: '15px' }}>Matières</Link>
            <Link href="#fonctionnalites" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', fontSize: '15px' }}>Fonctionnalités</Link>
            <Link href="#tarifs" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', fontSize: '15px' }}>Tarifs</Link>
            <Link href="#temoignages" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', fontSize: '15px' }}>Témoignages</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/login" style={{ padding: '10px 20px', color: '#374151', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Connexion
            </Link>
            <Link href="/register" style={{ 
              padding: '10px 24px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '50px', 
              fontWeight: '600', 
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}>
              S'inscrire gratuitement
            </Link>

            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'none', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px' }}
              className="mobile-menu-btn"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            backgroundColor: 'white', 
            borderBottom: '1px solid #e5e7eb',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <Link href="#matieres" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', padding: '8px 0' }}>Matières</Link>
            <Link href="#fonctionnalites" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', padding: '8px 0' }}>Fonctionnalités</Link>
            <Link href="#tarifs" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', padding: '8px 0' }}>Tarifs</Link>
            <Link href="#temoignages" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '500', padding: '8px 0' }}>Témoignages</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf4ff 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorations */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="hero-grid">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'rgba(59,130,246,0.1)', 
              padding: '8px 16px', 
              borderRadius: '50px', 
              marginBottom: '24px' 
            }}>
              <span style={{ fontSize: '14px' }}>🚀</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>+15 000 élèves nous font confiance</span>
            </div>

            <h1 style={{ 
              fontSize: '56px', 
              fontWeight: '800', 
              color: '#111827', 
              lineHeight: '1.1', 
              marginBottom: '24px',
              letterSpacing: '-0.02em'
            }} className="hero-title">
              Réussissez vos études avec les 
              <span style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                display: 'block'
              }}>
                meilleurs professeurs
              </span>
            </h1>

            <p style={{ 
              fontSize: '20px', 
              color: '#6b7280', 
              lineHeight: '1.6', 
              marginBottom: '32px',
              maxWidth: '500px'
            }}>
              Cours particuliers en ligne, exercices interactifs et suivi personnalisé. 
              Progressez rapidement du collège au supérieur.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <Link href="/register" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '50px',
                fontWeight: '700',
                fontSize: '16px',
                boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.3s ease'
              }}>
                Commencer gratuitement
                <span>→</span>
              </Link>
              <Link href="#demo" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                backgroundColor: 'white',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '50px',
                fontWeight: '600',
                fontSize: '16px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.3s ease'
              }}>
                <span>▶️</span>
                Voir la démo
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#fbbf24', fontSize: '20px' }}>★★★★★</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>4.9/5 (2,340 avis)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>✓</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Sans engagement</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div style={{ position: 'relative' }} className="hero-image">
            <div style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.12)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Mock interface */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📐</div>
                <div>
                  <p style={{ fontWeight: '700', color: '#111827', fontSize: '16px' }}>Cours de Mathématiques</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>Avec Prof. Dupont</p>
                </div>
                <div style={{ marginLeft: 'auto', backgroundColor: '#dcfce7', padding: '4px 12px', borderRadius: '20px' }}>
                  <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: '600' }}>🔴 En direct</span>
                </div>
              </div>

              {/* Video placeholder */}
              <div style={{ 
                backgroundColor: '#1f2937', 
                borderRadius: '16px', 
                height: '200px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, #3b82f6 0%, #8b5cf6 100%)', opacity: 0.9 }} />
                <div style={{ position: 'relative', textAlign: 'center', color: 'white' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎓</div>
                  <p style={{ fontWeight: '600' }}>Cours en direct</p>
                </div>
              </div>

              {/* Progress bars */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Progression</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>78%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Score QCM</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>92%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '92%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'float 3s ease-in-out infinite'
            }}>
              <span style={{ fontSize: '28px' }}>🏆</span>
              <div>
                <p style={{ fontWeight: '700', color: '#111827', fontSize: '14px' }}>+2 points</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Moyenne générale</p>
              </div>
            </div>

            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '-30px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'float 3s ease-in-out infinite 1.5s'
            }}>
              <span style={{ fontSize: '28px' }}>✅</span>
              <div>
                <p style={{ fontWeight: '700', color: '#111827', fontSize: '14px' }}>QCM réussi !</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>18/20 - Excellent</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '60px 24px', backgroundColor: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }} className="stats-grid">
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: '800', 
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects Section */}
      <section id="matieres" style={{ padding: '100px 24px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ 
              display: 'inline-block',
              padding: '8px 16px', 
              backgroundColor: 'rgba(59,130,246,0.1)', 
              borderRadius: '50px', 
              color: '#3b82f6', 
              fontWeight: '600', 
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              📚 Toutes les matières
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
              Trouvez le cours qu'il vous faut
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
              Du collège au supérieur, accédez à des cours de qualité dans toutes les matières
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }} className="subjects-grid">
            {subjects.map((subject, i) => (
              <Link
                key={i}
                href={`/search?subject=${subject.name}`}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  padding: '28px',
                  textDecoration: 'none',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  display: 'block'
                }}
                className="subject-card"
              >
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '16px', 
                  backgroundColor: `${subject.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  marginBottom: '16px'
                }}>
                  {subject.icon}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>{subject.name}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{subject.students} élèves</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" style={{ padding: '100px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ 
              display: 'inline-block',
              padding: '8px 16px', 
              backgroundColor: 'rgba(139,92,246,0.1)', 
              borderRadius: '50px', 
              color: '#8b5cf6', 
              fontWeight: '600', 
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              ✨ Fonctionnalités
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
              Tout pour votre réussite
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
              Des outils modernes et efficaces pour apprendre dans les meilleures conditions
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }} className="features-grid">
            {features.map((feature, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '24px',
                  padding: '36px',
                  transition: 'all 0.3s ease',
                  border: '1px solid transparent'
                }}
                className="feature-card"
              >
                <div style={{ 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '20px', 
                  backgroundColor: `${feature.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  marginBottom: '24px'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>{feature.title}</h3>
                <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ 
              display: 'inline-block',
              padding: '8px 16px', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: '50px', 
              color: '#fbbf24', 
              fontWeight: '600', 
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              🎯 Comment ça marche ?
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>
              3 étapes pour réussir
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }} className="steps-grid">
            {[
              { step: '1', icon: '📝', title: 'Inscrivez-vous', desc: 'Créez votre compte gratuitement en 30 secondes' },
              { step: '2', icon: '🎯', title: 'Choisissez vos cours', desc: 'Sélectionnez les matières et les professeurs' },
              { step: '3', icon: '🚀', title: 'Progressez', desc: 'Apprenez à votre rythme et atteignez vos objectifs' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  margin: '0 auto 24px',
                  boxShadow: '0 20px 40px rgba(59,130,246,0.3)'
                }}>
                  {item.icon}
                </div>
                <div style={{ 
                  position: 'absolute',
                  top: '0',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(-10px)',
                  backgroundColor: '#fbbf24',
                  color: '#111827',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '16px'
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ fontSize: '16px', color: '#9ca3af' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="temoignages" style={{ padding: '100px 24px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ 
              display: 'inline-block',
              padding: '8px 16px', 
              backgroundColor: 'rgba(16,185,129,0.1)', 
              borderRadius: '50px', 
              color: '#10b981', 
              fontWeight: '600', 
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              💬 Témoignages
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
              Ils nous font confiance
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }} className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '24px',
                  padding: '32px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', marginBottom: '16px' }}>
                  {[...Array(t.rating)].map((_, j) => (
                    <span key={j} style={{ color: '#fbbf24', fontSize: '18px' }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.7', marginBottom: '24px' }}>
                  "{t.content}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>{t.name}</p>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" style={{ padding: '100px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ 
              display: 'inline-block',
              padding: '8px 16px', 
              backgroundColor: 'rgba(245,158,11,0.1)', 
              borderRadius: '50px', 
              color: '#f59e0b', 
              fontWeight: '600', 
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              💎 Tarifs
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
              Choisissez votre formule
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280' }}>
              Sans engagement, annulez à tout moment
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'stretch' }} className="pricing-grid">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: plan.popular ? '#111827' : 'white',
                  borderRadius: '24px',
                  padding: '40px 32px',
                  border: plan.popular ? 'none' : '2px solid #e5e7eb',
                  position: 'relative',
                  transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: plan.popular ? '0 25px 80px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#fbbf24',
                    color: '#111827',
                    padding: '6px 20px',
                    borderRadius: '50px',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}>
                    ⭐ Le plus populaire
                  </div>
                )}

                <h3 style={{ fontSize: '24px', fontWeight: '700', color: plan.popular ? 'white' : '#111827', marginBottom: '8px' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '14px', color: plan.popular ? '#9ca3af' : '#6b7280', marginBottom: '24px' }}>
                  {plan.description}
                </p>

                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '48px', fontWeight: '800', color: plan.popular ? 'white' : '#111827' }}>{plan.price}</span>
                  <span style={{ fontSize: '18px', color: plan.popular ? '#9ca3af' : '#6b7280' }}>{plan.period}</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {plan.features.map((feature, j) => (
                    <li key={j} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px 0',
                      borderBottom: `1px solid ${plan.popular ? '#374151' : '#f3f4f6'}`,
                      color: plan.popular ? '#e5e7eb' : '#4b5563',
                      fontSize: '15px'
                    }}>
                      <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.name === 'Essentiel' ? (
                  <PricingCheckoutButton
                    plan="essentiel"
                    priceEur={19}
                    className="pricing-button"
                  />
                ) : plan.name === 'Premium' ? (
                  <PricingCheckoutButton
                    plan="premium"
                    priceEur={39}
                    className="pricing-button"
                  />
                ) : (
                  <Link
                    href="/register"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '16px',
                      backgroundColor: plan.popular ? '#3b82f6' : '#f3f4f6',
                      color: plan.popular ? 'white' : '#111827',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '15px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '100px 24px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ 
              display: 'inline-block',
              padding: '8px 16px', 
              backgroundColor: 'rgba(59,130,246,0.1)', 
              borderRadius: '50px', 
              color: '#3b82f6', 
              fontWeight: '600', 
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              ❓ FAQ
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#111827' }}>
              Questions fréquentes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb'
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '17px', fontWeight: '600', color: '#111827' }}>{faq.question}</span>
                  <span style={{ fontSize: '24px', color: '#6b7280', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 24px', color: '#6b7280', lineHeight: '1.7' }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        padding: '100px 24px', 
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '800', color: 'white', marginBottom: '24px' }}>
            Prêt à réussir ?
          </h2>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', marginBottom: '40px' }}>
            Rejoignez plus de 15 000 élèves qui progressent chaque jour avec Jules Class Go
          </p>
          <Link
            href="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '20px 48px',
              backgroundColor: 'white',
              color: '#3b82f6',
              textDecoration: 'none',
              borderRadius: '50px',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            Commencer gratuitement
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#111827', padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '48px', marginBottom: '60px' }} className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <span style={{ fontSize: '32px' }}>🎓</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Jules Class Go</span>
              </div>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.7' }}>
                La plateforme de soutien scolaire en ligne qui vous accompagne vers la réussite.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: '700', marginBottom: '24px' }}>Matières</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Mathématiques', 'Physique-Chimie', 'Français', 'Histoire-Géo'].map((item, i) => (
                  <li key={i}><Link href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px' }}>{item}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: '700', marginBottom: '24px' }}>Entreprise</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['À propos', 'Carrières', 'Blog', 'Contact'].map((item, i) => (
                  <li key={i}><Link href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px' }}>{item}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: '700', marginBottom: '24px' }}>Légal</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['CGU', 'Confidentialité', 'Cookies', 'Mentions légales'].map((item, i) => (
                  <li key={i}><Link href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px' }}>{item}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #374151', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>© 2025 Jules Class Go. Tous droits réservés.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              {['📘', '📸', '🐦', '💼'].map((icon, i) => (
                <Link key={i} href="#" style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  textDecoration: 'none'
                }}>
                  {icon}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .subject-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border-color: #3b82f6;
        }

        .feature-card:hover {
          background-color: white;
          border-color: #e5e7eb;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hero-image { display: none !important; }
          .hero-title { font-size: 42px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .subjects-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .desktop-menu { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }

        @media (max-width: 640px) {
          .hero-title { font-size: 32px !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .subjects-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}