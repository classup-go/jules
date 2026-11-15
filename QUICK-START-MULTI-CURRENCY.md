# Quick Start: Multi-Currency & Stripe Connect

Get the multi-currency and Stripe Connect system up and running in 5 steps.

---

## Prerequisites

- Supabase project with admin access
- Stripe account with Connect enabled
- Node.js 18+ and pnpm installed

---

## Step 1: Database Setup (5 minutes)

Run the migration to create all necessary tables:

```bash
# Connect to your Supabase database
psql -h db.xxx.supabase.co -U postgres -d postgres

# Run the migration
\i migrations/001-multi-currency-stripe-connect-setup.sql

# Verify tables were created
\dt teacher_*
# Should show: teacher_earnings, teacher_payouts

# Exit
\q
```

Or use Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `migrations/001-multi-currency-stripe-connect-setup.sql`
3. Click "Run"

---

## Step 2: Environment Variables (2 minutes)

Add to `.env.local`:

```bash
# Existing Stripe keys
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# NEW: Stripe Connect webhook secret
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_yyyyy

# NEW: Cron job authentication
CRON_SECRET=your_random_secret_string_here

# App URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate `CRON_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Stripe Connect Webhook (3 minutes)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)

2. Click "Add endpoint"

3. Configure:
   - **Endpoint URL**: `https://your-domain.com/api/stripe-connect/webhooks`
   - **Description**: "Connect account events"
   - **Events to send**:
     - `account.updated`
     - `payout.paid`
     - `payout.failed`

4. Copy the "Signing secret" → paste to `.env.local` as `STRIPE_CONNECT_WEBHOOK_SECRET`

---

## Step 4: Test Existing Webhook (1 minute)

Verify the main Stripe webhook still works:

1. Make a test payment through your app
2. Check logs for: `Teacher earnings created for transaction xxx`
3. Query database:
   ```sql
   SELECT * FROM teacher_earnings ORDER BY created_at DESC LIMIT 5;
   ```

Should see new earnings records with:
- `gross_amount = 100.00`
- `platform_fee_amount = 15.00`
- `net_amount = 85.00`
- `status = 'pending'`

---

## Step 5: Test Teacher Dashboard (5 minutes)

### 5.1 Create Test Teacher
```sql
-- Make yourself a teacher
UPDATE users
SET role = 'teacher',
    country = 'FR',
    currency = 'EUR'
WHERE email = 'your-email@example.com';
```

### 5.2 Visit Earnings Page
1. Login as teacher
2. Navigate to: `/teacher/earnings`
3. Should see:
   - "Configuration des Payouts" section
   - "Activate automatic payouts" button
   - Balance cards (may be 0 if no earnings yet)

### 5.3 Test Stripe Connect Onboarding
1. Click "🚀 Activer les payouts automatiques"
2. Should redirect to Stripe onboarding
3. Fill in test information:
   - Country: France
   - Business type: Individual
   - Email: test@example.com
   - Use test routing/account numbers
4. Complete onboarding
5. Should redirect back to `/teacher/earnings?setup=success`
6. Verify "✅ Payouts activés" message appears

---

## Step 6: Simulate Earnings Flow (Optional)

### 6.1 Create Test Transaction
```sql
-- Insert a test transaction
INSERT INTO transactions (
  payment_type,
  student_id,
  teacher_id,
  amount_eur,
  amount_local,
  currency,
  exchange_rate,
  payment_provider,
  status,
  completed_at
) VALUES (
  'course_enrollment',
  'student-uuid',
  'teacher-uuid', -- Your teacher ID
  100.00,
  100.00,
  'EUR',
  1.0,
  'stripe',
  'completed',
  NOW()
) RETURNING id;
```

### 6.2 Create Corresponding Earning
```sql
-- Create earning record (normally done by webhook)
INSERT INTO teacher_earnings (
  teacher_id,
  transaction_id, -- From previous query
  gross_amount,
  platform_fee_amount,
  platform_fee_percentage,
  net_amount,
  currency,
  status,
  available_at
) VALUES (
  'teacher-uuid',
  'transaction-id-from-above',
  100.00,
  15.00,
  15.00,
  85.00,
  'EUR',
  'pending',
  NOW() + INTERVAL '14 days'
);
```

### 6.3 Check Dashboard
1. Refresh `/teacher/earnings`
2. Should see:
   - Pending: 85.00 EUR
   - Available: 0.00 EUR (not ready yet)

### 6.4 Fast-Forward Availability
```sql
-- Make earnings available immediately
UPDATE teacher_earnings
SET available_at = NOW() - INTERVAL '1 day'
WHERE teacher_id = 'teacher-uuid'
  AND status = 'pending';

-- Run availability check
UPDATE teacher_earnings
SET status = 'available'
WHERE teacher_id = 'teacher-uuid'
  AND status = 'pending'
  AND available_at <= NOW();
```

### 6.5 Request Payout
1. Refresh dashboard
2. Should now see:
   - Available: 85.00 EUR
   - "Retirer mes gains" button enabled
3. Click button → enter 85.00 → confirm
4. Check status:
   ```sql
   SELECT * FROM teacher_payouts WHERE teacher_id = 'teacher-uuid';
   ```
5. Should see record with `status = 'processing'`

---

## Verification Checklist

- [ ] Database tables created (`teacher_earnings`, `teacher_payouts`, etc.)
- [ ] Environment variables set
- [ ] Stripe Connect webhook configured
- [ ] Teacher earnings dashboard loads at `/teacher/earnings`
- [ ] Stripe Connect onboarding flow works
- [ ] Earnings are created after test payment
- [ ] Balance cards display correct amounts
- [ ] Payout request creates record in database

---

## Common Issues

### Issue: "stripe_connect_account_id column doesn't exist"
**Solution**: Re-run the migration SQL. The column should be added to `users` table.

### Issue: "Failed to create Stripe account"
**Solution**:
1. Check `STRIPE_SECRET_KEY` is set correctly
2. Ensure Stripe Connect is enabled in Dashboard
3. Check console logs for specific error

### Issue: "Webhook signature verification failed"
**Solution**:
1. Verify `STRIPE_CONNECT_WEBHOOK_SECRET` matches Stripe dashboard
2. Ensure webhook is sent to correct endpoint
3. Check webhook is not being proxied/modified

### Issue: Balance shows 0 even after payment
**Solution**:
1. Check if webhook fired: Look for `Teacher earnings created` in logs
2. Query database: `SELECT * FROM teacher_earnings WHERE teacher_id = 'xxx'`
3. If no records, webhook might not be configured correctly

### Issue: Cron job not running
**Solution**:
1. For local testing, call endpoint manually:
   ```bash
   curl http://localhost:3000/api/cron/process-earnings \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
2. For production, setup Vercel Cron or external scheduler

---

## Next Steps

Once everything works:

1. **Production Setup**
   - Switch to live Stripe keys
   - Update webhook URLs to production domain
   - Enable Vercel Cron for daily earnings processing

2. **Optional Enhancements**
   - Add country/currency selector to registration page
   - Build admin dashboard for manual payouts
   - Add email notifications for earnings/payouts

3. **Monitoring**
   - Setup error alerts for failed webhooks
   - Track platform fee revenue
   - Monitor payout success rates

---

## Need Help?

- Check main documentation: `MULTI-CURRENCY-STRIPE-CONNECT-IMPLEMENTATION.md`
- Review code comments in implementation files
- Test with Stripe test mode before going live
- Consult Stripe Connect docs: https://stripe.com/docs/connect

---

**Status**: Ready to test! 🚀
