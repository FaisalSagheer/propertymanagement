/**
 * PropertyPro - Core Type Definitions
 * Comprehensive TypeScript interfaces for the Property Management System
 */

import mongoose, { Document, Types } from "mongoose";

// ============================================================================
// USER TYPES - SINGLE COMPANY ARCHITECTURE
// ============================================================================

export enum UserRole {
  ADMIN = "admin", // Property Admin - Full system access
  MANAGER = "manager", // Property Manager - Management access
  TENANT = "tenant", // Tenant - Limited access to own data
}

// ============================================================================
// ROLE MANAGEMENT TYPES
// ============================================================================

export interface IRoleConfig {
  _id?: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
  /** Built-in role this custom role is authorised as. See resolve-role.ts. */
  inheritsFrom?: "admin" | "manager" | "tenant";
  isSystem: boolean;
  isActive: boolean;
  color: "default" | "destructive" | "outline" | "secondary";
  userCount: number;
  canEdit: boolean;
  canDelete: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// User instance methods interface
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<Document>;
  changeStatus(
    newStatus: string,
    changedBy: string,
    reason?: string,
    notes?: string,
    moveDate?: Date
  ): Promise<Document>;
  approveApplication(
    changedBy: string,
    reason?: string,
    notes?: string
  ): Promise<Document>;
  rejectApplication(
    changedBy: string,
    reason?: string,
    notes?: string
  ): Promise<Document>;
  moveIn(date?: Date, changedBy?: string, leaseId?: string): Promise<Document>;
  moveOut(date?: Date, changedBy?: string, reason?: string): Promise<Document>;
  softDelete(): Promise<Document>;
  restore(): Promise<Document>;
}

export interface IUser extends Document, IUserMethods {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  /** Plan the user is currently entitled to (a MANAGER_PLANS id), if any. */
  subscription?: string | null;
  avatar?: string;
  bio?: string;
  location?: string;
  city?: string;
  website?: string;
  address?: string;
  isActive: boolean;
  emailVerified?: Date;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Tenant-specific fields (only applicable when role is 'tenant')
  dateOfBirth?: Date;
  nino?: string; // Encrypted
  employmentInfo?: {
    employer: string;
    position: string;
    income: number;
    startDate: Date;
  };
  emergencyContacts: IEmergencyContact[];
  documents: string[]; // File paths
  creditScore?: number;
  backgroundCheckStatus?: "pending" | "approved" | "rejected";
  // Enhanced tenant status management
  tenantStatus?:
  | "application_submitted"
  | "under_review"
  | "approved"
  | "active"
  | "inactive"
  | "moved_out"
  | "terminated";
  applicationDate: Date;
  moveInDate?: Date;
  moveOutDate?: Date;
  // Additional tenant fields
  screeningScore?: number;
  applicationNotes?: string;
  currentLeaseId?: Types.ObjectId;
  leaseHistory?: Array<{
    leaseId: Types.ObjectId;
    startDate: Date;
    endDate?: Date;
    status: "active" | "completed" | "terminated" | "cancelled";
  }>;
  statusHistory?: Array<{
    status: string;
    changedBy: Types.ObjectId;
    changedAt: Date;
    reason?: string;
    notes?: string;
  }>;
  preferredContactMethod?: "email" | "phone" | "text" | "app";
  emergencyContactVerified?: boolean;
  backgroundCheckCompletedAt?: Date;
  lastStatusUpdate?: Date;
  // Third-party integrations
  integrations?: {
    googleCalendar?: {
      connected?: boolean;
      accessToken?: string;
      refreshToken?: string;
      expiryDate?: Date;
      connectedAt?: Date;
      lastSync?: Date;
      autoSync?: boolean;
      selectedCalendarId?: string;
      syncDirection?: "import" | "export" | "bidirectional";
      syncInterval?: number;
    };
  };
  // Notification preferences
  notificationPreferences?: {
    calendar?: {
      email?: {
        enabled?: boolean;
        invitations?: boolean;
        reminders?: boolean;
        updates?: boolean;
        cancellations?: boolean;
        dailyDigest?: boolean;
        weeklyDigest?: boolean;
      };
      sms?: {
        enabled?: boolean;
        reminders?: boolean;
        urgentUpdates?: boolean;
      };
      push?: {
        enabled?: boolean;
        reminders?: boolean;
        updates?: boolean;
        invitations?: boolean;
      };
      reminderTiming?: {
        default?: number[];
        highPriority?: number[];
        lowPriority?: number[];
      };
      digestTiming?: {
        dailyTime?: string;
        weeklyDay?: number;
        weeklyTime?: string;
      };
      quietHours?: {
        enabled?: boolean;
        startTime?: string;
        endTime?: string;
        timezone?: string;
      };
    };
  };
}

// ============================================================================
// PROPERTY TYPES
// ============================================================================


export enum PropertyownerType {
  COMPANY = "company",
  INDIVIDUAL = "individual"
}

export enum PropertyType {
  APARTMENT = "apartment",
  HOUSE = "house",
  HMO = "hmo",
  TOWNHOUSE = "townhouse",
  COMMERCIAL = "commercial",
  OFFICE = "office",
  RETAIL = "retail",
}

export enum PropertyStatus {
  AVAILABLE = "available",
  OCCUPIED = "occupied",
  MAINTENANCE = "maintenance",
  UNAVAILABLE = "unavailable",
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IAmenity {
  name: string;
  description?: string;
  category: string;
}

export interface IPropertyAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  uploadedBy?: Types.ObjectId;
}

// Embedded Unit Interface for unified property-unit model
export interface IEmbeddedUnit {
  _id?: Types.ObjectId;
  unitNumber: string;
  unitType: "apartment" | "studio" | "penthouse" | "loft" | "room";
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  rentAmount: number;
  securityDeposit: number;
  status: PropertyStatus;
  isMultiUnit: boolean;

  // Unit-specific features
  balcony?: boolean;
  patio?: boolean;
  garden?: boolean;
  dishwasher?: boolean;
  inUnitLaundry?: boolean;
  hardwoodFloors?: boolean;
  fireplace?: boolean;
  walkInClosets?: boolean;
  centralAir?: boolean;
  ceilingFans?: boolean;

  // Appliances
  appliances?: {
    refrigerator?: boolean;
    stove?: boolean;
    oven?: boolean;
    microwave?: boolean;
    dishwasher?: boolean;
    washer?: boolean;
    dryer?: boolean;
    washerDryerHookups?: boolean;
  };

  // Parking
  parking?: {
    included: boolean;
    spaces?: number;
    type?: "garage" | "covered" | "open" | "street";
    gated?: boolean;
    assigned?: boolean;
  };

  // Utilities
  utilities?: {
    electricity?: "included" | "tenant" | "shared";
    water?: "included" | "tenant" | "shared";
    gas?: "included" | "tenant" | "shared";
    internet?: "included" | "tenant" | "shared";
    cable?: "included" | "tenant" | "shared";
    heating?: "included" | "tenant" | "shared";
    cooling?: "included" | "tenant" | "shared";
    trash?: "included" | "tenant" | "shared";
    sewer?: "included" | "tenant" | "shared";
  };

  // Additional details
  notes?: string;
  images?: string[];
  availableFrom?: Date;
  lastRenovated?: Date;

  attachments?: IPropertyAttachment[];

  // Current tenant information
  currentTenantId?: Types.ObjectId;
  currentLeaseId?: Types.ObjectId;
}

export interface IProperty extends Document {
  _id: Types.ObjectId;
  propertyOwnerName: string;
  ownerType: PropertyownerType;
  name: string;
  description?: string;
  type: PropertyType;
  status: PropertyStatus;
  address: IAddress;

  yearBuilt?: number;
  amenities: IAmenity[];

  // Enhanced fields
  isMultiUnit: boolean;
  totalUnits: number;
  // Unified approach: units are embedded in the property document
  units: IEmbeddedUnit[];
  attachments: IPropertyAttachment[];

  images: string[];

  hmoLicenseNumber?: string;
  hmoLicenseIssueDate?: Date;
  hmoLicenseExpiry?: Date;

  ownerId: Types.ObjectId;
  managerId?: Types.ObjectId;
  assignedAgentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Instance methods for property status management
  calculatePropertyStatus(): PropertyStatus;
  updatePropertyStatusFromUnits(): Promise<PropertyStatus>;
  updateStatus(status: PropertyStatus): Promise<IProperty>;
  softDelete(): Promise<IProperty>;
  restore(): Promise<IProperty>;
}

// ============================================================================
// UNIT TYPES
// ============================================================================

export interface IUnitParking {
  included: boolean;
  spaces?: number;
  type?: "garage" | "covered" | "open" | "street";
}

export interface IUnitUtilities {
  electricity?: "included" | "tenant" | "shared";
  water?: "included" | "tenant" | "shared";
  gas?: "included" | "tenant" | "shared";
  internet?: "included" | "tenant" | "shared";
  cable?: "included" | "tenant" | "shared";
  heating?: "included" | "tenant" | "shared";
  cooling?: "included" | "tenant" | "shared";
}

// ============================================================================
// TENANT TYPES
// ============================================================================

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface ITenant extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  dateOfBirth?: Date;
  nino?: string;
  employmentInfo?: {
    employer: string;
    position: string;
    income: number;
    startDate: Date;
  };
  emergencyContacts: IEmergencyContact[];
  documents: string[]; // File paths
  creditScore?: number;
  backgroundCheckStatus?: "pending" | "approved" | "rejected";
  applicationDate: Date;
  moveInDate?: Date;
  moveOutDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// APPLICATION TYPES
// ============================================================================

export enum ApplicationStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}

export enum ApplicationFeeStatus {
  PENDING = "pending",
  PAID = "paid",
  REFUNDED = "refunded",
  WAIVED = "waived",
}

export interface IApplicationFee {
  amount: number;
  status: ApplicationFeeStatus;
  paymentMethod?: string;
  transactionId?: string;
  paidAt?: Date;
}

export interface IApplicationDocument {
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  verified?: boolean;
}

export interface IApplication extends Document {
  _id: Types.ObjectId;
  propertyId: Types.ObjectId;
  applicantId: Types.ObjectId; // User ID of the applicant
  status: ApplicationStatus;
  applicationFee: IApplicationFee;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    nino?: string; // Encrypted
  };
  employmentInfo?: {
    employer: string;
    position: string;
    income: number;
    startDate: Date;
    employerContact?: string;
  };
  emergencyContacts: IEmergencyContact[];
  previousAddresses?: {
    address: string;
    landlordName?: string;
    landlordContact?: string;
    moveInDate: Date;
    moveOutDate: Date;
    reasonForLeaving?: string;
  }[];
  documents: IApplicationDocument[];
  additionalInfo?: {
    pets?: string;
    vehicles?: string;
    reasonForMoving?: string;
    additionalNotes?: string;
  };
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// INSPECTION TYPES
// ============================================================================

export enum InspectionType {
  MOVE_IN = "move_in",
  MOVE_OUT = "move_out",
  ROUTINE = "routine",
  MAINTENANCE = "maintenance",
}

export interface IInspectionItem {
  room: string;
  item: string;
  condition: "excellent" | "good" | "fair" | "poor" | "damaged";
  notes?: string;
  photos?: string[];
  requiresAttention: boolean;
}

export interface IInspection extends Document {
  _id: Types.ObjectId;
  propertyId: Types.ObjectId;
  tenantId?: Types.ObjectId;
  leaseId?: Types.ObjectId;
  type: InspectionType;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledDate: Date;
  completedDate?: Date;
  inspectorId: Types.ObjectId;
  items: IInspectionItem[];
  overallCondition: "excellent" | "good" | "fair" | "poor";
  tenantSignature?: {
    signedAt: Date;
    signature: string;
    ipAddress?: string;
  };
  inspectorSignature?: {
    signedAt: Date;
    signature: string;
  };
  photos: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// LEASE TYPES
// ============================================================================

export enum LeaseStatus {
  DRAFT = "draft",
  PENDING = "pending",
  PENDING_SIGNATURE = "pending_signature",
  ACTIVE = "active",
  EXPIRED = "expired",
  TERMINATED = "terminated",
  RENEWED = "renewed",
}

export enum LeaseRentPeriod {
  MONTH = "month",
  WEEK = "week",
  DAY = "day"
}

export interface ILeasePaymentConfig {
  rentDueDay: number; // Day of month rent is due (1-31)
  lateFeeConfig: ILateFeeConfig;
  acceptedPaymentMethods: PaymentMethod[];
  autoCreatePayments: boolean; // Automatically create recurring rent payments
  prorationEnabled: boolean; // Enable prorated first/last month
  advancePaymentMonths?: number; // Number of months paid in advance
  // Extended fields used by models/services
  autoGenerateInvoices?: boolean;
  autoEmailInvoices?: boolean;
  prorationMethod?: "daily" | "calendar" | "banking";
  roundingMethod?: "round" | "floor" | "ceil";
  minimumProrationCharge?: number;
}

export interface ILeaseTerms {
  rentAmount: number;
  totalAmount: number;
  securityDeposit?: number;
  lateFee?: number;
  utilities?: string[];
  restrictions?: string[];
  paymentConfig?: ILeasePaymentConfig;
}

export interface ILease extends Document {
  _id: Types.ObjectId;
  propertyId: Types.ObjectId;
  unitId: Types.ObjectId;
  tenantId: Types.ObjectId;
  signedBy: Types.ObjectId;
  rentPeriod: LeaseRentPeriod;
  startDate?: Date;
  /**
   * Open-ended leases have no endDate until closure, at which point it mirrors
   * `departureDate`. Never set it speculatively — Phase 2 recurring billing
   * treats a lease with no endDate as still running.
   */
  endDate?: Date;
  /**
   * The tenant's actual departure — source of truth for the final billing
   * cutoff. May be backdated relative to when the admin closed the lease.
   */
  departureDate?: Date;
  /**
   * Day-of-month (1–31) that defines billing cycle boundaries, derived from
   * `startDate`. Stored rather than recomputed so that cycles stay stable if
   * `startDate` is ever corrected. Months shorter than this value clamp to
   * their last day when cycles are computed.
   */
  billingAnchorDay?: number;
  status: LeaseStatus;
  // Aggregate payment status derived from linked payments
  paymentStatus?: "current" | "pending" | "overdue";
  terms: ILeaseTerms;
  documents: string[];
  signedDate?: Date;
  renewalOptions?: {
    available: boolean;
    terms?: string;
  };
  renewedLeaseId?: Types.ObjectId;
  parentLeaseId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  /** null when active; set on soft delete. restore() writes null back. */
  deletedAt?: Date | null;

  // Virtual property for populated unit information from unified model
  unit?: IEmbeddedUnit;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export enum InvoiceStatus {
  SCHEDULED = "scheduled",
  ISSUED = "issued",
  PAID = "paid",
  PARTIAL = "partial",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum InvoiceType {
  RENT = "rent",
  SECURITY_DEPOSIT = "security_deposit",
  LATE_FEE = "late_fee",
  UTILITY = "utility",
  MAINTENANCE = "maintenance",
  OTHER = "other",
}

export interface IInvoiceLineItem {
  description: string;
  amount: number;
  type: InvoiceType;
  quantity?: number;
  unitPrice?: number;
  dueDate?: Date;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  invoiceNumber: string;
  tenantId: Types.ObjectId;
  propertyId: Types.ObjectId;
  leaseId: Types.ObjectId;
  unitId?: Types.ObjectId;

  // Invoice Details
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;

  // Billing Period
  /**
   * The billing cycle this invoice covers. Distinct from issueDate/dueDate,
   * which are about when money is asked for rather than what is being billed.
   * Together with `leaseId` these form the natural key for the recurring job's
   * "already generated this cycle?" check.
   */
  periodStart?: Date;
  periodEnd?: Date;
  /** Partial-period invoice — amount is prorated rather than a full cycle. */
  isProrated?: boolean;
  /** The lease-closing invoice, prorated to the tenant's departure date. */
  isFinal?: boolean;

  // Financial Information
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  amountPaid: number;
  balanceRemaining: number;

  // Line Items
  lineItems: IInvoiceLineItem[];

  // Payment Tracking
  paymentIds: Types.ObjectId[];
  lastPaymentDate?: Date;

  // Late Fee Tracking
  lateFeeAmount: number;
  lateFeeAppliedDate?: Date;
  gracePeriodEnd: Date;

  // Communication
  emailSent: boolean;
  emailSentDate?: Date;
  remindersSent: {
    type: "reminder" | "overdue" | "final_notice";
    sentDate: Date;
    method: "email" | "sms" | "both";
  }[];

  // Document Management
  pdfPath?: string;
  pdfGenerated: boolean;

  // Metadata
  notes?: string;
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Nullable, not just optional: the schema defaults it to null and the
  // soft-delete hook matches on null, so restoring writes null rather than
  // dropping the field. Mirrors ILease.deletedAt.
  deletedAt?: Date | null;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export enum PaymentType {
  RENT = "rent",
  SECURITY_DEPOSIT = "security_deposit",
  LATE_FEE = "late_fee",
  // Retained even though the "new payment" form no longer offers it: existing
  // payments carry this value, and the Payment model validates `type` against
  // Object.values(PaymentType), so removing it would make those rows unsavable.
  PET_DEPOSIT = "pet_deposit",
  COMPLIANCE = "compliance",
  UTILITY = "utility",
  MAINTENANCE = "maintenance",
  INVOICE = "invoice",
  OTHER = "other",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  OVERDUE = "overdue",
  PARTIAL = "partial",
  CANCELLED = "cancelled",
  // Enhanced status hierarchy
  UPCOMING = "upcoming", // 7+ days before due
  DUE_SOON = "due_soon", // 1-7 days before due
  DUE_TODAY = "due_today", // due date
  GRACE_PERIOD = "grace_period", // 1-5 days overdue
  LATE = "late", // 5+ days overdue
  SEVERELY_OVERDUE = "severely_overdue", // 30+ days overdue
  PAID = "paid", // Alias for completed
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  BANK_TRANSFER = "bank_transfer",
  ACH = "ach",
  CHECK = "check",
  CASH = "cash",
  MONEY_ORDER = "money_order",
  OTHER = "other",
}

export enum PaymentFrequency {
  ONE_TIME = "one_time",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually",
  CUSTOM = "custom",
}

export interface IPaymentSchedule {
  frequency: PaymentFrequency;
  startDate: Date;
  endDate?: Date;
  dayOfMonth?: number; // For monthly payments (1-31)
  dayOfWeek?: number; // For weekly payments (0-6, Sunday = 0)
  customInterval?: number; // For custom frequency (e.g., every 2 months)
  isActive: boolean;
  nextDueDate?: Date;
  lastGeneratedDate?: Date;
}

export interface ILateFeeConfig {
  enabled: boolean;
  gracePeriodDays: number;
  feeType: "fixed" | "percentage" | "tiered" | "daily";
  feeAmount: number; // Fixed amount or percentage
  maxFeeAmount?: number; // Maximum fee for percentage-based
  minFeeAmount?: number; // Minimum fee amount
  compoundDaily?: boolean;
  dailyLateFee?: number; // Daily late fee amount
  percentageFee?: number; // Percentage-based fee
  flatFee?: number; // Flat fee amount
  maxLateFee?: number; // Maximum late fee cap
  notificationDays: number[]; // Days after due date to send notifications
  tiers?: Array<{
    daysOverdue: number;
    amount: number;
    percentage?: number;
  }>; // Tiered fee structure
}

export interface IPayment extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  propertyId: Types.ObjectId;
  leaseId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  amount: number;
  amountPaid?: number; // For partial payments
  type: PaymentType;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dueDate: Date;
  paidDate?: Date;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  stripeCustomerId?: string;
  description?: string;
  notes?: string;
  receiptUrl?: string;

  // Enhanced payment scheduling
  schedule?: IPaymentSchedule;
  parentPaymentId?: Types.ObjectId; // For recurring payments
  isRecurring: boolean;

  // Late fee management
  lateFeeConfig?: ILateFeeConfig;
  lateFeeApplied?: number;
  lateFeeDate?: Date;

  // Proration tracking
  prorationData?: {
    isProrated: boolean;
    originalAmount: number;
    proratedAmount: number;
    startDate: Date;
    endDate: Date;
    daysInPeriod: number;
    dailyRate: number;
    method: "daily" | "calendar" | "banking";
  };

  // Payment tracking
  paymentHistory: Array<{
    amount: number;
    paymentMethod: PaymentMethod;
    paidDate: Date;
    transactionId?: string;
    notes?: string;
  }>;

  // Notifications
  remindersSent: Array<{
    type: "reminder" | "overdue" | "final_notice";
    sentDate: Date;
    method: "email" | "sms" | "both";
  }>;

  // Synchronization and versioning
  version?: number;
  lastSyncedAt?: Date;
  syncStatus?: "synced" | "pending" | "failed";

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// MAINTENANCE TYPES
// ============================================================================

export enum MaintenancePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  EMERGENCY = "emergency",
}

export enum MaintenanceStatus {
  SUBMITTED = "submitted",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IMaintenanceRequest extends Document {
  _id: Types.ObjectId;
  propertyId: Types.ObjectId;
  unitId?: Types.ObjectId; // Optional - for multi-unit properties
  tenantId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  category: string;
  images: string[];
  contactPhone?: string;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// COMPLIANCE TYPES
// ============================================================================

// Compliance category slugs - matches COMPLIANCE_TYPES in ComplianceReportForm
export enum ComplianceCategory {
  FIRE_SAFETY = "fire-safety",
  ELECTRICAL = "electrical-safety",
  STRUCTURAL = "structural-safety",
  ELEVATOR = "elevator-/-lift-certificate",
  PEST_CONTROL = "pest-control-certificate",
  HEALTH_HYGIENE = "health-hygiene",
  HMO = "hmo-license",
}

// Display-friendly labels for each category (used in UI dropdowns / badges)
export const ComplianceCategoryLabels: Record<ComplianceCategory, string> = {
  [ComplianceCategory.FIRE_SAFETY]: "Fire Safety Certificate",
  [ComplianceCategory.ELECTRICAL]: "Electrical Safety",
  [ComplianceCategory.STRUCTURAL]: "Structural Safety",
  [ComplianceCategory.ELEVATOR]: "Elevator / Lift Certificate",
  [ComplianceCategory.PEST_CONTROL]: "Pest Control Certificate",
  [ComplianceCategory.HEALTH_HYGIENE]: "Health & Hygiene Compliance",
  [ComplianceCategory.HMO]: "HMO License",
};

// Lifecycle status of a compliance certificate (auto-derived from expiryDate)
export enum ComplianceStatus {
  ACTIVE = "active",
  EXPIRING_SOON = "expiring_soon",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

// Embedded document/attachment metadata for compliance reports
export interface IComplianceDocument {
  url: string;
  name?: string;
  size?: number;
  mimeType: string;
  uploadedAt: Date;
}

// Main interface for a ComplianceReport mongoose document
export interface IComplianceReport extends Document {
  _id: Types.ObjectId;

  // Reference
  propertyId: Types.ObjectId;
  createdBy?: Types.ObjectId;

  // Form fields (mirrors ComplianceReportForm payload exactly)
  category: ComplianceCategory;
  issueDate: Date;
  expiryDate: Date;
  notes?: string;
  estimatedCost?: number;

  // Attachments (managed by PropertyDocReport upload component)
  images: IComplianceDocument[];

  // Lifecycle - auto-derived from expiryDate on save
  status: ComplianceStatus;

  // Soft delete
  deletedAt?: Date | null;

  // Timestamps (added by mongoose)
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  daysUntilExpiry?: number | null;
  validityDuration?: number | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;

  // Instance methods
  softDelete(): Promise<IComplianceReport>;
  restore(): Promise<IComplianceReport>;
  revoke(reason?: string): Promise<IComplianceReport>;
  renew(
    newIssueDate: Date,
    newExpiryDate: Date,
    notes?: string
  ): Promise<IComplianceReport>;
}

export interface ComplianceReportDetail {
  _id: string;
  category: ComplianceCategory;
  issueDate: string;
  expiryDate: string;
  estimatedCost?: number;
  status: ComplianceStatus;
  notes?: string;
  images?: IComplianceDocument[];
  createdAt: string;
  updatedAt: string;
  daysUntilExpiry?: number | null;
  validityDuration?: number | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  propertyId: {
    _id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  } | null;
  createdBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}
// Static methods on the ComplianceReport model
export interface IComplianceReportModel
  extends mongoose.Model<IComplianceReport> {
  findByProperty(propertyId: string): Promise<IComplianceReport[]>;
  findByCategory(category: ComplianceCategory): Promise<IComplianceReport[]>;
  findExpired(): Promise<IComplianceReport[]>;
  findExpiringSoon(days?: number): Promise<IComplianceReport[]>;
}

// Payload shape for POST /api/compliance (matches the form exactly)
export interface ICreateComplianceReportInput {
  propertyId: string;
  category: ComplianceCategory | string;
  issueDate: string | Date;
  expiryDate: string | Date;
  notes?: string;
  images?: IComplianceDocument[];
  estimatedCost?: number;
}

// Payload shape for PUT /api/compliance/:id
export interface IUpdateComplianceReportInput
  extends Partial<ICreateComplianceReportInput> { }

// Filter shape for GET /api/compliance query params
export interface IComplianceReportFilter {
  propertyId?: string;
  category?: ComplianceCategory;
  status?: ComplianceStatus;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
}

// ============================================================================
// WORK ORDER TYPES
// ============================================================================

export enum WorkOrderStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IWorkOrder extends Document {
  _id: Types.ObjectId;
  maintenanceRequestId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: MaintenancePriority;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  materials?: string[];
  laborHours?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export enum DocumentType {
  LEASE = "lease",
  APPLICATION = "application",
  INSPECTION = "inspection",
  MAINTENANCE = "maintenance",
  FINANCIAL = "financial",
  PHOTO = "photo",
  OTHER = "other",
}

export enum DocumentStatus {
  ACTIVE = "active",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  ARCHIVED = "archived",
}

export interface IDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  propertyId?: Types.ObjectId;
  tenantId?: Types.ObjectId;
  leaseId?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  isShared: boolean;
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface PropertyFormData {
  propertyOwnerName: string;
  ownerType: PropertyownerType;
  name: string;
  description?: string;
  type: PropertyType;

  address: IAddress;

  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  rentAmount: number;
  securityDeposit: number;

  amenities: IAmenity[];
}

export interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  employmentInfo?: {
    employer: string;
    position: string;
    income: number;
    startDate: Date;
  };
  emergencyContacts: IEmergencyContact[];
}

export interface LeaseFormData {
  propertyId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  terms: ILeaseTerms;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  totalTenants: number;
  monthlyRevenue: number;
  pendingMaintenance: number;
  overduePayments: number;
}

export interface RecentActivity {
  id: string;
  type: "payment" | "maintenance" | "lease" | "tenant";
  description: string;
  timestamp: Date;
  userId?: string;
  propertyId?: string;
}

// ============================================================================
// CALENDAR & SCHEDULING TYPES
// ============================================================================

export enum EventType {
  LEASE_RENEWAL = "lease_renewal",
  PROPERTY_INSPECTION = "property_inspection",
  MAINTENANCE_APPOINTMENT = "maintenance_appointment",
  PROPERTY_SHOWING = "property_showing",
  TENANT_MEETING = "tenant_meeting",
  RENT_COLLECTION = "rent_collection",
  MOVE_IN = "move_in",
  MOVE_OUT = "move_out",
  GENERAL = "general",
}

export enum EventStatus {
  SCHEDULED = "scheduled",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  RESCHEDULED = "rescheduled",
}

export enum EventPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum LocationType {
  PHYSICAL = "physical",
  ONLINE = "online",
}

export enum OnlinePlatform {
  ZOOM = "zoom",
  GOOGLE_MEET = "google_meet",
  MICROSOFT_TEAMS = "microsoft_teams",
  WEBEX = "webex",
  OTHER = "other",
}

export enum RecurrenceType {
  NONE = "none",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  CUSTOM = "custom",
}

export interface IEventRecurrence {
  type: RecurrenceType;
  interval: number; // Every X days/weeks/months/years
  endDate?: Date;
  occurrences?: number; // Number of occurrences
  daysOfWeek?: number[]; // For weekly recurrence (0 = Sunday, 6 = Saturday)
  dayOfMonth?: number; // For monthly recurrence
  exceptions?: Date[]; // Dates to skip
}

export interface IEventReminder {
  type: "email" | "sms" | "push" | "in_app";
  minutesBefore: number;
  sent: boolean;
  sentAt?: Date;
}

export interface IEventLocation {
  type: LocationType;
  // For physical locations
  address?: string;
  // For online locations
  platform?: OnlinePlatform;
  meetingLink?: string;
  meetingId?: string;
  passcode?: string;
}

export interface IEventAttendee {
  userId: Types.ObjectId;
  email: string;
  name: string;
  role: UserRole;
  status: "pending" | "accepted" | "declined" | "tentative";
  responseAt?: Date;
  notes?: string;
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  priority: EventPriority;

  // Date and time
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timezone: string;

  // Location
  location?: IEventLocation;
  propertyId?: Types.ObjectId;
  unitNumber?: string;

  // Participants
  organizer: Types.ObjectId;
  attendees: IEventAttendee[];

  // Related entities
  tenantId?: Types.ObjectId;
  leaseId?: Types.ObjectId;
  maintenanceRequestId?: Types.ObjectId;

  // Recurrence
  recurrence?: IEventRecurrence;
  parentEventId?: Types.ObjectId; // For recurring event instances
  isRecurring: boolean;

  // Reminders and notifications
  reminders: IEventReminder[];

  // Additional data
  metadata?: Record<string, any>;
  attachments?: string[];
  notes?: string;

  // Audit fields
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface INotificationSettings {
  email: {
    enabled: boolean;
    paymentReminders: boolean;
    maintenanceUpdates: boolean;
    leaseReminders: boolean;
    propertyNews: boolean;
    systemAlerts: boolean;
    marketingEmails: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    tenantMessages: boolean;
    documentSharing: boolean;
    calendarReminders: boolean;
    frequency: "immediate" | "daily" | "weekly";
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  sms: {
    enabled: boolean;
    emergencyOnly: boolean;
    paymentReminders: boolean;
    maintenanceUpdates: boolean;
    leaseReminders: boolean;
    systemAlerts: boolean;
    frequency: "immediate" | "daily";
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  push: {
    enabled: boolean;
    paymentReminders: boolean;
    maintenanceUpdates: boolean;
    leaseReminders: boolean;
    systemAlerts: boolean;
    tenantMessages: boolean;
    documentSharing: boolean;
    calendarReminders: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  inApp: {
    enabled: boolean;
    showDesktopNotifications: boolean;
    soundEnabled: boolean;
    badgeCount: boolean;
    autoMarkAsRead: boolean;
    groupSimilar: boolean;
  };
}

export interface ISecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: "sms" | "email" | "authenticator";
    backupCodes?: string[];
  };
  loginAlerts: boolean;
  sessionTimeout: number; // in minutes
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

export interface IDisplaySettings {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "DD-MM-YYYY";
  timeFormat: "12h" | "24h";
  currency: string;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";
  density: "comfortable" | "compact" | "spacious";
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  dashboardLayout: "grid" | "list" | "cards";
  itemsPerPage: number;
}

export interface IPrivacySettings {
  profileVisibility: "public" | "private" | "contacts";
  showOnlineStatus: boolean;
  allowDataCollection: boolean;
  allowMarketing: boolean;
  shareUsageData: boolean;
  showContactInfo: boolean;
  allowDirectMessages: boolean;
  showActivityStatus: boolean;
  allowSearchEngineIndexing: boolean;
  shareLocationData: boolean;
  allowThirdPartyIntegrations: boolean;
  dataRetentionPeriod: number;
  cookiePreferences: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  };
}

/**
 * @deprecated This interface is deprecated as of migration 003.
 * Use the unified ISettings interface instead.
 * Kept for backward compatibility and migration purposes.
 */
export interface IUserSettings extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  notifications: INotificationSettings;
  security: ISecuritySettings;
  display: IDisplaySettings;
  privacy: IPrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISystemSettings extends Document {
  _id: Types.ObjectId;
  category:
  | "general"
  | "email"
  | "payment"
  | "maintenance"
  | "security"
  | "branding"
  | "appearance"
  | "localization"
  | "notifications"
  | "integrations";
  key: string;
  value: any;
  dataType:
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "file"
  | "url"
  | "color"
  | "json";
  description?: string;
  isPublic: boolean; // Whether setting can be viewed by non-admins
  isEditable: boolean; // Whether setting can be modified
  validationRules?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    fileTypes?: string[]; // For file uploads
    maxFileSize?: number; // In bytes
    minLength?: number;
    maxLength?: number;
  };
  metadata?: {
    group?: string; // For grouping related settings
    order?: number; // For ordering within category
    helpText?: string; // Additional help text
    icon?: string; // Icon name for UI
    tags?: string[]; // For search and filtering
    dependencies?: string[]; // Settings that depend on this one
  };
  lastModifiedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
