# Country & Currency Selector Integration Guide

**Status**: Registration page integrated ✅
**Date**: 2026-01-22

---

## Overview

The `CountryCurrencySelector` component provides automatic country detection with manual override capability. It has been integrated into key user flows.

---

## ✅ Completed Integrations

### 1. Registration Page

**File**: `src/app/(auth)/register/page.tsx`

**Location**: After role selection, before name input

**Features**:
- Auto-detects country via IP geolocation
- Shows message: "📍 Détecté : France | Devise : EUR €"
- "Modifier" button to manually select country
- Saves to database: `country`, `currency`, `country_manually_set`

**User Flow**:
```
User lands on register page
  ↓
Component detects country (e.g., "France")
  ↓
Displays: "📍 Détecté : France | Devise : EUR €"
  ↓
User can:
  a) Keep detected country → `country_auto_detected = true`
  b) Click "Modifier" → Select from dropdown → `country_manually_set = true`
  ↓
On form submit:
  → Saves country, currency to users table
```

**Database Fields Updated**:
- `users.country` - Country code (e.g., 'FR')
- `users.currency` - Currency code (e.g., 'EUR')
- `users.country_manually_set` - Boolean
- `users.country_auto_detected` - Boolean (inverse of manually_set)

---

## 🔄 Pending Integrations

These integrations are **optional** but recommended for production:

### 2. Profile Settings

**Target Files**:
- `src/app/(dashboard)/profile/edit/page.tsx`
- `src/app/(dashboard)/teacher/profile/page.tsx`

**Purpose**: Allow users to update their country/currency preferences

**Implementation**:
```tsx
// Add to profile edit form
<div className="mb-6">
  <h3 className="font-semibold mb-3">Location & Préférences</h3>
  <CountryCurrencySelector
    initialCountry={userData.country}
    initialCurrency={userData.currency}
    showAutoDetection={false}
    onSelect={async (country, currency, isManual) => {
      // Call /api/currency/update-preference
      await fetch('/api/currency/update-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, currency, manuallySet: isManual })
      })
    }}
  />
</div>
```

**API Route**: Already created at `/api/currency/update-preference`

---

### 3. Checkout Flow

**Target Files**:
- `src/app/(dashboard)/checkout/page.tsx`
- `src/components/checkout-button.tsx`

**Purpose**: Show detected currency, allow change before payment

**Implementation**:
```tsx
// Add before payment button
<div className="bg-blue-50 p-4 rounded-lg mb-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-blue-900">
        💳 Paiement en {paymentConfig.currency} ({paymentConfig.countryName})
      </p>
      <p className="text-xs text-blue-700">
        Prix: {convertedPrice} {currencySymbol}
      </p>
    </div>
    <button
      onClick={() => setShowCurrencySelector(true)}
      className="text-sm text-blue-600 hover:underline"
    >
      Changer
    </button>
  </div>
</div>

{showCurrencySelector && (
  <div className="mb-4">
    <CountryCurrencySelector
      showAutoDetection={false}
      onSelect={(country, currency) => {
        // Update pricing
        updatePaymentConfig(country, currency)
        setShowCurrencySelector(false)
      }}
    />
  </div>
)}
```

**Benefits**:
- User sees price in their currency before paying
- Can change if traveling or using VPN
- Reduces payment confusion/abandonment

---

### 4. Course Creation (Teachers)

**Target File**: `src/app/(dashboard)/teacher/courses/create/page.tsx`

**Purpose**: Teacher sets course price in their currency

**Implementation**:
```tsx
<div className="mb-6">
  <label className="block mb-2 font-semibold">Votre devise</label>
  <CountryCurrencySelector
    initialCountry={teacher.country}
    initialCurrency={teacher.currency}
    showAutoDetection={false}
    onSelect={(country, currency) => {
      setCourseCurrency(currency)
    }}
  />
  <p className="text-sm text-gray-600 mt-2">
    Les prix seront automatiquement convertis pour les élèves d'autres pays
  </p>
</div>
```

---

## Component API Reference

### CountryCurrencySelector

**Props**:
```typescript
interface CountryCurrencySelectorProps {
  onSelect: (country: string, currency: CurrencyType, isManual?: boolean) => void
  initialCountry?: string
  initialCurrency?: CurrencyType
  showAutoDetection?: boolean  // Show auto-detected message
  disabled?: boolean
}
```

**Features**:
- Auto-detects country via IP (ipapi.co)
- 30+ countries supported
- Automatic currency mapping
- Manual override capability
- Loading states
- Responsive design

**Supported Countries**:
- 🇪🇺 Europe: FR, DE, ES, IT, BE, NL, PT, AT, CH, GB
- 🌍 North Africa: TN, MA, DZ
- 🌍 West Africa (FCFA): SN, CI, ML, BF, BJ, TG, NE
- 🌍 Central Africa (FCFA): CM, GA, CG
- 🌎 Americas: US, CA

**Supported Currencies**:
- EUR (Euro)
- USD (US Dollar)
- CAD (Canadian Dollar)
- TND (Tunisian Dinar)
- XOF (West African CFA Franc)

---

## Usage Examples

### Example 1: Auto-detection enabled (Registration)
```tsx
<CountryCurrencySelector
  onSelect={(country, currency, isManual) => {
    setCountry(country)
    setCurrency(currency)
    setManuallySet(isManual)
  }}
  showAutoDetection={true}
/>
```

**Result**: Shows "📍 Détecté : France | Devise : EUR €" with modify button

---

### Example 2: Manual selection only (Profile)
```tsx
<CountryCurrencySelector
  initialCountry="FR"
  initialCurrency="EUR"
  showAutoDetection={false}
  onSelect={(country, currency) => {
    updateProfile({ country, currency })
  }}
/>
```

**Result**: Shows dropdown immediately, no auto-detection message

---

### Example 3: Disabled state (View only)
```tsx
<CountryCurrencySelector
  initialCountry="TN"
  initialCurrency="TND"
  showAutoDetection={false}
  disabled={true}
  onSelect={() => {}}
/>
```

**Result**: Shows selected country/currency but cannot change

---

## API Routes

### GET /api/currency/detect
**Purpose**: Detect user's country via IP

**Response**:
```json
{
  "countryCode": "FR",
  "countryName": "France",
  "currency": "EUR",
  "paymentConfig": {
    "currency": "EUR",
    "currencySymbol": "€",
    "exchangeRate": 1.0,
    ...
  }
}
```

---

### POST /api/currency/update-preference
**Purpose**: Update user's country/currency preferences

**Request**:
```json
{
  "country": "FR",
  "currency": "EUR",
  "manuallySet": true
}
```

**Response**:
```json
{
  "success": true,
  "country": "FR",
  "currency": "EUR"
}
```

---

## Database Schema

### users table extensions
```sql
ALTER TABLE users
ADD COLUMN country TEXT,
ADD COLUMN currency TEXT,
ADD COLUMN country_auto_detected BOOLEAN DEFAULT false,
ADD COLUMN country_manually_set BOOLEAN DEFAULT false;
```

**Field Purposes**:
- `country` - ISO 2-letter code (e.g., 'FR', 'TN')
- `currency` - 3-letter code (e.g., 'EUR', 'TND')
- `country_auto_detected` - True if IP-based detection
- `country_manually_set` - True if user manually selected

---

## Testing Checklist

### Registration Flow
- [ ] Open `/register` in incognito mode
- [ ] Verify country auto-detected
- [ ] Check "Detected: [Country] | Currency: [Code]" shows
- [ ] Click "Modifier" → dropdown appears
- [ ] Select different country → currency updates
- [ ] Complete registration
- [ ] Verify database:
  ```sql
  SELECT country, currency, country_manually_set
  FROM users WHERE email = 'test@example.com';
  ```
- [ ] Should see selected country/currency

### API Endpoints
- [ ] Test `/api/currency/detect`
  ```bash
  curl http://localhost:3000/api/currency/detect
  ```
- [ ] Should return detected country

- [ ] Test `/api/currency/update-preference`
  ```bash
  curl -X POST http://localhost:3000/api/currency/update-preference \
    -H "Content-Type: application/json" \
    -d '{"country":"FR","currency":"EUR","manuallySet":true}'
  ```
- [ ] Should update user preferences

---

## Common Issues

### Issue: Country always shows as "France"
**Cause**: Default fallback when IP detection fails (localhost)
**Solution**: Test on deployed environment or mock IP headers

### Issue: "Currency undefined" error
**Cause**: Currency not mapped for selected country
**Solution**: Add country to COUNTRIES array in component

### Issue: Auto-detection not calling onSelect
**Cause**: useEffect dependency issue
**Solution**: Verify onSelect is in dependency array

---

## Next Steps

To complete the multi-currency experience:

1. **Add to Profile Settings** (15 min)
   - Allows users to change country later
   - Uses same component, different context

2. **Add to Checkout** (20 min)
   - Shows currency before payment
   - Reduces confusion at payment stage

3. **Add to Course Creation** (10 min)
   - Teachers set their base currency
   - Platform handles conversions

4. **Add Currency Display Everywhere** (30 min)
   - Show prices in user's currency throughout app
   - Use `getPaymentConfig(user.country)` for conversions

---

## Files Reference

### Component
- `src/components/country-currency-selector.tsx`

### Integration
- `src/app/(auth)/register/page.tsx` ✅

### API Routes
- `src/app/api/currency/detect/route.ts`
- `src/app/api/currency/update-preference/route.ts`

### Utilities
- `src/lib/payment/useGeoLocation.ts`
- `src/lib/payment/config.ts`

### Types
- `src/types/database.ts` (CurrencyType)

---

**Status**: Registration integration complete. Optional integrations pending.
