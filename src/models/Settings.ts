import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import mongoose, { Schema, Document, Model } from "mongoose";

// Enums for settings
export enum SettingsType {
  USER = "user",
  SYSTEM = "system",
}

export enum SettingsCategory {
  PROFILE = "profile",
  NOTIFICATIONS = "notifications",
  SECURITY = "security",
  DISPLAY = "display",
  PRIVACY = "privacy",
  SYSTEM_BRANDING = "system_branding",
  SYSTEM_EMAIL = "system_email",
  SYSTEM_PAYMENT = "system_payment",
  SYSTEM_SECURITY = "system_security",
  SYSTEM_MAINTENANCE = "system_maintenance",
  SYSTEM_INTEGRATIONS = "system_integrations",
}

// Profile Settings Schema
const profileSettingsSchema = new Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String },
    bio: { type: String, maxlength: 500 },
    location: { type: String },
    city: { type: String },
    website: { type: String },
    address: { type: String },
    avatar: { type: String }, // URL to uploaded avatar

    // Professional Information
    jobTitle: { type: String },
    company: { type: String },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },

    // Emergency Contact
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },

    // Social Links
    socialLinks: {
      linkedin: { type: String },
      twitter: { type: String },
      facebook: { type: String },
      instagram: { type: String },
    },

    // User Preferences
    preferences: {
      preferredContactMethod: {
        type: String,
        enum: ["email", "phone", "sms"],
        default: "email",
      },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "America/New_York" },
      newsletter: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

// Notification Settings Schema
const notificationSettingsSchema = new Schema(
  {
    email: {
      enabled: { type: Boolean, default: true },
      paymentReminders: { type: Boolean, default: true },
      maintenanceUpdates: { type: Boolean, default: true },
      leaseReminders: { type: Boolean, default: true },
      propertyNews: { type: Boolean, default: false },
      systemAlerts: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      weeklyReports: { type: Boolean, default: true },
      monthlyReports: { type: Boolean, default: true },
      tenantMessages: { type: Boolean, default: true },
      documentSharing: { type: Boolean, default: true },
      calendarReminders: { type: Boolean, default: true },
      frequency: {
        type: String,
        enum: ["immediate", "daily", "weekly"],
        default: "immediate",
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: "22:00" },
        endTime: { type: String, default: "08:00" },
      },
    },
    sms: {
      enabled: { type: Boolean, default: false },
      emergencyOnly: { type: Boolean, default: true },
      paymentReminders: { type: Boolean, default: false },
      maintenanceUpdates: { type: Boolean, default: false },
      leaseReminders: { type: Boolean, default: false },
      systemAlerts: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["immediate", "daily", "weekly"],
        default: "immediate",
      },
      quietHours: {
        enabled: { type: Boolean, default: true },
        startTime: { type: String, default: "22:00" },
        endTime: { type: String, default: "08:00" },
      },
    },
    push: {
      enabled: { type: Boolean, default: true },
      paymentReminders: { type: Boolean, default: true },
      maintenanceUpdates: { type: Boolean, default: true },
      leaseReminders: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      tenantMessages: { type: Boolean, default: true },
      documentSharing: { type: Boolean, default: true },
      calendarReminders: { type: Boolean, default: true },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: "22:00" },
        endTime: { type: String, default: "08:00" },
      },
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      showDesktopNotifications: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
      badgeCount: { type: Boolean, default: true },
      autoMarkAsRead: { type: Boolean, default: false },
      groupSimilar: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

// Security Settings Schema
const securitySettingsSchema = new Schema(
  {
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: {
        type: String,
        enum: ["sms", "email", "authenticator"],
        default: "email",
      },
      backupCodes: [{ type: String }],
    },
    loginAlerts: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 60 }, // minutes
    passwordRequirements: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: false },
    },
    trustedDevices: [
      {
        deviceId: { type: String },
        deviceName: { type: String },
        userAgent: { type: String },
        ipAddress: { type: String },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    securityQuestions: [
      {
        question: { type: String },
        answer: { type: String }, // Should be hashed
      },
    ],
  },
  { _id: false }
);

// Display Settings Schema
const displaySettingsSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "America/New_York" },
    dateFormat: {
      type: String,
      enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
      default: "MM/DD/YYYY",
    },
    timeFormat: {
      type: String,
      enum: ["12h", "24h"],
      default: "12h",
    },
    currency: { type: String, default: "USD" },
    compactMode: { type: Boolean, default: false },
    sidebarCollapsed: { type: Boolean, default: false },
    showAvatars: { type: Boolean, default: true },
    animationsEnabled: { type: Boolean, default: true },
    highContrast: { type: Boolean, default: false },
    fontSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    density: {
      type: String,
      enum: ["compact", "comfortable", "spacious"],
      default: "comfortable",
    },
    colorScheme: {
      primary: { type: String, default: "#3b82f6" },
      secondary: { type: String, default: "#64748b" },
      accent: { type: String, default: "#06b6d4" },
    },
    dashboardLayout: {
      type: String,
      enum: ["grid", "list", "card"],
      default: "grid",
    },
    itemsPerPage: { type: Number, default: 25, min: 10, max: 100 },

    // Branding settings (moved from system settings to user display preferences)
    branding: {
      logoLight: { type: String, default: "/images/logo-light.png" },
      logoDark: { type: String, default: "/images/logo-dark.png" },
      favicon: { type: String, default: "/favicon.ico" },
      primaryColor: {
        type: String,
        default: "#3B82F6",
        validate: {
          validator: function (v: string) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: "Primary color must be a valid hex color",
        },
      },
      secondaryColor: {
        type: String,
        default: "#64748B",
        validate: {
          validator: function (v: string) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: "Secondary color must be a valid hex color",
        },
      },
      // R2 metadata for uploaded assets
      r2: {
        logoLight: {
          objectKey: { type: String },
          format: { type: String },
          width: { type: Number },
          height: { type: Number },
          bytes: { type: Number },
          optimizedUrls: { type: Schema.Types.Mixed },
        },
        logoDark: {
          objectKey: { type: String },
          format: { type: String },
          width: { type: Number },
          height: { type: Number },
          bytes: { type: Number },
          optimizedUrls: { type: Schema.Types.Mixed },
        },
        favicon: {
          objectKey: { type: String },
          format: { type: String },
          width: { type: Number },
          height: { type: Number },
          bytes: { type: Number },
          optimizedUrls: { type: Schema.Types.Mixed },
        },
      },
    },
  },
  { _id: false }
);

// Privacy Settings Schema
const privacySettingsSchema = new Schema(
  {
    profileVisibility: {
      type: String,
      enum: ["public", "contacts", "private"],
      default: "private",
    },
    showOnlineStatus: { type: Boolean, default: true },
    allowDataCollection: { type: Boolean, default: true },
    allowMarketing: { type: Boolean, default: false },
    shareUsageData: { type: Boolean, default: true },
    showContactInfo: { type: Boolean, default: false },
    allowDirectMessages: { type: Boolean, default: true },
    showActivityStatus: { type: Boolean, default: true },
    allowSearchEngineIndexing: { type: Boolean, default: false },
    shareLocationData: { type: Boolean, default: false },
    allowThirdPartyIntegrations: { type: Boolean, default: true },
    dataRetentionPeriod: { type: Number, default: 365 }, // days
    cookiePreferences: {
      essential: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      personalization: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

// System Settings Schema (for admin use)
const systemSettingsSchema = new Schema(
  {
    branding: {
      companyName: { type: String, default: "PropertyPro" },
      logo: { type: String }, // URL to uploaded logo
      favicon: { type: String }, // URL to uploaded favicon
      primaryColor: { type: String, default: "#3b82f6" },
      secondaryColor: { type: String, default: "#64748b" },
    },
    email: {
      smtpHost: { type: String },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String },
      smtpPassword: { type: String }, // Should be encrypted
      fromEmail: { type: String },
      fromName: { type: String },
      encryption: {
        type: String,
        enum: ["none", "tls", "ssl"],
        default: "tls",
      },
    },
    payment: {
      stripePublishableKey: { type: String },
      stripeSecretKey: { type: String }, // Should be encrypted
      paypalClientId: { type: String },
      paypalClientSecret: { type: String }, // Should be encrypted
      currency: { type: String, default: "USD" },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String },
      allowedIps: [{ type: String }],
    },
    security: {
      requireEmailVerification: { type: Boolean, default: true },
      passwordMinLength: { type: Number, default: MIN_PASSWORD_LENGTH, min: 6, max: 50 },
      sessionTimeout: { type: Number, default: 60, min: 15, max: 1440 },
      maxLoginAttempts: { type: Number, default: 5, min: 3, max: 20 },
      enableTwoFactor: { type: Boolean, default: false },
    },
    integrations: {
      googleMapsApiKey: { type: String },
      twilioAccountSid: { type: String },
      twilioAuthToken: { type: String }, // Should be encrypted
      twilioPhoneNumber: { type: String },
      enableAnalytics: { type: Boolean, default: true },
      analyticsId: { type: String },
    },
  },
  { _id: false }
);

// Main Settings Interface
export interface ISettings extends Document {
  userId?: mongoose.Types.ObjectId; // For user settings
  type: SettingsType;
  category: SettingsCategory;

  // Setting values based on category
  profile?: typeof profileSettingsSchema;
  notifications?: typeof notificationSettingsSchema;
  security?: typeof securitySettingsSchema;
  display?: typeof displaySettingsSchema;
  privacy?: typeof privacySettingsSchema;
  system?: typeof systemSettingsSchema;

  // Metadata
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

// Main Settings Schema
const settingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === SettingsType.USER;
      },
    },
    type: {
      type: String,
      enum: Object.values(SettingsType),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(SettingsCategory),
      required: true,
    },

    // Dynamic settings based on category (only one will be populated based on category)
    profile: {
      type: profileSettingsSchema,
      default: undefined,
    },
    notifications: {
      type: notificationSettingsSchema,
      default: undefined,
    },
    security: {
      type: securitySettingsSchema,
      default: undefined,
    },
    display: {
      type: displaySettingsSchema,
      default: undefined,
    },
    privacy: {
      type: privacySettingsSchema,
      default: undefined,
    },
    system: {
      type: systemSettingsSchema,
      default: undefined,
    },

    // Metadata
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "settings",
  }
);

// Pre-save validation middleware
settingsSchema.pre("save", function (next) {
  // Ensure only the correct field is populated based on category
  const categoryFieldMap = {
    [SettingsCategory.PROFILE]: "profile",
    [SettingsCategory.NOTIFICATIONS]: "notifications",
    [SettingsCategory.SECURITY]: "security",
    [SettingsCategory.DISPLAY]: "display",
    [SettingsCategory.PRIVACY]: "privacy",
    [SettingsCategory.SYSTEM_BRANDING]: "system",
    [SettingsCategory.SYSTEM_EMAIL]: "system",
    [SettingsCategory.SYSTEM_PAYMENT]: "system",
    [SettingsCategory.SYSTEM_SECURITY]: "system",
    [SettingsCategory.SYSTEM_MAINTENANCE]: "system",
    [SettingsCategory.SYSTEM_INTEGRATIONS]: "system",
  };

  const expectedField = categoryFieldMap[this.category];

  if (!expectedField) {
    return next(new Error(`Invalid category: ${this.category}`));
  }

  // Check if the expected field has data
  if (!this[expectedField] || Object.keys(this[expectedField]).length === 0) {
    return next(
      new Error(
        `${expectedField} data is required for category ${this.category}`
      )
    );
  }

  // Clear other fields to ensure data integrity
  Object.keys(categoryFieldMap).forEach((category) => {
    const field = categoryFieldMap[category];
    if (field !== expectedField && this[field]) {
      this[field] = undefined;
    }
  });

  // Note: Profile field validation is handled at the API level
  // Allow empty strings during default creation

  next();
});

// Indexes
settingsSchema.index({ userId: 1, type: 1, category: 1 }, { unique: true });
settingsSchema.index({ type: 1, category: 1 });
settingsSchema.index({ isActive: 1 });
settingsSchema.index({ createdAt: -1 });

// Static methods
settingsSchema.statics.findUserSettings = function (
  userId: string,
  category?: SettingsCategory
) {
  const query: any = {
    userId: new mongoose.Types.ObjectId(userId),
    type: SettingsType.USER,
    isActive: true,
  };

  if (category) {
    query.category = category;
  }

  return this.find(query);
};

settingsSchema.statics.findSystemSettings = function (
  category?: SettingsCategory
) {
  const query: any = {
    type: SettingsType.SYSTEM,
    isActive: true,
  };

  if (category) {
    query.category = category;
  }

  return this.find(query);
};

// UserSettings compatibility methods
settingsSchema.statics.findByUserId = async function (userId: string) {
  // Try to find settings without populate first to avoid errors
  const userSettings = await this.find({
    userId: new mongoose.Types.ObjectId(userId),
    type: SettingsType.USER,
    isActive: true,
  });

  // Convert to UserSettings-like format
  if (userSettings.length === 0) {
    return null;
  }

  const consolidated = {
    _id: userSettings[0]._id,
    userId: userId,
    profile: {},
    notifications: {},
    security: {},
    display: {},
    privacy: {},
    createdAt: userSettings[0].createdAt,
    updatedAt: userSettings[0].updatedAt,
  };

  // Merge all category settings
  userSettings.forEach((setting) => {
    if (setting.category === SettingsCategory.PROFILE && setting.profile) {
      consolidated.profile = setting.profile;
    } else if (
      setting.category === SettingsCategory.NOTIFICATIONS &&
      setting.notifications
    ) {
      consolidated.notifications = setting.notifications;
    } else if (
      setting.category === SettingsCategory.SECURITY &&
      setting.security
    ) {
      consolidated.security = setting.security;
    } else if (
      setting.category === SettingsCategory.DISPLAY &&
      setting.display
    ) {
      consolidated.display = setting.display;
    } else if (
      setting.category === SettingsCategory.PRIVACY &&
      setting.privacy
    ) {
      consolidated.privacy = setting.privacy;
    }
  });

  // Add update methods
  const SettingsModel = this;

  consolidated.updateProfile = async function (profile: any) {
    const setting = await SettingsModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category: SettingsCategory.PROFILE,
        type: SettingsType.USER,
      },
      { profile, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return setting;
  };

  consolidated.updateNotifications = async function (notifications: any) {
    const setting = await SettingsModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category: SettingsCategory.NOTIFICATIONS,
        type: SettingsType.USER,
      },
      { notifications, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return setting;
  };

  consolidated.updateSecurity = async function (security: any) {
    const setting = await SettingsModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category: SettingsCategory.SECURITY,
        type: SettingsType.USER,
      },
      { security, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return setting;
  };

  consolidated.updateDisplay = async function (display: any) {
    const setting = await SettingsModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category: SettingsCategory.DISPLAY,
        type: SettingsType.USER,
      },
      { display, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return setting;
  };

  consolidated.updatePrivacy = async function (privacy: any) {
    const setting = await SettingsModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category: SettingsCategory.PRIVACY,
        type: SettingsType.USER,
      },
      { privacy, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return setting;
  };

  return consolidated;
};

settingsSchema.statics.createDefaultSettings = async function (userId: string) {
  // Get user data to populate required profile fields
  const User = mongoose.model("User");
  const user = await User.findById(userId);

  const categories = [
    SettingsCategory.PROFILE,
    SettingsCategory.NOTIFICATIONS,
    SettingsCategory.SECURITY,
    SettingsCategory.DISPLAY,
    SettingsCategory.PRIVACY,
  ];

  // Use upsert operations to avoid duplicate key errors
  for (const category of categories) {
    let categoryData = {}; // Will use schema defaults

    // For profile category, populate required fields from user data
    if (category === SettingsCategory.PROFILE) {
      // Ensure profile always has some data to pass validation
      categoryData = {
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: user?.phone || "",
        avatar: user?.avatar || "",
        gender: "prefer_not_to_say", // Default value
      };
    }

    // Use findOneAndUpdate with upsert to avoid duplicate key errors
    await this.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        type: SettingsType.USER,
        category,
      },
      {
        userId: new mongoose.Types.ObjectId(userId),
        type: SettingsType.USER,
        category,
        [category]: categoryData,
        isActive: true,
        version: 1,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );
  }

  // Return in UserSettings format
  return this.findByUserId(userId);
};

settingsSchema.statics.createDefaultUserSettings = async function (
  userId: string
) {
  return this.createDefaultSettings(userId);
};

// Instance methods
settingsSchema.methods.updateSetting = function (
  data: any,
  updatedBy?: string
) {
  Object.assign(this[this.category], data);
  this.version += 1;
  if (updatedBy) {
    this.updatedBy = new mongoose.Types.ObjectId(updatedBy);
  }
  return this.save();
};

// Export the model with safer initialization
let Settings: Model<ISettings>;

try {
  // Try to get existing model first
  Settings = mongoose.model<ISettings>("Settings");
} catch (error) {
  // Model doesn't exist, create it
  Settings = mongoose.model<ISettings>("Settings", settingsSchema);
}

export default Settings;
