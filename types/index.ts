// ─── User Roles ─────────────────────────────────────────────────────────────

export type UserRole = "senior" | "family" | "companion" | "admin";

// ─── Profile Types ───────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bio: string | null;
  is_active: boolean;
  is_managed: boolean;
  managed_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeniorProfile {
  id: string;
  profile_id: string;
  preferred_name: string | null;
  contact_email: string | null;
  mobility_notes: string | null;
  accessibility_needs: string | null;
  preferred_language: string;
  additional_languages: string[];
  preferred_companion_gender: "male" | "female" | "no_preference" | null;
  interests: string[];
  dietary_notes: string | null;
  free_text_notes: string | null;
  // Non-medical contextual info only (e.g. "wears hearing aid")
  medical_alert_info: string | null;
  created_at: string;
  updated_at: string;
}

/** Profile + SeniorProfile joined for display */
export interface SeniorWithProfile {
  profile: Profile;
  seniorProfile: SeniorProfile | null;
  emergencyContacts: EmergencyContact[];
  relationshipLabel?: string;
}

export interface FamilySeniorRelationship {
  id: string;
  family_profile_id: string;
  senior_profile_id: string;
  relationship_label: string;
  can_book: boolean;
  can_view_summaries: boolean;
  created_at: string;
}

export interface CompanionProfile {
  id: string;
  profile_id: string;
  verification_status: CompanionVerificationStatus;
  background_check_completed: boolean;
  hourly_rate: number;
  max_travel_miles: number;
  languages_spoken: string[];
  activity_preferences: string[];
  years_experience: number | null;
  linkedin_url: string | null;
  // Phase 3 onboarding fields
  interests: string[];
  activities_supported: string[];
  has_prior_experience: boolean;
  id_verification_status: "not_submitted" | "submitted" | "under_review" | "verified" | "rejected";
  id_provider_reference: string | null;
  id_verification_notes: string | null;
  id_verified_at: string | null;
  background_check_status: "not_requested" | "requested" | "in_progress" | "completed" | "rejected";
  background_check_consent: boolean;
  background_check_consent_at: string | null;
  background_check_provider_ref: string | null;
  background_check_admin_notes: string | null;
  background_check_requested_at: string | null;
  background_check_completed_at: string | null;
  code_of_conduct_accepted: boolean;
  code_of_conduct_accepted_at: string | null;
  emergency_protocol_completed: boolean;
  emergency_protocol_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Verification ────────────────────────────────────────────────────────────

export type CompanionVerificationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended";

export interface CompanionVerification {
  id: string;
  companion_profile_id: string;
  document_type: string;
  document_url: string | null;
  status: CompanionVerificationStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Activity Types ──────────────────────────────────────────────────────────

export interface ActivityType {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "draft"
  | "requested"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "declined"
  | "needs_review";

export type TransportationMode =
  | "walk"
  | "public_transit"
  | "rideshare"
  | "other";

export interface Booking {
  id: string;
  senior_profile_id: string;
  companion_profile_id: string | null;
  booked_by_profile_id: string;
  activity_type_id: string;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_start_time: string;
  duration_hours: number;
  location_description: string;
  destination_address: string | null;
  transportation_mode: TransportationMode | null;
  special_notes: string | null;
  companion_summary: string | null;
  total_amount: number | null;
  disclaimer_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

/** Booking enriched with related display data */
export interface BookingWithDetails extends Booking {
  activity_type?: ActivityType;
  senior_profile?: Pick<Profile, "id" | "first_name" | "last_name">;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  status: BookingStatus;
  changed_by_profile_id: string;
  notes: string | null;
  created_at: string;
}

// ─── Check-in Events ─────────────────────────────────────────────────────────

export type CheckInEventType = "check_in" | "check_out" | "waypoint";

export interface CheckInEvent {
  id: string;
  booking_id: string;
  event_type: CheckInEventType;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

export interface Rating {
  id: string;
  booking_id: string;
  rated_by_profile_id: string;
  rated_profile_id: string;
  rating: number; // 1–5
  comment: string | null;
  created_at: string;
}

// ─── Emergency Contacts ──────────────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  senior_profile_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationChannel = "in_app" | "email" | "sms";
export type NotificationStatus = "pending" | "sent" | "failed" | "read";

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  related_booking_id: string | null;
  read_at: string | null;
  created_at: string;
}

// ─── Incident Reports ────────────────────────────────────────────────────────

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface IncidentReport {
  id: string;
  booking_id: string;
  reported_by_profile_id: string;
  description: string;
  severity: IncidentSeverity;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Booking Assignments ─────────────────────────────────────────────────────

export type AssignmentStatus = "pending" | "accepted" | "declined";

export interface BookingAssignment {
  id: string;
  booking_id: string;
  companion_profile_id: string;
  assigned_by_profile_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  responded_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Companion Availability ──────────────────────────────────────────────────

export interface CompanionAvailability {
  id: string;
  companion_profile_id: string;
  day_of_week: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Companion References ────────────────────────────────────────────────────

export interface CompanionReference {
  id: string;
  companion_profile_id: string;
  reference_name: string;
  reference_phone: string;
  reference_email: string | null;
  relationship: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Companion Training Records ──────────────────────────────────────────────

export interface CompanionTrainingRecord {
  id: string;
  companion_profile_id: string;
  training_type: string;
  completed_at: string | null;
  notes: string | null;
  recorded_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Companion Status History ────────────────────────────────────────────────

export interface CompanionStatusHistory {
  id: string;
  companion_profile_id: string;
  previous_status: CompanionVerificationStatus | null;
  new_status: CompanionVerificationStatus;
  changed_by_profile_id: string;
  notes: string | null;
  created_at: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
  roles?: UserRole[];
}
