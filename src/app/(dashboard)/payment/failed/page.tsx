'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PaymentFailedContent() {
  const searchParams = useSearchParams()
  const classroomId = searchParams.get('classroom_id')
  const bookingId = searchParams.get('booking_id')
  const isSubscription = searchParams.get('subscription') === 'true'
  const errorMessage = searchParams.get('error')

  // Déterminer le contexte du paiement échoué
  let context = 'paiement'
  let retryUrl = '/'

  if (classroomId) {
    context = 'inscription au cours'
    retryUrl = `/checkout?classroom=${classroomId}`
  } else if (bookingId) {
    context = 'réservation de session'
    retryUrl = `/book/${bookingId}`
  } else if (isSubscription) {
    context = 'abonnement'
    retryUrl = '/#pricing'
  }

  return (
    <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
      {/* Error Icon */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '100px',
          height: '100px',
          margin: '0 auto 24px',
          backgroundColor: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '50px'
        }}>
          ❌
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111418', marginBottom: '12px' }}>
          Paiement échoué
        </h1>
        <p style={{ fontSize: '16px', color: '#617589' }}>
          Votre {context} n'a pas pu être complété
        </p>
      </div>

      {/* Error Details */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>
          Que s'est-il passé ?
        </h2>

        {errorMessage ? (
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '12px', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#dc2626' }}>
              {errorMessage}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '15px', color: '#617589', marginBottom: '20px', lineHeight: '1.6' }}>
            Le paiement a été refusé. Cela peut arriver pour plusieurs raisons :
          </p>
        )}

        <ul style={{ fontSize: '15px', color: '#617589', lineHeight: '1.8', marginLeft: '20px' }}>
          <li>Fonds insuffisants sur votre carte</li>
          <li>Carte bancaire expirée</li>
          <li>Informations de paiement incorrectes</li>
          <li>Votre banque a bloqué la transaction</li>
          <li>Problème de connexion internet</li>
        </ul>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2b8cee' }}>
          <p style={{ fontSize: '14px', color: '#111418', fontWeight: '500', marginBottom: '4px' }}>
            💡 Conseil
          </p>
          <p style={{ fontSize: '14px', color: '#617589' }}>
            Vérifiez vos informations bancaires et réessayez. Si le problème persiste, contactez votre banque.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <Link href={retryUrl}>
          <button style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#2b8cee',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            🔄 Réessayer le paiement
          </button>
        </Link>

        <Link href="/">
          <button style={{
            width: '100%',
            padding: '14px',
            backgroundColor: 'white',
            color: '#111418',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Retour à l'accueil
          </button>
        </Link>
      </div>

      {/* Alternative Payment Methods */}
      <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>
          Méthodes de paiement alternatives
        </h3>
        <p style={{ fontSize: '14px', color: '#617589', marginBottom: '16px' }}>
          Si le problème persiste, vous pouvez essayer avec une autre méthode de paiement :
        </p>
        <ul style={{ fontSize: '14px', color: '#617589', lineHeight: '1.8', marginLeft: '20px' }}>
          <li>Une autre carte bancaire</li>
          <li>Virement bancaire (contactez le support)</li>
          <li>Mobile money (selon votre région)</li>
        </ul>
      </div>

      {/* Support */}
      <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>
          Besoin d'aide ?
        </p>
        <p style={{ fontSize: '14px', color: '#617589', marginBottom: '16px' }}>
          Notre équipe support est disponible pour vous aider
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <a
            href="mailto:support@julesclass.go"
            style={{
              color: '#2b8cee',
              fontSize: '14px',
              textDecoration: 'underline',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📧 support@julesclass.go
          </a>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Réponse sous 24h
          </p>
        </div>
      </div>

      {/* Security Note */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>
          🔒 Aucun montant n'a été débité de votre compte
        </p>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #e5e7eb', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  )
}
