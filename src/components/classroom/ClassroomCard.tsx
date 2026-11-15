// src/components/classroom/ClassroomCard.tsx
// ═══════════════════════════════════════════════════════════════════════════
// Carte de classe avec affichage correct des prix des COURS (pas de la classe)
// ═══════════════════════════════════════════════════════════════════════════
'use client'

import React from 'react'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  price: number | null
  access_type: 'free' | 'premium'
}

interface Classroom {
  id: string
  title: string
  subject: string
  level: string
  is_public: boolean
  enrolled_count: number
  created_at: string
  // Données des cours (à charger via join)
  courses?: Course[]
  // Ou stats pré-calculées
  courses_count?: number
  min_course_price?: number
  max_course_price?: number
  has_paid_courses?: boolean
}

interface ClassroomCardProps {
  classroom: Classroom
  isTeacher?: boolean
}

export function ClassroomCard({ classroom, isTeacher = false }: ClassroomCardProps) {
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCUL DU PRIX À AFFICHER
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Méthode 1: Si on a les cours chargés
  let displayPrice = 'Gratuit'
  let priceColor = '#059669' // green
  let priceBgColor = '#d1fae5'
  
  if (classroom.courses && classroom.courses.length > 0) {
    const paidCourses = classroom.courses.filter(c => c.access_type === 'premium' && c.price && c.price > 0)
    
    if (paidCourses.length > 0) {
      const prices = paidCourses.map(c => c.price || 0)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      
      if (minPrice === maxPrice) {
        displayPrice = `${minPrice}€`
      } else {
        displayPrice = `${minPrice}€ - ${maxPrice}€`
      }
      priceColor = '#7c3aed' // purple
      priceBgColor = '#ede9fe'
    }
  }
  // Méthode 2: Si on a les stats pré-calculées
  else if (classroom.has_paid_courses) {
    if (classroom.min_course_price === classroom.max_course_price) {
      displayPrice = `${classroom.min_course_price}€`
    } else {
      displayPrice = `${classroom.min_course_price}€ - ${classroom.max_course_price}€`
    }
    priceColor = '#7c3aed'
    priceBgColor = '#ede9fe'
  }

  // Formater la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header avec titre et badge prix */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Icône */}
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#f3f4f6',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            📚
          </div>
          
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: 0
            }}>
              {classroom.title}
            </h3>
            <p style={{ 
              fontSize: '13px', 
              color: '#6b7280', 
              margin: '4px 0 0 0' 
            }}>
              {classroom.subject} • {classroom.level}
            </p>
          </div>
        </div>

        {/* Badge prix */}
        <span style={{
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          backgroundColor: priceBgColor,
          color: priceColor,
          whiteSpace: 'nowrap'
        }}>
          {displayPrice}
        </span>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        fontSize: '13px', 
        color: '#6b7280',
        flexWrap: 'wrap'
      }}>
        <span>👥 {classroom.enrolled_count || 0} élève{(classroom.enrolled_count || 0) > 1 ? 's' : ''}</span>
        
        {classroom.is_public && (
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            color: '#2563eb'
          }}>
            🌐 Public
          </span>
        )}
        
        {classroom.courses_count !== undefined && (
          <span>📖 {classroom.courses_count} cours</span>
        )}
      </div>

      {/* Footer avec date et bouton */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '8px',
        paddingTop: '12px',
        borderTop: '1px solid #f3f4f6'
      }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          Créée le {formatDate(classroom.created_at)}
        </span>
        
        <Link
          href={isTeacher 
            ? `/teacher/classrooms/${classroom.id}` 
            : `/classroom/${classroom.id}`
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#2563eb',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          {isTeacher ? 'Gérer' : 'Voir'} →
        </Link>
      </div>
    </div>
  )
}

export default ClassroomCard