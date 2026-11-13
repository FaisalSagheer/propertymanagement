import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import mongoose, { Schema, Document, Model } from "mongoose";

// Security Settings Interface
export interface ISecuritySettings extends Document {
  userId: mongoose.Types.ObjectId;

  // Two-Factor Authentication
  twoFactorAuth: {
    enabled: boolean;
    method: "sms" | "email" | "authenticator";
    backupCodes?: string[];
    secret?: string; // For authenticator apps
    lastUsed?: Date;
  };

  // Login & Session Settings
  loginAlerts: boolean;
  sessionTimeout: number; // in minutes
  maxConcurrentSessions: number;
  requirePasswordChange: boolean;
  passwordChangeInterval: number; // in days

  // Password Requirements
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // number of previous passwords to prevent reuse
  };

  // Account Security
  accountLockout: {
    enabled: boolean;
    maxAttempts: number;
    lockoutDuration: number; // in minutes
    resetOnSuccess: boolean;
  };

  // Device Management
  trustedDevices: Array<{
    deviceId: string;
    deviceName: string;
    userAgent: string;
    ipAddress: string;
    addedAt: Date;
    lastUsed?: Date;
  }>;

  // Security Questions
  securityQuestions: Array<{
    question: string;
    answer: string; // Should be hashed
    createdAt: Date;
  }>;

  // API Access
  apiAccess: {
    enabled: boolean;
    allowedIPs: string[];
    rateLimit: number; // requests per minute
    requireApiKey: boolean;
  };

  // Privacy & Data
  dataEncryption: {
    enabled: boolean;
    encryptionLevel: "basic" | "standard" | "high";
  };

  // Audit Settings
  auditLog: {
    enabled: boolean;
    retentionDays: number;
    logLevel: "basic" | "detailed" | "verbose";
  };

  // Metadata
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

// Security Settings Schema
const securitySettingsSchema = new Schema<ISecuritySettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Two-Factor Authentication
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: {
        type: String,
        enum: ["sms", "email", "authenticator"],
        default: "email",
      },
      backupCodes: [{ type: String }],
      secret: { type: String }, // Encrypted
      lastUsed: { type: Date },
    },

    // Login & Session Settings
    loginAlerts: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 60, min: 15, max: 480 },
    maxConcurrentSessions: { type: Number, default: 3, min: 1, max: 10 },
    requirePasswordChange: { type: Boolean, default: false },
    passwordChangeInterval: { type: Number, default: 90, min: 30, max: 365 },

    // Password Requirements
    passwordRequirements: {
      minLength: { type: Number, default: 8, min: 6, max: 32 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: false },
      preventReuse: { type: Number, default: 5, min: 0, max: 20 },
    },

    // Account Security
    accountLockout: {
      enabled: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 5, min: 3, max: 20 },
      lockoutDuration: { type: Number, default: 30, min: 5, max: 1440 },
      resetOnSuccess: { type: Boolean, default: true },
    },

    // Device Management
    trustedDevices: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String, required: true },
        userAgent: { type: String },
        ipAddress: { type: String },
        addedAt: { type: Date, default: Date.now },
        lastUsed: { type: Date },
      },
    ],

    // Security Questions
    securityQuestions: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true }, // Should be hashed
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // API Access
    apiAccess: {
      enabled: { type: Boolean, default: false },
      allowedIPs: [{ type: String }],
      rateLimit: { type: Number, default: 100, min: 10, max: 1000 },
      requireApiKey: { type: Boolean, default: true },
    },

    // Privacy & Data
    dataEncryption: {
      enabled: { type: Boolean, default: true },
      encryptionLevel: {
        type: String,
        enum: ["basic", "standard", "high"],
        default: "standard",
      },
    },

    // Audit Settings
    auditLog: {
      enabled: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 90, min: 30, max: 365 },
      logLevel: {
        type: String,
        enum: ["basic", "detailed", "verbose"],
        default: "detailed",
      },
    },

    // Metadata
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "security_settings",
  }
);

// Indexes
securitySettingsSchema.index({ userId: 1 }, { unique: true });
securitySettingsSchema.index({ isActive: 1 });
securitySettingsSchema.index({ "twoFactorAuth.enabled": 1 });
securitySettingsSchema.index({ createdAt: -1 });

// Instance Methods
securitySettingsSchema.methods.updateSecurity = function (
  securityData: Partial<ISecuritySettings>
) {
  Object.assign(this, securityData);
  this.version += 1;
  this.updatedAt = new Date();
  return this.save();
};

securitySettingsSchema.methods.addTrustedDevice = function (deviceInfo: {
  deviceId: string;
  deviceName: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  // Remove existing device with same ID
  this.trustedDevices = this.trustedDevices.filter(
    (device: any) => device.deviceId !== deviceInfo.deviceId
  );

  // Add new device
  this.trustedDevices.push({
    ...deviceInfo,
    addedAt: new Date(),
  });

  return this.save();
};

securitySettingsSchema.methods.removeTrustedDevice = function (
  deviceId: string
) {
  this.trustedDevices = this.trustedDevices.filter(
    (device: any) => device.deviceId !== deviceId
  );
  return this.save();
};

securitySettingsSchema.methods.isTrustedDevice = function (
  deviceId: string
): boolean {
  return this.trustedDevices.some(
    (device: any) => device.deviceId === deviceId
  );
};

// Static Methods
securitySettingsSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId, isActive: true });
};

securitySettingsSchema.statics.createDefaultSecurity = function (
  userId: string
) {
  return this.create({
    userId,
    twoFactorAuth: {
      enabled: false,
      method: "email",
    },
    loginAlerts: true,
    sessionTimeout: 60,
    maxConcurrentSessions: 3,
    requirePasswordChange: false,
    passwordChangeInterval: 90,
    passwordRequirements: {
      minLength: MIN_PASSWORD_LENGTH,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventReuse: 5,
    },
    accountLockout: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: 30,
      resetOnSuccess: true,
    },
    apiAccess: {
      enabled: false,
      allowedIPs: [],
      rateLimit: 100,
      requireApiKey: true,
    },
    dataEncryption: {
      enabled: true,
      encryptionLevel: "standard",
    },
    auditLog: {
      enabled: true,
      retentionDays: 90,
      logLevel: "detailed",
    },
  });
};

// Pre-save middleware
securitySettingsSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Create and export the model with safer initialization
let SecuritySettings: Model<ISecuritySettings>;

try {
  // Try to get existing model first
  SecuritySettings = mongoose.model<ISecuritySettings>("SecuritySettings");
} catch (error) {
  // Model doesn't exist, create it
  SecuritySettings = mongoose.model<ISecuritySettings>(
    "SecuritySettings",
    securitySettingsSchema
  );
}

export default SecuritySettings;
export type { ISecuritySettings };
