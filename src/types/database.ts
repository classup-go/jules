export type UserRole = 'student' | 'teacher' | 'admin'
export type PlanType = 'free' | 'pro' | 'expert' | 'family'
export type CurrencyType = 'EUR' | 'TND' | 'XOF' | 'CAD' | 'USD'
export type SessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface CourseExample {
  title: string
  description: string
  thumbnail?: string
  duration?: string
}

export interface Achievement {
  title: string
  description: string
  icon?: string
  date?: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  display_name: string
  avatar_url?: string
  bio?: string
  country: string
  currency: CurrencyType
  plan: PlanType
  plan_expires_at?: string
  is_verified: boolean
  created_at: string
  updated_at: string

  // Portfolio Enseignant
  presentation_video_url?: string
  course_examples?: CourseExample[]
  achievements?: Achievement[]

  // Country & Currency Detection
  country_auto_detected?: boolean
  country_manually_set?: boolean

  // Stripe Connect
  stripe_connect_account_id?: string
  stripe_connect_onboarding_completed?: boolean
  stripe_connect_charges_enabled?: boolean
  stripe_connect_payouts_enabled?: boolean
  payout_enabled?: boolean

  // Payout Configuration
  payout_country?: string
  minimum_payout_threshold?: number
  payout_method?: PayoutMethod
  stripe_connect_metadata?: Record<string, any>
}

export interface TeacherProfile {
  id: string
  user_id: string
  subjects: string[]
  levels: string[]
  hourly_rate: number // Prix en EUR (devise de base)
  rating: number
  review_count: number
  total_students: number
  total_hours: number
  availability?: Record<string, any>
  created_at: string
  updated_at: string
  user?: User
}

export interface Classroom {
  id: string
  teacher_id: string
  title: string
  description?: string
  subject: string
  level: string
  cover_image?: string
  is_public: boolean
  max_students: number
  enrolled_count: number
  price: number // Prix en EUR (devise de base) - sera converti selon géolocalisation
  is_free?: boolean
  created_at: string
  updated_at: string
  teacher?: User
}

export interface Enrollment {
  id: string
  classroom_id: string
  student_id: string
  status: 'active' | 'completed' | 'cancelled'
  progress: number
  enrolled_at: string
  classroom?: Classroom
  student?: User
}

export interface LiveSession {
  id: string
  classroom_id: string
  teacher_id: string
  title?: string
  scheduled_at: string
  duration: number
  status: SessionStatus
  livekit_room?: string
  max_participants: number
  recording_url?: string
  created_at: string
  classroom?: Classroom
  teacher?: User
}

export interface Review {
  id: string
  teacher_id: string
  student_id: string
  classroom_id?: string
  rating: number
  comment?: string
  created_at: string
}

// ============================================
// Payment System Types
// ============================================

export type PaymentType = 'course_enrollment' | 'booking' | 'subscription'
export type PaymentProvider = 'stripe' | 'konnect' | 'flouci' | 'cinetpay'
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'trialing'

export interface Transaction {
  id: string
  payment_type: PaymentType
  student_id: string
  teacher_id?: string
  amount_eur: number
  amount_local: number
  currency: CurrencyType
  exchange_rate: number
  payment_provider: PaymentProvider
  provider_transaction_id?: string
  provider_payment_intent?: string
  status: TransactionStatus
  metadata: Record<string, any>
  created_at: string
  completed_at?: string
  refunded_at?: string
  idempotency_key?: string
}

export interface Booking {
  id: string
  student_id: string
  teacher_id: string
  scheduled_at: string
  duration: number
  timezone: string
  hourly_rate_eur: number
  total_price_eur: number
  status: BookingStatus
  payment_id?: string
  live_session_id?: string
  student_notes?: string
  teacher_notes?: string
  cancelled_at?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string

  // Relations
  student?: User
  teacher?: User
  payment?: Transaction
  live_session?: LiveSession
}

export interface Subscription {
  id: string
  user_id: string
  plan_type: PlanType
  price_eur: number
  price_local: number
  currency: CurrencyType
  stripe_subscription_id?: string
  stripe_customer_id?: string
  current_period_start: string
  current_period_end: string
  status: SubscriptionStatus
  cancel_at_period_end: boolean
  cancelled_at?: string
  created_at: string
  updated_at: string

  // Relations
  user?: User
}

export interface PlanPricing {
  id: string
  plan_type: PlanType
  price_eur: number
  billing_period: 'month' | 'year'
  stripe_price_id?: string
  features: Record<string, any>
  active: boolean
  created_at: string
}

// Extended Enrollment with payment info
export interface EnrollmentExtended extends Enrollment {
  payment_id?: string
  payment_required?: boolean
  payment_completed_at?: string
  payment?: Transaction
}

// ============================================
// Earnings & Payouts System Types
// ============================================

export type EarningStatus = 'pending' | 'available' | 'paid_out' | 'held'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type PayoutMethod = 'stripe_connect' | 'manual' | 'bank_transfer' | 'disabled'
export type PlatformFeeType = 'percentage' | 'flat' | 'hybrid'

export interface TeacherEarning {
  id: string
  teacher_id: string
  transaction_id: string

  // Amounts
  gross_amount: number
  platform_fee_amount: number
  platform_fee_percentage: number
  net_amount: number
  currency: CurrencyType

  // Status
  status: EarningStatus
  available_at?: string

  // Payout link
  payout_id?: string

  // Timestamps
  created_at: string
  updated_at: string

  // Relations
  teacher?: User
  transaction?: Transaction
  payout?: TeacherPayout
}

export interface TeacherPayout {
  id: string
  teacher_id: string

  // Payout details
  amount: number
  currency: CurrencyType
  payout_method: PayoutMethod

  // Stripe Connect
  stripe_payout_id?: string
  stripe_transfer_id?: string
  stripe_connect_account_id?: string

  // Status
  status: PayoutStatus

  // Metadata
  earnings_count: number
  metadata: Record<string, any>

  // Error handling
  failure_reason?: string
  failure_code?: string

  // Timestamps
  initiated_at: string
  completed_at?: string
  failed_at?: string
  created_at: string

  // Relations
  teacher?: User
}

export interface PlatformFee {
  id: string

  // Fee structure
  fee_type: PlatformFeeType
  percentage?: number
  flat_amount?: number
  currency: CurrencyType

  // Applicability
  applies_to: 'all' | 'courses' | 'bookings' | 'subscriptions'

  // Activation
  is_active: boolean
  effective_from: string
  effective_until?: string

  created_at: string
}

export interface PayoutConfigByCountry {
  id: string
  country_code: string

  // Configuration
  minimum_payout_threshold?: number
  payout_method: PayoutMethod
  currency: CurrencyType

  // Metadata
  notes?: string
  is_active: boolean

  created_at: string
  updated_at: string
}

// Fee calculation breakdown
export interface FeeBreakdown {
  grossAmount: number
  platformFeeAmount: number
  platformFeePercentage: number
  netAmount: number
  currency: CurrencyType
}

// Payout balance
export interface PayoutBalance {
  available: number
  pending: number
  paid_out: number
  currency: CurrencyType
}

// Payout eligibility check
export interface PayoutEligibility {
  eligible: boolean
  reason?: string
  threshold?: number
  availableAmount?: number
}
