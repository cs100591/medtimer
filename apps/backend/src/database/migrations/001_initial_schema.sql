-- Medication Reminder App - Initial Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/<your-project>/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  date_of_birth DATE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"push": true, "sms": false, "email": true}',
  accessibility_settings JSONB DEFAULT '{"highContrast": false, "largeText": false, "voiceEnabled": false}',
  
  -- Security
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  brand_name VARCHAR(255),
  dosage VARCHAR(100) NOT NULL,
  form VARCHAR(50) NOT NULL, -- tablet, capsule, liquid, injection, etc.
  strength VARCHAR(50),
  
  instructions TEXT,
  purpose TEXT,
  prescriber VARCHAR(255),
  pharmacy VARCHAR(255),
  
  -- Barcode/NDC
  barcode VARCHAR(100),
  ndc_code VARCHAR(20),
  
  -- Supply tracking
  current_supply INTEGER DEFAULT 0,
  low_supply_threshold INTEGER DEFAULT 7,
  
  -- Cost tracking
  cost_per_unit DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Flags
  is_critical BOOLEAN DEFAULT false,
  is_rescue BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  requires_food BOOLEAN DEFAULT false,
  
  -- Metadata
  color VARCHAR(50),
  shape VARCHAR(50),
  imprint VARCHAR(100),
  image_url TEXT,
  
  started_at DATE,
  ended_at DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Timing
  time_of_day TIME NOT NULL,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sunday, 6=Saturday
  
  -- Frequency pattern
  frequency_type VARCHAR(50) NOT NULL DEFAULT 'daily', -- daily, weekly, interval, cycle
  interval_days INTEGER, -- for interval type
  cycle_on_days INTEGER, -- for cycle type (take X days)
  cycle_off_days INTEGER, -- for cycle type (stop Y days)
  
  -- Duration
  duration_type VARCHAR(50) DEFAULT 'ongoing', -- ongoing, fixed, until_date
  duration_days INTEGER,
  end_date DATE,
  
  -- Escalation settings
  escalation_enabled BOOLEAN DEFAULT true,
  escalation_intervals INTEGER[] DEFAULT '{5,10,15}', -- minutes between escalations
  escalation_methods VARCHAR(50)[] DEFAULT '{"push","push","sms"}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adherence records table
CREATE TABLE IF NOT EXISTS adherence_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  
  -- Timing
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, taken, skipped, missed, snoozed
  
  -- Details
  dosage_taken VARCHAR(100),
  notes TEXT,
  skip_reason TEXT,
  snooze_until TIMESTAMP WITH TIME ZONE,
  
  -- Location (for rescue medications)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Escalation tracking
  escalation_level INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Caregivers table
CREATE TABLE IF NOT EXISTS caregivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Caregiver info (if not a registered user)
  caregiver_email VARCHAR(255),
  caregiver_name VARCHAR(255),
  caregiver_phone VARCHAR(20),
  
  -- Permissions
  permission_level VARCHAR(20) DEFAULT 'view', -- view, co_manage, full
  can_view_medications BOOLEAN DEFAULT true,
  can_view_adherence BOOLEAN DEFAULT true,
  can_modify_medications BOOLEAN DEFAULT false,
  can_receive_alerts BOOLEAN DEFAULT true,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, revoked
  invitation_token VARCHAR(255),
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drug interactions table
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_a_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  medication_b_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  
  severity VARCHAR(20) NOT NULL, -- mild, moderate, severe, contraindicated
  description TEXT NOT NULL,
  recommendation TEXT,
  source VARCHAR(255),
  
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  
  old_values JSONB,
  new_values JSONB,
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refill history table
CREATE TABLE IF NOT EXISTS refill_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  quantity INTEGER NOT NULL,
  cost DECIMAL(10, 2),
  pharmacy VARCHAR(255),
  
  refilled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance plans table
CREATE TABLE IF NOT EXISTS insurance_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  plan_name VARCHAR(255) NOT NULL,
  provider VARCHAR(255),
  member_id VARCHAR(100),
  group_number VARCHAR(100),
  
  copay_generic DECIMAL(10, 2),
  copay_brand DECIMAL(10, 2),
  copay_specialty DECIMAL(10, 2),
  
  deductible DECIMAL(10, 2),
  deductible_met DECIMAL(10, 2) DEFAULT 0,
  
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  effective_date DATE,
  expiration_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_barcode ON medications(barcode);
CREATE INDEX IF NOT EXISTS idx_schedules_medication_id ON schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_adherence_user_id ON adherence_records(user_id);
CREATE INDEX IF NOT EXISTS idx_adherence_medication_id ON adherence_records(medication_id);
CREATE INDEX IF NOT EXISTS idx_adherence_scheduled_at ON adherence_records(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_adherence_status ON adherence_records(status);
CREATE INDEX IF NOT EXISTS idx_caregivers_patient_id ON caregivers(patient_id);
CREATE INDEX IF NOT EXISTS idx_caregivers_caregiver_id ON caregivers(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY users_policy ON users FOR ALL USING (id = auth.uid());
CREATE POLICY medications_policy ON medications FOR ALL USING (user_id = auth.uid());
CREATE POLICY schedules_policy ON schedules FOR ALL USING (user_id = auth.uid());
CREATE POLICY adherence_policy ON adherence_records FOR ALL USING (user_id = auth.uid());
CREATE POLICY refill_policy ON refill_history FOR ALL USING (user_id = auth.uid());
CREATE POLICY insurance_policy ON insurance_plans FOR ALL USING (user_id = auth.uid());

-- Caregiver policy (patients and their caregivers can access)
CREATE POLICY caregivers_patient_policy ON caregivers FOR ALL 
  USING (patient_id = auth.uid() OR caregiver_id = auth.uid());

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER adherence_updated_at BEFORE UPDATE ON adherence_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER caregivers_updated_at BEFORE UPDATE ON caregivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER insurance_updated_at BEFORE UPDATE ON insurance_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
