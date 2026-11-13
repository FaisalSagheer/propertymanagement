/**
 * PropertyPro - Settings Validator
 * Advanced validation utilities for settings operations
 */

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { z } from "zod";
import {
  profileSettingsSchema,
  notificationSettingsSchema,
  securitySettingsSchema,
  displaySettingsSchema,
  privacySettingsSchema,
  systemSettingSchema,
} from "@/lib/validations";
import {
  SettingsValidationError,
  SettingsConflictError,
  validateUserId,
  validateSettingsCategory,
} from "@/lib/settings-error-handler";

// Validation result interface
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Settings validator class
export class SettingsValidator {
  private static schemas = {
    profile: profileSettingsSchema,
    notifications: notificationSettingsSchema,
    security: securitySettingsSchema,
    display: displaySettingsSchema,
    privacy: privacySettingsSchema,
    system: systemSettingSchema,
  };

  // Validate settings data based on category
  static validate<T>(
    category: string,
    data: any,
    partial: boolean = false
  ): ValidationResult<T> {
    try {
      const normalizedCategory = validateSettingsCategory(category);
      const schema =
        this.schemas[normalizedCategory as keyof typeof this.schemas];

      if (!schema) {
        throw new SettingsValidationError(
          `No validation schema found for category: ${category}`
        );
      }

      const validationSchema = partial ? schema.partial() : schema;
      const result = validationSchema.safeParse(data);

      if (result.success) {
        const warnings = this.generateWarnings(normalizedCategory, result.data);
        return {
          success: true,
          data: result.data,
          warnings,
        };
      } else {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
          value: err.path.reduce((obj, key) => obj?.[key], data),
        }));

        return {
          success: false,
          errors,
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: "general",
            message:
              error instanceof Error ? error.message : "Validation failed",
            code: "VALIDATION_ERROR",
          },
        ],
      };
    }
  }

  // Generate warnings for potentially problematic settings
  private static generateWarnings(
    category: string,
    data: any
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    switch (category) {
      case "notifications":
        warnings.push(...this.validateNotificationSettings(data));
        break;
      case "security":
        warnings.push(...this.validateSecuritySettings(data));
        break;
      case "privacy":
        warnings.push(...this.validatePrivacySettings(data));
        break;
      case "display":
        warnings.push(...this.validateDisplaySettings(data));
        break;
    }

    return warnings;
  }

  private static validateNotificationSettings(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check if all notification methods are disabled
    if (
      data.email?.enabled === false &&
      data.sms?.enabled === false &&
      data.push?.enabled === false
    ) {
      warnings.push({
        field: "notifications",
        message: "All notification methods are disabled",
        suggestion:
          "Enable at least one notification method to receive important updates",
      });
    }

    // Check if payment reminders are disabled
    if (data.email?.enabled && !data.email?.paymentReminders) {
      warnings.push({
        field: "email.paymentReminders",
        message: "Payment reminders are disabled",
        suggestion:
          "Enable payment reminders to avoid missing payment deadlines",
      });
    }

    // Check quiet hours configuration
    if (data.email?.quietHours?.enabled) {
      const start = data.email.quietHours.startTime;
      const end = data.email.quietHours.endTime;
      if (start === end) {
        warnings.push({
          field: "email.quietHours",
          message: "Quiet hours start and end times are the same",
          suggestion: "Set different start and end times for quiet hours",
        });
      }
    }

    return warnings;
  }

  private static validateSecuritySettings(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check if 2FA is disabled
    if (data.twoFactorAuth?.enabled === false) {
      warnings.push({
        field: "twoFactorAuth.enabled",
        message: "Two-factor authentication is disabled",
        suggestion: "Enable 2FA for enhanced account security",
      });
    }

    // Check password requirements
    if (data.passwordRequirements?.minLength < MIN_PASSWORD_LENGTH) {
      warnings.push({
        field: "passwordRequirements.minLength",
        message: `Password minimum length is less than ${MIN_PASSWORD_LENGTH} characters`,
        suggestion: `Use at least ${MIN_PASSWORD_LENGTH} characters, which is what sign-up and reset enforce`,
      });
    }

    // Check session timeout
    if (data.sessionTimeout > 480) {
      warnings.push({
        field: "sessionTimeout",
        message: "Session timeout is very long",
        suggestion: "Consider shorter session timeouts for better security",
      });
    }

    return warnings;
  }

  private static validatePrivacySettings(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check if profile is public with contact info visible
    if (data.profileVisibility === "public" && data.showContactInfo) {
      warnings.push({
        field: "showContactInfo",
        message: "Contact information will be publicly visible",
        suggestion: "Consider hiding contact info or making profile private",
      });
    }

    // Check data sharing settings
    if (
      data.allowDataCollection &&
      data.shareUsageData &&
      data.allowMarketing
    ) {
      warnings.push({
        field: "dataSharing",
        message: "All data sharing options are enabled",
        suggestion: "Review data sharing preferences for better privacy",
      });
    }

    // Check data retention period
    if (data.dataRetentionPeriod > 365) {
      warnings.push({
        field: "dataRetentionPeriod",
        message: "Data retention period is longer than 1 year",
        suggestion: "Consider shorter retention periods for better privacy",
      });
    }

    return warnings;
  }

  private static validateDisplaySettings(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check color scheme contrast
    if (data.colorScheme) {
      const { primary, secondary } = data.colorScheme;
      if (primary === secondary) {
        warnings.push({
          field: "colorScheme",
          message: "Primary and secondary colors are the same",
          suggestion: "Use different colors for better visual hierarchy",
        });
      }
    }

    // Check accessibility settings
    if (data.animationsEnabled && data.accessibility?.reduceMotion) {
      warnings.push({
        field: "animations",
        message: "Animations are enabled but reduce motion is requested",
        suggestion: "Disable animations for better accessibility",
      });
    }

    return warnings;
  }

  // Validate settings conflicts between categories
  static validateCrossCategory(settings: {
    notifications?: any;
    security?: any;
    privacy?: any;
    display?: any;
  }): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check notification vs privacy conflicts
    if (
      settings.notifications?.email?.enabled &&
      settings.privacy?.allowMarketing === false
    ) {
      warnings.push({
        field: "notifications.email",
        message: "Email notifications enabled but marketing emails disabled",
        suggestion:
          "Ensure notification preferences align with privacy settings",
      });
    }

    // Check security vs display conflicts
    if (
      settings.security?.sessionTimeout < 30 &&
      settings.display?.autoRefresh
    ) {
      warnings.push({
        field: "display.autoRefresh",
        message: "Auto-refresh enabled with short session timeout",
        suggestion: "Consider longer session timeout or disable auto-refresh",
      });
    }

    return warnings;
  }

  // Validate business rules
  static validateBusinessRules(
    category: string,
    data: any,
    userRole?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    switch (category) {
      case "security":
        // Admin users must have 2FA enabled
        if (
          userRole === "SUPER_ADMIN" &&
          data.twoFactorAuth?.enabled === false
        ) {
          errors.push({
            field: "twoFactorAuth.enabled",
            message:
              "Super admin users must have two-factor authentication enabled",
            code: "BUSINESS_RULE_VIOLATION",
          });
        }
        break;

      case "system":
        // System settings require specific validations
        if (data.maintenance?.enabled && !data.maintenance?.message) {
          errors.push({
            field: "maintenance.message",
            message:
              "Maintenance message is required when maintenance mode is enabled",
            code: "BUSINESS_RULE_VIOLATION",
          });
        }
        break;
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Sanitize sensitive data before validation
  static sanitizeInput(data: any, category: string): any {
    const sanitized = { ...data };

    switch (category) {
      case "security":
        // Remove sensitive fields that shouldn't be updated directly
        delete sanitized.twoFactorAuth?.secret;
        delete sanitized.twoFactorAuth?.backupCodes;
        break;

      case "system":
        // Ensure sensitive system data is handled properly
        if (sanitized.email?.smtpPassword === "***") {
          delete sanitized.email.smtpPassword;
        }
        if (sanitized.payment?.stripeSecretKey === "***") {
          delete sanitized.payment.stripeSecretKey;
        }
        break;
    }

    return sanitized;
  }

  // Validate required permissions for settings operations
  static validatePermissions(
    category: string,
    operation: "read" | "write" | "delete",
    userRole: string,
    isOwnSettings: boolean = true
  ): boolean {
    // System settings require admin permissions
    if (category === "system") {
      return userRole === "admin";
    }

    // Users can always manage their own settings
    if (isOwnSettings) {
      return true;
    }

    // Only admins can manage other users' settings
    return ["admin", "manager"].includes(userRole);
  }
}

// Export validation utilities
export {
  SettingsValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
};
