import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import mongoose, { Schema, Document, Model } from "mongoose";

// System Settings Interface
export interface ISystemSettingsNew extends Document {
  // Branding Settings
  branding: {
    companyName: string;
    logo?: string; // URL to uploaded logo
    favicon?: string; // URL to uploaded favicon
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    footerText?: string;
    customCSS?: string;
  };

  // Email Configuration
  email: {
    smtpHost?: string;
    smtpPort: number;
    smtpUser?: string;
    smtpPassword?: string; // Should be encrypted
    fromEmail?: string;
    fromName?: string;
    encryption: "none" | "tls" | "ssl";
    testMode: boolean;
    dailyLimit: number;
  };

  // Payment Configuration
  payment: {
    stripePublishableKey?: string;
    stripeSecretKey?: string; // Should be encrypted
    paypalClientId?: string;
    paypalClientSecret?: string; // Should be encrypted
    currency: string;
    taxRate: number;
    processingFee: number;
    allowedPaymentMethods: string[];
  };

  // Security Configuration
  security: {
    requireEmailVerification: boolean;
    passwordMinLength: number;
    sessionTimeout: number; // in minutes
    maxLoginAttempts: number;
    enableTwoFactor: boolean;
    allowedDomains: string[];
    ipWhitelist: string[];
    enableRateLimiting: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number; // in minutes
  };

  // Maintenance Settings
  maintenance: {
    enabled: boolean;
    message?: string;
    allowedIps: string[];
    scheduledStart?: Date;
    scheduledEnd?: Date;
    showCountdown: boolean;
  };

  // Integration Settings
  integrations: {
    googleMaps: {
      enabled: boolean;
      apiKey?: string;
    };
    r2: {
      enabled: boolean;
      accountId?: string;
      accessKeyId?: string;
      secretAccessKey?: string; // Should be encrypted
      bucketName?: string;
      publicUrl?: string;
    };
    analytics: {
      enabled: boolean;
      googleAnalyticsId?: string;
      trackingEnabled: boolean;
    };
    sms: {
      enabled: boolean;
      provider: "twilio" | "aws" | "custom";
      apiKey?: string; // Should be encrypted
      apiSecret?: string; // Should be encrypted
      fromNumber?: string;
    };
  };

  // Application Settings
  application: {
    siteName: string;
    siteUrl: string;
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
    maxFileSize: number; // in MB
    allowedFileTypes: string[];
    enableRegistration: boolean;
    requireInvitation: boolean;
    defaultUserRole: string;
  };

  // Notification Settings
  notifications: {
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
    enablePushNotifications: boolean;
    defaultNotificationSettings: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    retentionDays: number;
  };

  // Backup & Data Settings
  backup: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    retentionDays: number;
    includeFiles: boolean;
    encryptBackups: boolean;
    storageProvider: "local" | "aws" | "google" | "azure";
    storageConfig?: any;
  };

  // Metadata
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

// System Settings Schema
const systemSettingsNewSchema = new Schema<ISystemSettingsNew>(
  {
    // Branding Settings
    branding: {
      companyName: { type: String, default: "PropertyPro" },
      logo: { type: String }, // URL to uploaded logo
      favicon: { type: String }, // URL to uploaded favicon
      primaryColor: { type: String, default: "#3b82f6" },
      secondaryColor: { type: String, default: "#64748b" },
      accentColor: { type: String, default: "#06b6d4" },
      footerText: { type: String },
      customCSS: { type: String, maxlength: 50000 },
    },

    // Email Configuration
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
      testMode: { type: Boolean, default: true },
      dailyLimit: { type: Number, default: 1000 },
    },

    // Payment Configuration
    payment: {
      stripePublishableKey: { type: String },
      stripeSecretKey: { type: String }, // Should be encrypted
      paypalClientId: { type: String },
      paypalClientSecret: { type: String }, // Should be encrypted
      currency: { type: String, default: "USD" },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      processingFee: { type: Number, default: 0, min: 0 },
      allowedPaymentMethods: [{ type: String }],
    },

    // Security Configuration
    security: {
      requireEmailVerification: { type: Boolean, default: true },
      passwordMinLength: { type: Number, default: MIN_PASSWORD_LENGTH, min: 6, max: 50 },
      sessionTimeout: { type: Number, default: 60, min: 15, max: 1440 },
      maxLoginAttempts: { type: Number, default: 5, min: 3, max: 20 },
      enableTwoFactor: { type: Boolean, default: false },
      allowedDomains: [{ type: String }],
      ipWhitelist: [{ type: String }],
      enableRateLimiting: { type: Boolean, default: true },
      rateLimitRequests: { type: Number, default: 100 },
      rateLimitWindow: { type: Number, default: 15 },
    },

    // Maintenance Settings
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String },
      allowedIps: [{ type: String }],
      scheduledStart: { type: Date },
      scheduledEnd: { type: Date },
      showCountdown: { type: Boolean, default: true },
    },

    // Integration Settings
    integrations: {
      googleMaps: {
        enabled: { type: Boolean, default: false },
        apiKey: { type: String },
      },
      r2: {
        enabled: { type: Boolean, default: false },
        accountId: { type: String },
        accessKeyId: { type: String },
        secretAccessKey: { type: String }, // Should be encrypted
        bucketName: { type: String },
        publicUrl: { type: String },
      },
      analytics: {
        enabled: { type: Boolean, default: false },
        googleAnalyticsId: { type: String },
        trackingEnabled: { type: Boolean, default: false },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ["twilio", "aws", "custom"],
          default: "twilio",
        },
        apiKey: { type: String }, // Should be encrypted
        apiSecret: { type: String }, // Should be encrypted
        fromNumber: { type: String },
      },
    },

    // Application Settings
    application: {
      siteName: { type: String, default: "PropertyPro" },
      siteUrl: { type: String, default: "http://localhost:3000" },
      timezone: { type: String, default: "America/New_York" },
      language: { type: String, default: "en" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
      timeFormat: { type: String, default: "12h" },
      maxFileSize: { type: Number, default: 10 }, // in MB
      allowedFileTypes: {
        type: [String],
        default: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
      },
      enableRegistration: { type: Boolean, default: true },
      requireInvitation: { type: Boolean, default: false },
      defaultUserRole: { type: String, default: "tenant" },
    },

    // Notification Settings
    notifications: {
      enableEmailNotifications: { type: Boolean, default: true },
      enableSMSNotifications: { type: Boolean, default: false },
      enablePushNotifications: { type: Boolean, default: true },
      defaultNotificationSettings: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      retentionDays: { type: Number, default: 90 },
    },

    // Backup & Data Settings
    backup: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      retentionDays: { type: Number, default: 30 },
      includeFiles: { type: Boolean, default: true },
      encryptBackups: { type: Boolean, default: true },
      storageProvider: {
        type: String,
        enum: ["local", "aws", "google", "azure"],
        default: "local",
      },
      storageConfig: { type: Schema.Types.Mixed },
    },

    // Metadata
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "system_settings_new",
  }
);

// Indexes
systemSettingsNewSchema.index({ isActive: 1 });
systemSettingsNewSchema.index({ version: -1 });
systemSettingsNewSchema.index({ createdAt: -1 });

// Instance Methods
systemSettingsNewSchema.methods.updateSettings = function (
  settingsData: Partial<ISystemSettingsNew>
) {
  Object.assign(this, settingsData);
  this.version += 1;
  this.updatedAt = new Date();
  return this.save();
};

systemSettingsNewSchema.methods.enableMaintenance = function (
  message?: string,
  allowedIps?: string[]
) {
  this.maintenance.enabled = true;
  if (message) this.maintenance.message = message;
  if (allowedIps) this.maintenance.allowedIps = allowedIps;
  return this.save();
};

systemSettingsNewSchema.methods.disableMaintenance = function () {
  this.maintenance.enabled = false;
  this.maintenance.message = undefined;
  return this.save();
};

// Static Methods
systemSettingsNewSchema.statics.getSettings = function () {
  return this.findOne({ isActive: true }).sort({ version: -1 });
};

systemSettingsNewSchema.statics.createDefaultSettings = function () {
  return this.create({
    branding: {
      companyName: "PropertyPro",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      accentColor: "#06b6d4",
    },
    email: {
      smtpPort: 587,
      encryption: "tls",
      testMode: true,
      dailyLimit: 1000,
    },
    payment: {
      currency: "USD",
      taxRate: 0,
      processingFee: 0,
      allowedPaymentMethods: ["card", "bank_transfer"],
    },
    security: {
      requireEmailVerification: true,
      passwordMinLength: MIN_PASSWORD_LENGTH,
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      enableTwoFactor: false,
      enableRateLimiting: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15,
    },
    maintenance: {
      enabled: false,
      showCountdown: true,
    },
    application: {
      siteName: "PropertyPro",
      siteUrl: "http://localhost:3000",
      timezone: "America/New_York",
      language: "en",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      maxFileSize: 10,
      allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
      enableRegistration: true,
      requireInvitation: false,
      defaultUserRole: "tenant",
    },
    notifications: {
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      enablePushNotifications: true,
      defaultNotificationSettings: {
        email: true,
        sms: false,
        push: true,
      },
      retentionDays: 90,
    },
    backup: {
      enabled: false,
      frequency: "weekly",
      retentionDays: 30,
      includeFiles: true,
      encryptBackups: true,
      storageProvider: "local",
    },
  });
};

// Pre-save middleware
systemSettingsNewSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Create and export the model with safer initialization
let SystemSettingsNew: Model<ISystemSettingsNew>;

try {
  // Try to get existing model first
  SystemSettingsNew = mongoose.model<ISystemSettingsNew>("SystemSettingsNew");
} catch (error) {
  // Model doesn't exist, create it
  SystemSettingsNew = mongoose.model<ISystemSettingsNew>(
    "SystemSettingsNew",
    systemSettingsNewSchema
  );
}

export default SystemSettingsNew;
export type { ISystemSettingsNew };
