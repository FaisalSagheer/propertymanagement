/**
 * PropertyPro - Validation Schemas
 * Zod schemas for form validation and API request validation
 */

import { z } from "zod";
import {
  PropertyType,
  PropertyStatus,
  UserRole,
  PaymentType,
  PaymentMethod,
  MaintenancePriority,
  PropertyownerType,
  ComplianceCategory,
  ComplianceStatus
} from "@/types";
import { isValidPhoneNumber } from "@/lib/utils";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_MIN_MESSAGE,
  PASSWORD_MAX_MESSAGE,
} from "@/lib/auth/password-policy";

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

// Custom phone number validation that accepts various formats
const phoneValidation = z
  .string()
  .refine((phone) => isValidPhoneNumber(phone), {
    message: "Invalid phone number format",
  });

// ============================================================================
// USER VALIDATIONS
// ============================================================================

// Emergency contact validation schema (all fields optional)
export const emergencyContactSchema = z.object({
  name: z.string().max(100, "Name too long").optional(),
  relationship: z.string().max(50, "Relationship too long").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
});

// Employment info validation schema
export const employmentInfoSchema = z.object({
  employer: z
    .string()
    .min(1, "Employer is required")
    .max(200, "Employer name too long"),
  position: z
    .string()
    .min(1, "Position is required")
    .max(100, "Position too long"),
  income: z
    .number()
    .min(0, "Income cannot be negative")
    .max(10000000, "Income too high"),
  startDate: z.date(),
});

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_MESSAGE)
    .max(MAX_PASSWORD_LENGTH, PASSWORD_MAX_MESSAGE),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name too long"),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  avatar: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  bio: z.string().max(500, "Bio too long").optional(),
  location: z.string().max(100, "Location too long").optional(),
  city: z.string().max(50, "City too long").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  address: z.string().max(200, "Address too long").optional(),
  // Tenant-specific fields (optional for all users, only used when role is 'tenant')
  tenantStatus: z
    .enum([
      "application_submitted",
      "under_review",
      "approved",
      "active",
      "inactive",
      "moved_out",
      "terminated",
    ])
    .optional(),
  dateOfBirth: z.date().optional(),
  nino: z
    .string()
    .optional(),
  employmentInfo: employmentInfoSchema.optional(),
  emergencyContacts: z
    .array(emergencyContactSchema)
    .max(5, "Too many emergency contacts")
    .optional(),
  documents: z.array(z.string()).max(20, "Too many documents").optional(),
  creditScore: z
    .number()
    .min(300, "Credit score too low")
    .max(850, "Credit score too high")
    .optional(),
  backgroundCheckStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  applicationDate: z.date().optional(),
  moveInDate: z.date().optional(),
  moveOutDate: z.date().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = userSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================================
// PROPERTY VALIDATIONS
// ============================================================================

export const addressSchema = z.object({
  street: z
    .string()
    .min(1, "Street address is required")
    .max(200, "Street address too long"),
  city: z.string().min(1, "City is required").max(100, "City name too long"),
  state: z.string().min(1, "State is required").max(50, "State name too long"),
  zipCode: z
    .string()
    .min(1, "ZIP/Postal code is required")
    .max(20, "ZIP/Postal code is too long"),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country name too long")
    .default("United States"),
});

export const amenitySchema = z.object({
  name: z
    .string()
    .min(1, "Amenity name is required")
    .max(100, "Amenity name too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: z.enum([
    "Kitchen",
    "Bathroom",
    "Living",
    "Bedroom",
    "Outdoor",
    "Parking",
    "Security",
    "Utilities",
    "Recreation",
    "Laundry",
    "Climate",
    "Other",
  ]),
});

// Unit amenities schema
const unitAmenitiesSchema = z.object({
  parking: z
    .enum(["none", "street", "garage", "covered", "open"])
    .default("none"),
  laundry: z.enum(["none", "in-unit", "shared", "hookups"]).default("none"),
  airConditioning: z
    .enum(["none", "central", "window", "split"])
    .default("none"),
  heating: z
    .enum(["none", "central", "baseboard", "radiator", "fireplace"])
    .default("none"),
});

// Enhanced unit schema for comprehensive unit management
export const unitSchema = z.object({
  // Basic Information
  unitNumber: z.string().min(1).max(20),
  unitType: z.enum(["apartment", "studio", "penthouse", "loft", "room"]),
  floor: z.number().min(0).max(200).optional(),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  squareFootage: z.number().min(50).max(50000),
  rentAmount: z.number().min(0).max(100000),
  securityDeposit: z.number().min(0).max(50000),
  status: z.nativeEnum(PropertyStatus).default(PropertyStatus.AVAILABLE),

  // Outdoor Features
  balcony: z.boolean().default(false),
  patio: z.boolean().default(false),
  garden: z.boolean().default(false),

  // Interior Features
  dishwasher: z.boolean().default(false),
  inUnitLaundry: z.boolean().default(false),
  hardwoodFloors: z.boolean().default(false),
  fireplace: z.boolean().default(false),
  walkInClosets: z.boolean().default(false),
  centralAir: z.boolean().default(false),
  ceilingFans: z.boolean().default(false),

  // Appliances
  appliances: z
    .object({
      refrigerator: z.boolean().default(false),
      stove: z.boolean().default(false),
      oven: z.boolean().default(false),
      microwave: z.boolean().default(false),
      dishwasher: z.boolean().default(false),
      washer: z.boolean().default(false),
      dryer: z.boolean().default(false),
      washerDryerHookups: z.boolean().default(false),
    })
    .default({}),

  // Parking Details
  parking: z
    .object({
      included: z.boolean().default(false),
      spaces: z.number().min(0).max(10).default(0),
      type: z.enum(["garage", "covered", "open", "street"]).default("open"),
      gated: z.boolean().default(false),
      assigned: z.boolean().default(false),
    })
    .default({}),

  // Utilities Included
  utilities: z
    .object({
      electricity: z.enum(["included", "tenant", "shared"]).default("tenant"),
      water: z.enum(["included", "tenant", "shared"]).default("tenant"),
      gas: z.enum(["included", "tenant", "shared"]).default("tenant"),
      internet: z.enum(["included", "tenant", "shared"]).default("tenant"),
      cable: z.enum(["included", "tenant", "shared"]).default("tenant"),
      heating: z.enum(["included", "tenant", "shared"]).default("tenant"),
      cooling: z.enum(["included", "tenant", "shared"]).default("tenant"),
      trash: z.enum(["included", "tenant", "shared"]).default("included"),
      sewer: z.enum(["included", "tenant", "shared"]).default("included"),
    })
    .default({}),

  // Additional Details
  notes: z.string().max(1000).optional(),
  images: z.array(z.string()).default([]),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1),
        fileUrl: z.string().url(),
        fileSize: z.number().min(0),
        fileType: z.string().min(1),
      })
    )
    .max(20)
    .default([]),
  availableFrom: z.date().optional(),
  lastRenovated: z.date().optional(),
});

// Property attachment schema
const propertyAttachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileSize: z.number().min(0),
  fileType: z.string().min(1),
});

// Export unit form data type
export type InlineUnitFormData = z.infer<typeof unitSchema>;

// Enhanced property validation schemas

// Cross-field rule: HMO licence expiry must be after the issue date.
// Only fires when both are present, so partial updates stay valid.
const refineHmoLicenceDates = (
  data: { hmoLicenseIssueDate?: Date; hmoLicenseExpiry?: Date },
  ctx: z.RefinementCtx
) => {
  if (
    data.hmoLicenseIssueDate &&
    data.hmoLicenseExpiry &&
    data.hmoLicenseExpiry <= data.hmoLicenseIssueDate
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hmoLicenseExpiry"],
      message: "Licence expiry must be after the issue date",
    });
  }
};

// Base object kept un-refined so propertyUpdateSchema can derive from it
// via .partial()/.omit() (those aren't available on a refined ZodEffects).
const propertyCreateBaseSchema = z.object({
  // Basic Information
  propertyOwnerName: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name too long"),
  ownerType: z.nativeEnum(PropertyownerType, {
    errorMap: () => ({ message: "Owner type is required" }),
  }),
  name: z
    .string()
    .min(1, "Property name is required")
    .max(200, "Property name too long"),
  description: z.string().max(2000, "Description too long").optional(),
  type: z.nativeEnum(PropertyType, {
    errorMap: () => ({ message: "Property type is required" }),
  }),
  status: z.nativeEnum(PropertyStatus).default(PropertyStatus.AVAILABLE),

  // Address
  address: addressSchema,

  // Property Type Configuration
  isMultiUnit: z.boolean().default(false),
  totalUnits: z.number().min(1).max(1000).default(1),

  // Embedded Units array (unified approach)
  units: z.array(unitSchema).max(1000, "Too many units").default([]),

  // Year Built
  yearBuilt: z
    .number()
    .min(1800, "Year built cannot be before 1800")
    .max(
      new Date().getFullYear() + 5,
      "Year built cannot be more than 5 years in the future"
    )
    .optional(),

  // Property Features
  features: z.array(z.string()).default([]),

  // Property Amenities
  amenities: z.array(amenitySchema).max(50, "Too many amenities").default([]),

  // Images and Attachments
  images: z.array(z.string()).max(20, "Too many images").default([]),
  attachments: z
    .array(propertyAttachmentSchema)
    .max(20, "Too many attachments")
    .default([]),

  ownerId: z.string().min(1, "Owner ID is required").optional(),
  assignedAgentId: z.string().optional(),
  managerId: z.string().min(1, "Manager ID is required").optional(),

  // HMO compliance licence (UK) — HMO only, optional.
  // Dates arrive as ISO "yyyy-MM-dd" strings and are coerced to Date.
  hmoLicenseNumber: z.string().max(100, "Licence number too long").optional(),
  hmoLicenseIssueDate: z.coerce.date().optional(),
  hmoLicenseExpiry: z.coerce.date().optional(),
});

export const propertyCreateSchema =
  propertyCreateBaseSchema.superRefine(refineHmoLicenceDates);

/**
 * `managerId` is deliberately NOT omitted any more.
 *
 * Omitting it made Zod strip the field before the route's role check ever ran,
 * so an admin could not reassign a property's manager at all — the guard in
 * properties/[id]/route.ts was dead code. Authorisation is enforced there
 * instead: non-admins have `managerId` and `assignedAgentId` stripped from the
 * payload, because assignment grants visibility.
 *
 * `ownerId` stays omitted — it records who created the property and must not
 * be rewritten by anyone.
 */
export const propertyUpdateSchema = propertyCreateBaseSchema
  .partial()
  .omit({ ownerId: true })
  .superRefine(refineHmoLicenceDates);

export const propertyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  type: z.nativeEnum(PropertyType).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  minRent: z.coerce.number().min(0).optional(),
  maxRent: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isMultiUnit: z.boolean().optional(),
  amenities: z.string().optional(),
  hasAvailableUnits: z.boolean().optional(),
  unitType: z
    .enum(["apartment", "studio", "penthouse", "loft", "room"])
    .optional(),
  sortBy: z
    .enum(["name", "rentAmount", "createdAt", "squareFootage"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Legacy schema for backward compatibility
export const propertySchema = propertyCreateSchema;

// ============================================================================
// TENANT VALIDATIONS
// ============================================================================

// Note: emergencyContactSchema and employmentInfoSchema are defined above in USER VALIDATIONS section

export const tenantSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  dateOfBirth: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") return new Date(val);
      return val;
    }),
  nino: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === "") return undefined;
      // Normalise: strip spaces + uppercase ("qq 12 34 56 c" -> "QQ123456C")
      return val.replace(/\s+/g, "").toUpperCase();
    })
    .refine(
      (val) => {
        if (!val) return true;
        return /^(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(
          val
        );
      },
      { message: "Invalid National Insurance number" }
    ),
  employmentInfo: employmentInfoSchema.optional(),
  emergencyContacts: z
    .array(emergencyContactSchema)
    .max(5, "Too many emergency contacts")
    .default([]),
  creditScore: z
    .number()
    .min(300, "Credit score too low")
    .max(850, "Credit score too high")
    .optional(),
  backgroundCheckStatus: z
    .enum(["pending", "approved", "rejected"])
    .default("pending"),
  moveInDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val || (typeof val === "string" && val.trim() === ""))
        return undefined;
      if (typeof val === "string") {
        const date = new Date(val);
        if (isNaN(date.getTime())) return undefined;
        return date;
      }
      return val;
    })
    .refine(
      (val) => {
        if (!val) return true; // Allow empty/undefined values

        const moveDate = new Date(val);
        if (isNaN(moveDate.getTime())) return false;

        // Allow move-in dates from 5 years ago to 5 years in the future
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        const fiveYearsFromNow = new Date();
        fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

        return moveDate >= fiveYearsAgo && moveDate <= fiveYearsFromNow;
      },
      {
        message:
          "Move-in date must be within reasonable range (5 years ago to 5 years from now)",
      }
    ),
  applicationDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return new Date();
      if (typeof val === "string") return new Date(val);
      return val;
    }),
  documents: z.array(z.string()).default([]),
});

// ============================================================================
// LEASE VALIDATIONS
// ============================================================================

export const lateFeeConfigSchema = z.object({
  enabled: z.boolean().default(false),
  gracePeriodDays: z
    .number()
    .min(0, "Grace period cannot be negative")
    .max(30, "Grace period cannot exceed 30 days")
    .default(5),
  feeType: z.enum(["fixed", "percentage", "tiered", "daily"]).default("fixed"),
  feeAmount: z
    .number()
    .min(0, "Fee amount cannot be negative")
    .max(1000, "Fee amount too high"),
  maxFeeAmount: z
    .number()
    .min(0, "Maximum fee amount cannot be negative")
    .optional(),
  minFeeAmount: z
    .number()
    .min(0, "Minimum fee amount cannot be negative")
    .optional(),
  compoundDaily: z.boolean().default(false),
  notificationDays: z.array(z.number()).default([3, 7, 14]),
})
  // feeAmount's plain .max(1000) is right for a fixed fee but meaningless for a
  // percentage, where anything over 100 charges more than the rent itself. The
  // cap has to be cross-field, so it lives here rather than on the field.
  .refine(
    (config) => config.feeType !== "percentage" || config.feeAmount <= 100,
    {
      message: "A percentage late fee cannot be more than 100%",
      path: ["feeAmount"],
    }
  );

export const leasePaymentConfigSchema = z.object({
  rentDueDay: z
    .number()
    .min(1, "Rent due day must be between 1 and 31")
    .max(31, "Rent due day must be between 1 and 31")
    .default(1),
  lateFeeConfig: lateFeeConfigSchema,
  autoGenerateInvoices: z.boolean().default(true),
  autoEmailInvoices: z.boolean().default(false),
  autoCreatePayments: z.boolean().default(true),
  prorationEnabled: z.boolean().default(true),
  advancePaymentMonths: z
    .number()
    .min(0, "Advance payment months cannot be negative")
    .max(12, "Advance payment months cannot exceed 12")
    .default(0),
});

export const leaseTermsSchema = z.object({
  rentAmount: z
    .number()
    .min(0, "Rent cannot be negative")
    .max(100000, "Rent too high"),
  // Calculated total for Day/Week tenancies (rate x number of periods).
  // Optional — Monthly tenancies don't carry a fixed total.
  totalAmount: z
    .number()
    .min(0, "Total amount cannot be negative")
    .max(100000000, "Total amount too high")
    .optional(),
  securityDeposit: z
    .number()
    .min(0, "Security deposit cannot be negative")
    .max(50000, "Security deposit too high"),
  lateFee: z
    .number()
    .min(0, "Late fee cannot be negative")
    .max(1000, "Late fee too high"),
  petDeposit: z
    .number()
    .min(0, "Pet deposit cannot be negative")
    .max(5000, "Pet deposit too high")
    .optional(),
  utilities: z
    .array(
      z.enum([
        "electricity",
        "gas",
        "water",
        "sewer",
        "trash",
        "internet",
        "cable",
        "heating",
        "cooling",
        "landscaping",
      ])
    )
    .default([]),
  restrictions: z
    .array(z.string())
    .max(20, "Too many restrictions")
    .default([]),
  paymentConfig: leasePaymentConfigSchema.optional(),
});

export const leaseSchema = z
  .object({
    propertyId: z.string().min(1, "Property ID is required"),
    unitId: z.string().min(1, "Unit ID is required"),
    tenantId: z.string().min(1, "Tenant ID is required"),
    // How rent is collected. Monthly tenancies are open-ended (no end date).
    rentPeriod: z.enum(["month", "week", "day"]).default("month"),
    startDate: z
      .string()
      .min(1, "Start date is required")
      .transform((val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid start date format");
        }
        return date;
      }),
    endDate: z
      .string()
      .transform((val) => {
        if (!val) return undefined;
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid end date format");
        }
        return date;
      }),

    status: z
      .enum(["draft", "pending", "active", "expired", "terminated"])
      .optional(),
    terms: leaseTermsSchema,
    documents: z.array(z.string().url("Invalid document URL")).optional(),
    renewalOptions: z
      .object({
        available: z.boolean().default(false),
        terms: z.string().max(1000, "Renewal terms too long").optional(),
      })
      .optional(),
    notes: z.string().max(2000, "Notes too long").optional(),
  })
  .superRefine((data, ctx) => {

    // When an end date is present it must be after the start date.
    if (data.endDate && data.startDate && data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

// Lease update schema (partial without refinement for updates)
export const leaseUpdateSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required").optional(),
  unitId: z.string().min(1, "Unit ID is required").optional(),
  tenantId: z.string().min(1, "Tenant ID is required").optional(),
  rentPeriod: z.enum(["month", "week", "day"]).optional(),
  startDate: z
    .string()
    .min(1, "Start date is required")
    .transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid start date format");
      }
      return date;
    })
    .optional(),
  endDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined; // null or missing → no end date
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid end date format");
      }
      return date;
    }),
  status: z
    .enum(["draft", "pending", "active", "expired", "terminated"])
    .optional(),
  terms: leaseTermsSchema.partial().optional(),
  documents: z.array(z.string().url("Invalid document URL")).optional(),
  renewalOptions: z
    .object({
      available: z.boolean().default(false),
      terms: z.string().max(1000, "Renewal terms too long").optional(),
    })
    .optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
});

// ============================================================================
// PAYMENT VALIDATIONS
// ============================================================================

export const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  propertyId: z.string().min(1, "Property ID is required"),
  leaseId: z.string().optional(),
  amount: z
    .number()
    .min(0.01, "Amount must be at least $0.01")
    .max(100000, "Amount too high"),
  type: z.nativeEnum(PaymentType),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  dueDate: z.date(),
  description: z.string().max(500, "Description too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export const paymentCreateSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  propertyId: z.string().min(1, "Property is required"),
  leaseId: z.string().optional(),
  amount: z
    .number({ required_error: "Amount is required" })
    .min(0.01, "Amount must be at least $0.01")
    .max(100000, "Amount cannot exceed $100,000"),
  type: z.nativeEnum(PaymentType, {
    required_error: "Payment type is required",
  }),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  dueDate: z.date({ required_error: "Due date is required" }),
  description: z.string().max(500, "Description too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export const paymentUpdateSchema = paymentCreateSchema.partial().extend({
  status: z
    .enum(["pending", "processing", "completed", "failed", "refunded"])
    .optional(),
  paidDate: z.date().optional(),
});

// ============================================================================
// MAINTENANCE VALIDATIONS
// ============================================================================

// Optional reference-id fields (tenant/unit/assignee) can arrive as an empty
// string when nothing is selected in the form. Coerce "" (or whitespace) to
// undefined so it doesn't reach Mongoose as "" and fail ObjectId casting —
// keeping these fields genuinely optional end-to-end.
const optionalRefId = z
  .string()
  .optional()
  .transform((val) => {
    const trimmed = val?.trim();
    return trimmed ? trimmed : undefined;
  });

export const maintenanceRequestSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  unitId: optionalRefId,
  tenantId: optionalRefId,
  assignedTo: optionalRefId,
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description too long"),
  priority: z
    .nativeEnum(MaintenancePriority)
    .default(MaintenancePriority.MEDIUM),
  category: z.enum([
    "Plumbing",
    "Electrical",
    "HVAC",
    "Appliances",
    "Flooring",
    "Painting",
    "Roofing",
    "Windows",
    "Doors",
    "Landscaping",
    "Cleaning",
    "Pest Control",
    "Security",
    "General Repair",
    "Emergency",
    "Other",
  ]),
  images: z
    .array(z.string().url("Invalid image URL"))
    .max(10, "Too many images")
    .default([]),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Contact phone must be at least 7 characters")
    .max(20, "Contact phone cannot exceed 20 characters")
    .optional(),
  estimatedCost: z
    .number()
    .min(0, "Cost cannot be negative")
    .max(100000, "Cost too high")
    .optional(),
  scheduledDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date format");
        }
        return date;
      }
      return val;
    }),
  notes: z.string().max(1000, "Notes too long").optional(),
});

// ============================================================================
// SEARCH AND FILTER VALIDATIONS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().min(1, "Page must be at least 1").default(1),
  limit: z
    .number()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit too high")
    .default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

export const propertyFilterSchema = paginationSchema.extend({
  type: z.nativeEnum(PropertyType).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  minRent: z.number().min(0).optional(),
  maxRent: z.number().min(0).optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const paymentFilterSchema = paginationSchema.extend({
  type: z.nativeEnum(PaymentType).optional(),
  status: z
    .enum(["pending", "processing", "completed", "failed", "refunded"])
    .optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  tenantId: z.string().optional(),
  propertyId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ============================================================================
// TENANT PAYMENT VALIDATIONS
// ============================================================================

export const tenantPaymentProcessSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  savePaymentMethod: z.boolean().optional().default(false),
  confirmAmount: z
    .number()
    .min(0.01, "Amount must be at least $0.01")
    .max(100000, "Amount too high")
    .optional(),
});

export const tenantPaymentFilterSchema = z.object({
  status: z.enum(["all", "paid", "pending", "overdue", "failed"]).optional(),
  type: z
    .enum(["all", "rent", "security_deposit", "late_fee", "utility", "other"])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(10),
});

export const receiptRequestSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  format: z.enum(["pdf", "json"]).optional().default("pdf"),
});

// ============================================================================
// API RESPONSE VALIDATIONS
// ============================================================================

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ["Validation failed"] };
  }
}

export function createApiError(message: string, statusCode: number = 400) {
  const error = new Error(message) as unknown;
  (error as { statusCode: number }).statusCode = statusCode;
  return error;
}

// ============================================================================
// WORK ORDER VALIDATION SCHEMAS
// ============================================================================

export const workOrderSchema = z.object({
  maintenanceRequestId: z.string().min(1, "Maintenance request ID is required"),
  assignedTo: z.string().min(1, "Assigned user ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description too long"),
  status: z
    .enum(["pending", "assigned", "in_progress", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
  estimatedCost: z
    .number()
    .min(0, "Estimated cost must be non-negative")
    .optional(),
  actualCost: z.number().min(0, "Actual cost must be non-negative").optional(),
  scheduledDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
  materials: z.array(z.string().max(200, "Material name too long")).optional(),
  laborHours: z.number().min(0, "Labor hours must be non-negative").optional(),
});

export const workOrderUpdateSchema = workOrderSchema.partial();

// ============================================================================
// APPLICATION VALIDATIONS
// ============================================================================

export const applicationFeeSchema = z.object({
  amount: z
    .number()
    .min(0, "Application fee cannot be negative")
    .max(1000, "Application fee too high"),
  status: z.enum(["pending", "paid", "refunded", "waived"]).default("pending"),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  paidAt: z.date().optional(),
});

export const applicationDocumentSchema = z.object({
  type: z.enum([
    "id_verification",
    "income_verification",
    "employment_letter",
    "bank_statement",
    "reference_letter",
    "previous_lease",
    "other",
  ]),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  uploadedAt: z.date().default(() => new Date()),
  verified: z.boolean().default(false),
});

export const previousAddressSchema = z.object({
  address: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address too long"),
  landlordName: z.string().max(100, "Landlord name too long").optional(),
  landlordContact: z.string().max(100, "Landlord contact too long").optional(),
  moveInDate: z.date(),
  moveOutDate: z.date(),
  reasonForLeaving: z.string().max(500, "Reason too long").optional(),
});

export const applicationSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  applicantId: z.string().min(1, "Applicant ID is required"),
  status: z
    .enum([
      "draft",
      "submitted",
      "under_review",
      "screening_in_progress",
      "approved",
      "rejected",
      "withdrawn",
    ])
    .default("draft"),
  applicationFee: applicationFeeSchema,
  personalInfo: z.object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name too long"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name too long"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    dateOfBirth: z.date(),
    nino: z
      .string()
      .regex(
        /^(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/,
        "National Insurance number must be in format QQ123456C"
      )
      .optional(),
  }),
  employmentInfo: z
    .object({
      employer: z.string().max(200, "Employer name too long").optional(),
      position: z.string().max(100, "Position too long").optional(),
      income: z
        .number()
        .min(0, "Income cannot be negative")
        .max(10000000, "Income too high")
        .optional(),
      startDate: z.date().optional(),
      employerContact: z
        .string()
        .max(100, "Employer contact too long")
        .optional(),
    })
    .optional(),
  emergencyContacts: z
    .array(emergencyContactSchema)
    .max(5, "Too many emergency contacts")
    .default([]),
  previousAddresses: z
    .array(previousAddressSchema)
    .max(10, "Too many previous addresses")
    .default([]),
  documents: z
    .array(applicationDocumentSchema)
    .max(20, "Too many documents")
    .default([]),
  additionalInfo: z
    .object({
      pets: z.string().max(1000, "Pet information too long").optional(),
      vehicles: z.string().max(1000, "Vehicle information too long").optional(),
      reasonForMoving: z
        .string()
        .max(1000, "Reason for moving too long")
        .optional(),
      additionalNotes: z
        .string()
        .max(2000, "Additional notes too long")
        .optional(),
    })
    .optional(),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().max(2000, "Review notes too long").optional(),
});

export const applicationUpdateSchema = applicationSchema.partial();

// ============================================================================
// SCREENING VALIDATIONS
// ============================================================================

export const creditReportSchema = z.object({
  score: z
    .number()
    .min(300, "Credit score too low")
    .max(850, "Credit score too high"),
  reportDate: z.date().default(() => new Date()),
  provider: z.enum(["TransUnion", "Experian", "Equifax", "Other"]),
  reportId: z.string().min(1, "Report ID is required"),
  details: z.any().optional(),
});

export const backgroundCheckSchema = z.object({
  status: z.enum(["clear", "flagged", "failed"]),
  reportDate: z.date().default(() => new Date()),
  provider: z.string().min(1, "Provider is required"),
  reportId: z.string().min(1, "Report ID is required"),
  findings: z.array(z.string()).max(50, "Too many findings").default([]),
  details: z.any().optional(),
});

export const evictionHistorySchema = z.object({
  hasEvictions: z.boolean().default(false),
  reportDate: z.date().default(() => new Date()),
  provider: z.string().min(1, "Provider is required"),
  reportId: z.string().min(1, "Report ID is required"),
  evictions: z
    .array(
      z.object({
        date: z.date(),
        location: z.string().max(200, "Location too long"),
        amount: z.number().min(0, "Amount cannot be negative").optional(),
        status: z.enum(["filed", "judgment", "dismissed", "settled"]),
      })
    )
    .max(20, "Too many eviction records")
    .default([]),
});

export const screeningReportSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  applicantId: z.string().min(1, "Applicant ID is required"),
  status: z
    .enum(["pending", "in_progress", "completed", "failed"])
    .default("pending"),
  creditReport: creditReportSchema.optional(),
  backgroundCheck: backgroundCheckSchema.optional(),
  evictionHistory: evictionHistorySchema.optional(),
  overallScore: z
    .number()
    .min(0, "Score cannot be negative")
    .max(100, "Score cannot exceed 100")
    .optional(),
  recommendation: z.enum(["approve", "reject", "conditional"]).optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
  completedAt: z.date().optional(),
});

// ============================================================================
// INSPECTION VALIDATIONS
// ============================================================================

export const inspectionItemSchema = z.object({
  room: z.string().min(1, "Room is required").max(100, "Room name too long"),
  item: z
    .string()
    .min(1, "Item is required")
    .max(200, "Item description too long"),
  condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
  notes: z.string().max(1000, "Notes too long").optional(),
  photos: z
    .array(z.string().url("Invalid photo URL"))
    .max(10, "Too many photos per item")
    .default([]),
  requiresAttention: z.boolean().default(false),
});

export const inspectionSignatureSchema = z.object({
  signedAt: z.date().default(() => new Date()),
  signature: z.string().min(1, "Signature data is required"),
  ipAddress: z.string().optional(),
});

export const inspectionSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  tenantId: z.string().optional(),
  leaseId: z.string().optional(),
  type: z.enum(["move_in", "move_out", "routine", "maintenance"]),
  status: z
    .enum(["scheduled", "in_progress", "completed", "cancelled"])
    .default("scheduled"),
  scheduledDate: z.date(),
  completedDate: z.date().optional(),
  inspectorId: z.string().min(1, "Inspector ID is required"),
  items: z
    .array(inspectionItemSchema)
    .max(200, "Too many inspection items")
    .default([]),
  overallCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  tenantSignature: inspectionSignatureSchema.optional(),
  inspectorSignature: inspectionSignatureSchema.optional(),
  photos: z
    .array(z.string().url("Invalid photo URL"))
    .max(50, "Too many photos")
    .default([]),
  notes: z.string().max(2000, "Notes too long").optional(),
});

export const inspectionUpdateSchema = inspectionSchema.partial();

// ============================================================================
// DOCUMENT VALIDATION SCHEMAS
// ============================================================================

export const documentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  type: z.enum([
    "lease",
    "application",
    "inspection",
    "maintenance",
    "financial",
    "photo",
    "other",
  ]),
  status: z
    .enum(["active", "pending_approval", "approved", "rejected", "archived"])
    .optional(),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().min(0, "File size must be non-negative"),
  mimeType: z.string().min(1, "MIME type is required"),
  propertyId: z.string().optional(),
  tenantId: z.string().optional(),
  leaseId: z.string().optional(),
  uploadedBy: z.string().min(1, "Uploader ID is required"),
  isShared: z.boolean().optional(),
  tags: z.array(z.string().max(50, "Tag too long")).optional(),
  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category too long"),
});

export const documentUpdateSchema = documentSchema.partial();

// ============================================================================
// SETTINGS VALIDATIONS
// ============================================================================

export const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    paymentReminders: z.boolean().default(true),
    maintenanceUpdates: z.boolean().default(true),
    leaseReminders: z.boolean().default(true),
    propertyNews: z.boolean().default(false),
    systemAlerts: z.boolean().default(true),
    marketingEmails: z.boolean().default(false),
    weeklyReports: z.boolean().default(true),
    monthlyReports: z.boolean().default(true),
    tenantMessages: z.boolean().default(true),
    documentSharing: z.boolean().default(true),
    calendarReminders: z.boolean().default(true),
    frequency: z.enum(["immediate", "daily", "weekly"]).default("immediate"),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      startTime: z.string().default("22:00"),
      endTime: z.string().default("08:00"),
    }),
  }),
  sms: z.object({
    enabled: z.boolean().default(false),
    emergencyOnly: z.boolean().default(true),
    paymentReminders: z.boolean().default(false),
    maintenanceUpdates: z.boolean().default(false),
    leaseReminders: z.boolean().default(false),
    systemAlerts: z.boolean().default(false),
    frequency: z.enum(["immediate", "daily"]).default("immediate"),
    quietHours: z.object({
      enabled: z.boolean().default(true),
      startTime: z.string().default("22:00"),
      endTime: z.string().default("08:00"),
    }),
  }),
  push: z.object({
    enabled: z.boolean().default(true),
    paymentReminders: z.boolean().default(true),
    maintenanceUpdates: z.boolean().default(true),
    leaseReminders: z.boolean().default(true),
    systemAlerts: z.boolean().default(true),
    tenantMessages: z.boolean().default(true),
    documentSharing: z.boolean().default(true),
    calendarReminders: z.boolean().default(true),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      startTime: z.string().default("22:00"),
      endTime: z.string().default("08:00"),
    }),
  }),
  inApp: z.object({
    enabled: z.boolean().default(true),
    showDesktopNotifications: z.boolean().default(true),
    soundEnabled: z.boolean().default(true),
    badgeCount: z.boolean().default(true),
    autoMarkAsRead: z.boolean().default(false),
    groupSimilar: z.boolean().default(true),
  }),
});

export const securitySettingsSchema = z.object({
  twoFactorAuth: z.object({
    enabled: z.boolean().default(false),
    method: z.enum(["sms", "email", "authenticator"]).default("email"),
    backupCodes: z.array(z.string()).optional(),
  }),
  loginAlerts: z.boolean().default(true),
  sessionTimeout: z.number().min(15).max(480).default(60),
  passwordRequirements: z.object({
    minLength: z.number().min(6).max(32).default(MIN_PASSWORD_LENGTH),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSpecialChars: z.boolean().default(false),
  }),
});

export const displaySettingsSchema = z.object({
  // Core theme settings
  theme: z.enum(["light", "dark", "system"]).default("system"),

  // Language settings (short language code like "en", "es")
  language: z.string().default("en"),

  // Currency settings
  currency: z.string().default("USD"),

  // Branding settings (simplified to only what's used in the UI)
  branding: z
    .object({
      logoLight: z.string().default("/images/logo-light.png"),
      logoDark: z.string().default("/images/logo-dark.png"),
      favicon: z.string().default("/favicon.ico"),
      primaryColor: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .default("#3B82F6"),
      secondaryColor: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .default("#64748B"),
      companyName: z.string().optional(),
      companyAddress: z.string().optional(),
      // Optional R2 metadata saved with branding
      r2: z
        .object({
          logoLight: z
            .object({
              objectKey: z.string().optional(),
              format: z.string().optional(),
              width: z.number().optional(),
              height: z.number().optional(),
              bytes: z.number().optional(),
              optimizedUrls: z.record(z.string()).optional(),
            })
            .optional(),
          logoDark: z
            .object({
              objectKey: z.string().optional(),
              format: z.string().optional(),
              width: z.number().optional(),
              height: z.number().optional(),
              bytes: z.number().optional(),
              optimizedUrls: z.record(z.string()).optional(),
            })
            .optional(),
          favicon: z
            .object({
              objectKey: z.string().optional(),
              format: z.string().optional(),
              width: z.number().optional(),
              height: z.number().optional(),
              bytes: z.number().optional(),
              optimizedUrls: z.record(z.string()).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z
    .enum(["public", "private", "contacts"])
    .default("private"),
  showOnlineStatus: z.boolean().default(true),
  allowDataCollection: z.boolean().default(true),
  allowMarketing: z.boolean().default(false),
  shareUsageData: z.boolean().default(true),
  showContactInfo: z.boolean().default(false),
  allowDirectMessages: z.boolean().default(true),
  showActivityStatus: z.boolean().default(true),
  allowSearchEngineIndexing: z.boolean().default(false),
  shareLocationData: z.boolean().default(false),
  allowThirdPartyIntegrations: z.boolean().default(true),
  dataRetentionPeriod: z.number().min(30).max(2555).default(365),
  cookiePreferences: z.object({
    essential: z.boolean().default(true),
    analytics: z.boolean().default(true),
    marketing: z.boolean().default(false),
    personalization: z.boolean().default(true),
  }),
});

export const profileSettingsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  address: z.string().optional(),
  avatar: z.string().url("Invalid avatar URL").optional().or(z.literal("")),

  // Professional Information
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  dateOfBirth: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date format");
        }
        return date;
      }
      return val;
    }),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .default("prefer_not_to_say"),

  // Emergency Contact
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relationship: z.string().optional(),
    })
    .optional(),

  // Social Links
  socialLinks: z
    .object({
      linkedin: z
        .string()
        .url("Invalid LinkedIn URL")
        .optional()
        .or(z.literal("")),
      twitter: z
        .string()
        .url("Invalid Twitter URL")
        .optional()
        .or(z.literal("")),
      facebook: z
        .string()
        .url("Invalid Facebook URL")
        .optional()
        .or(z.literal("")),
      instagram: z
        .string()
        .url("Invalid Instagram URL")
        .optional()
        .or(z.literal("")),
    })
    .optional(),

  // User Preferences
  preferences: z
    .object({
      preferredContactMethod: z
        .enum(["email", "phone", "sms"])
        .default("email"),
      language: z.string().default("en"),
      timezone: z.string().default("America/New_York"),
      newsletter: z.boolean().default(false),
      marketingEmails: z.boolean().default(false),
    })
    .optional(),
});

// Profile settings schema for updates (with required validation)
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  address: z.string().optional(),
  avatar: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relationship: z.string().optional(),
    })
    .optional(),
  socialLinks: z
    .object({
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
    })
    .optional(),
  preferences: z
    .object({
      preferredContactMethod: z.enum(["email", "phone", "sms"]).optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      newsletter: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
    })
    .optional(),
});

export const userSettingsSchema = z.object({
  profile: profileSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
  security: securitySettingsSchema.optional(),
  display: displaySettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
});

export const systemSettingSchema = z.object({
  category: z.enum([
    "general",
    "email",
    "payment",
    "maintenance",
    "security",
    "branding",
    "appearance",
    "localization",
    "notifications",
    "integrations",
  ]),
  key: z.string().min(1).max(100),
  value: z.any(),
  dataType: z.enum([
    "string",
    "number",
    "boolean",
    "object",
    "array",
    "file",
    "url",
    "color",
    "json",
  ]),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  isEditable: z.boolean().default(true),
  validationRules: z
    .object({
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      enum: z.array(z.string()).optional(),
      fileTypes: z.array(z.string()).optional(),
      maxFileSize: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
    })
    .optional(),
  metadata: z
    .object({
      group: z.string().optional(),
      order: z.number().default(0).optional(),
      helpText: z.string().optional(),
      icon: z.string().optional(),
      tags: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
    })
    .optional(),
});

export const systemSettingsQuerySchema = z.object({
  category: z
    .enum([
      "general",
      "email",
      "payment",
      "maintenance",
      "security",
      "branding",
      "appearance",
      "localization",
      "notifications",
      "integrations",
    ])
    .optional(),
  isPublic: z.boolean().optional(),
  isEditable: z.boolean().optional(),
  group: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});


// ============================================================================
// COMPLIANCE REPORT VALIDATION SCHEMAS
// Add these to your @/lib/validations file alongside leaseSchema, etc.
// ============================================================================

// Schema for POST /api/compliance - mirrors the form payload exactly
export const complianceReportSchema = z
  .object({
    propertyId: z
      .string()
      .min(1, "Property is required")
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid property ID"),
    category: z.nativeEnum(ComplianceCategory, {
      errorMap: () => ({ message: "Invalid compliance type" }),
    }),
    issueDate: z.coerce.date({
      errorMap: () => ({ message: "Issue date is required" }),
    }),
    expiryDate: z.coerce.date({
      errorMap: () => ({ message: "Expiry date is required" }),
    }),
    notes: z.string().max(1000, "Notes too long").optional(),
    estimatedCost: z
      .number()
      .min(0, "Cost cannot be negative")
      .max(1_000_000, "Cost cannot exceed $1,000,000")
      .optional(),
    images: z
      .array(z.string().url("Invalid image URL"))
      .max(10, "Too many images")
      .default([]),
    status: z.nativeEnum(ComplianceStatus).optional(),
  })
  .refine((data) => data.expiryDate > data.issueDate, {
    message: "Expiry date must be after issue date",
    path: ["expiryDate"],
  })
  .refine((data) => data.issueDate <= new Date(), {
    message: "Issue date cannot be in the future",
    path: ["issueDate"],
  });

// Schema for PUT /api/compliance/:id - all fields optional, but if both
// dates are provided, expiry must still be after issue.
export const complianceReportUpdateSchema = z
  .object({
    propertyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid property ID")
      .optional(),
    category: z.nativeEnum(ComplianceCategory).optional(),
    issueDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    notes: z.string().max(1000).optional(),
    estimatedCost: z.number().min(0).max(1_000_000).optional(),
    // Optional, not `.default([])` — this is a partial update, so an omitted
    // `images` key must leave existing documents alone rather than clear them.
    images: z
      .array(z.string().url("Invalid image URL"))
      .max(10, "Too many images")
      .optional(),
    status: z.nativeEnum(ComplianceStatus).optional(),
  })
  .refine(
    (data) => {
      if (data.issueDate && data.expiryDate) {
        return data.expiryDate > data.issueDate;
      }
      return true;
    },
    { message: "Expiry date must be after issue date", path: ["expiryDate"] }
  );

// Schema for bulk update payload
export const complianceBulkUpdateSchema = z.object({
  reportIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid report ID"))
    .min(1, "reportIds array is required"),
  updates: z
    .object({
      category: z.nativeEnum(ComplianceCategory).optional(),
      status: z.nativeEnum(ComplianceStatus).optional(),
      notes: z.string().max(1000).optional(),
      estimatedCost: z.number().min(0).max(1_000_000).optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field is required in updates",
    }),
});