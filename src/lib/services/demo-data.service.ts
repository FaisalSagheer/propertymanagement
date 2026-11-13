/**
 * PropertyPro - Demo Data Service
 * Service for generating and installing demo data for new users
 */

import {
  User,
  Property,
  Tenant,
  Lease,
  Payment,
  MaintenanceRequest,
  Message,
  Event,
  Announcement,
} from "@/models";
import {
  UserRole,
  PropertyType,
  LeaseStatus,
  PaymentStatus,
  MaintenanceStatus,
  EventType,
  EventStatus,
} from "@/types";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export interface DemoDataOptions {
  includeUsers?: boolean;
  includeProperties?: boolean;
  includeTenants?: boolean;
  includeLeases?: boolean;
  includePayments?: boolean;
  includeMaintenance?: boolean;
  includeMessages?: boolean;
  includeEvents?: boolean;
  includeAnnouncements?: boolean;
  propertyCount?: number;
  tenantCount?: number;
  organizationName?: string;
  adminEmail?: string;
  adminPassword?: string;
}

export interface DemoDataResult {
  success: boolean;
  message: string;
  data: {
    users: number;
    properties: number;
    tenants: number;
    leases: number;
    payments: number;
    maintenanceRequests: number;
    messages: number;
    events: number;
    announcements: number;
  };
  errors: string[];
  adminCredentials?: {
    email: string;
    password: string;
  };
}

export class DemoDataService {
  private static instance: DemoDataService;

  private constructor() {}

  public static getInstance(): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService();
    }
    return DemoDataService.instance;
  }

  async installDemoData(
    options: DemoDataOptions = {}
  ): Promise<DemoDataResult> {
    const {
      includeUsers = true,
      includeProperties = true,
      includeTenants = true,
      includeLeases = true,
      includePayments = true,
      includeMaintenance = true,
      includeMessages = true,
      includeEvents = true,
      includeAnnouncements = true,
      propertyCount = 5,
      tenantCount = 15,
      organizationName = "Demo Property Management",
      adminEmail = "admin@demo.com",
      adminPassword = "DemoAdmin1234!",
    } = options;

    const result: DemoDataResult = {
      success: false,
      message: "",
      data: {
        users: 0,
        properties: 0,
        tenants: 0,
        leases: 0,
        payments: 0,
        maintenanceRequests: 0,
        messages: 0,
        events: 0,
        announcements: 0,
      },
      errors: [],
    };

    try {
      // Check if demo data already exists
      const existingUsers = await User.countDocuments();
      if (existingUsers > 0) {
        result.errors.push(
          "Demo data already exists. Please clear existing data first."
        );
        return result;
      }

      let createdUsers: any[] = [];
      let createdProperties: any[] = [];
      let createdTenants: any[] = [];

      // 1. Create Users
      if (includeUsers) {
        createdUsers = await this.createDemoUsers(
          adminEmail,
          adminPassword,
          organizationName
        );
        result.data.users = createdUsers.length;
      }

      // 2. Create Properties
      if (includeProperties) {
        const adminUser = createdUsers.find(
          (u) => u.role === UserRole.ADMIN
        );
        createdProperties = await this.createDemoProperties(
          propertyCount,
          adminUser?._id
        );
        result.data.properties = createdProperties.length;
      }

      // 3. Create Tenants
      if (includeTenants) {
        createdTenants = await this.createDemoTenants(tenantCount);
        result.data.tenants = createdTenants.length;
      }

      // 4. Create Leases
      if (
        includeLeases &&
        createdProperties.length > 0 &&
        createdTenants.length > 0
      ) {
        const leases = await this.createDemoLeases(
          createdProperties,
          createdTenants
        );
        result.data.leases = leases.length;
      }

      // 5. Create Payments
      if (includePayments) {
        const payments = await this.createDemoPayments(createdTenants);
        result.data.payments = payments.length;
      }

      // 6. Create Maintenance Requests
      if (
        includeMaintenance &&
        createdProperties.length > 0 &&
        createdTenants.length > 0
      ) {
        const maintenance = await this.createDemoMaintenance(
          createdProperties,
          createdTenants
        );
        result.data.maintenanceRequests = maintenance.length;
      }

      // 7. Create Messages
      if (includeMessages && createdUsers.length > 0) {
        const messages = await this.createDemoMessages(
          createdUsers,
          createdProperties
        );
        result.data.messages = messages.length;
      }

      // 8. Create Events
      if (includeEvents && createdUsers.length > 0) {
        const events = await this.createDemoEvents(
          createdUsers,
          createdProperties
        );
        result.data.events = events.length;
      }

      // 9. Create Announcements
      if (includeAnnouncements && createdUsers.length > 0) {
        const announcements = await this.createDemoAnnouncements(
          createdUsers[0]
        );
        result.data.announcements = announcements.length;
      }

      result.success = true;
      result.message = "Demo data installed successfully";
      result.adminCredentials = {
        email: adminEmail,
        password: adminPassword,
      };
    } catch (error) {
      console.error("Error installing demo data:", error);
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error"
      );
      result.message = "Failed to install demo data";
    }

    return result;
  }

  private async createDemoUsers(
    adminEmail: string,
    adminPassword: string,
    organizationName: string
  ): Promise<any[]> {
    const users = [
      {
        firstName: "Admin",
        lastName: "User",
        email: adminEmail,
        password: adminPassword,
        role: UserRole.ADMIN,
        phone: "+1-555-0100",
        isActive: true,
        emailVerified: new Date(),
      },
      {
        firstName: "John",
        lastName: "Manager",
        email: "manager@demo.com",
        password: "Manager1234567!",
        role: UserRole.MANAGER,
        phone: "+1-555-0200",
        isActive: true,
        emailVerified: new Date(),
      },
      {
        firstName: "Sarah",
        lastName: "Owner",
        email: "owner@demo.com",
        password: "Owner1234567!",
        role: UserRole.MANAGER,
        phone: "+1-555-0300",
        isActive: true,
        emailVerified: new Date(),
      },
      {
        firstName: "Mike",
        lastName: "Agent",
        email: "agent@demo.com",
        password: "Agent1234567!",
        role: UserRole.MANAGER,
        phone: "+1-555-0400",
        isActive: true,
        emailVerified: new Date(),
      },
      {
        firstName: "Lisa",
        lastName: "Maintenance",
        email: "maintenance@demo.com",
        password: "Maintenance123!",
        role: UserRole.MANAGER,
        phone: "+1-555-0500",
        isActive: true,
        emailVerified: new Date(),
      },
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }

    return createdUsers;
  }

  private async createDemoProperties(
    count: number,
    ownerId: mongoose.Types.ObjectId
  ): Promise<any[]> {
    const propertyTemplates = [
      {
        name: "Sunset Apartments",
        type: PropertyType.APARTMENT,
        address: {
          street: "123 Sunset Boulevard",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90028",
          country: "USA",
        },
        unitCount: 24,
        description: "Modern apartment complex with amenities",
        features: ["Pool", "Gym", "Parking", "Laundry"],
      },
      {
        name: "Oak Street Townhomes",
        type: PropertyType.TOWNHOUSE,
        address: {
          street: "456 Oak Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          country: "USA",
        },
        unitCount: 12,
        description: "Luxury townhomes in prime location",
        features: ["Garage", "Garden", "Fireplace"],
      },
      {
        name: "Pine Valley Condos",
        type: PropertyType.CONDO,
        address: {
          street: "789 Pine Valley Drive",
          city: "San Diego",
          state: "CA",
          zipCode: "92101",
          country: "USA",
        },
        unitCount: 36,
        description: "Waterfront condominiums with ocean views",
        features: ["Ocean View", "Balcony", "Pool", "Concierge"],
      },
      {
        name: "Maple Grove Houses",
        type: PropertyType.SINGLE_FAMILY,
        address: {
          street: "321 Maple Grove Lane",
          city: "Sacramento",
          state: "CA",
          zipCode: "95814",
          country: "USA",
        },
        unitCount: 1,
        description: "Single family homes in quiet neighborhood",
        features: ["Garden", "Garage", "Fireplace"],
      },
      {
        name: "Downtown Lofts",
        type: PropertyType.APARTMENT,
        address: {
          street: "654 Downtown Plaza",
          city: "Oakland",
          state: "CA",
          zipCode: "94612",
          country: "USA",
        },
        unitCount: 18,
        description: "Modern lofts in the heart of downtown",
        features: ["High Ceilings", "Exposed Brick", "Parking"],
      },
    ];

    const createdProperties = [];
    for (let i = 0; i < Math.min(count, propertyTemplates.length); i++) {
      const template = propertyTemplates[i];

      // Generate realistic property details based on type
      const bedroomsRange =
        template.type === PropertyType.SINGLE_FAMILY ? [3, 5] : [1, 3];
      const bedrooms =
        bedroomsRange[0] +
        Math.floor(Math.random() * (bedroomsRange[1] - bedroomsRange[0] + 1));
      const bathrooms = Math.max(
        1,
        Math.floor(bedrooms * 0.75) + Math.floor(Math.random() * 2)
      );
      const squareFootage =
        template.type === PropertyType.SINGLE_FAMILY
          ? 1500 + Math.floor(Math.random() * 2000)
          : 800 + Math.floor(Math.random() * 1200);
      const rentAmount =
        Math.floor((squareFootage * (1.5 + Math.random() * 1.5)) / 10) * 10;
      const securityDeposit = rentAmount;

      const { unitCount, features, ...templateData } = template;

      const yearBuilt = 2000 + Math.floor(Math.random() * 23);

      const property = new Property({
        ...templateData,
        ownerId,
        bedrooms,
        bathrooms,
        squareFootage,
        rentAmount,
        securityDeposit,
        yearBuilt,
        totalArea: 1000 + Math.floor(Math.random() * 2000),
        amenities: features || ["Parking", "Laundry"],
        isActive: true,
        // Set multi-unit properties
        isMultiUnit: unitCount > 1,
        totalUnits: unitCount > 1 ? unitCount : 1,
      });

      await property.save();
      createdProperties.push(property);
    }

    return createdProperties;
  }

  private async createDemoTenants(count: number): Promise<any[]> {
    const tenantTemplates = [
      {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice.johnson@email.com",
      },
      { firstName: "Bob", lastName: "Smith", email: "bob.smith@email.com" },
      { firstName: "Carol", lastName: "Davis", email: "carol.davis@email.com" },
      {
        firstName: "David",
        lastName: "Wilson",
        email: "david.wilson@email.com",
      },
      { firstName: "Emma", lastName: "Brown", email: "emma.brown@email.com" },
      {
        firstName: "Frank",
        lastName: "Miller",
        email: "frank.miller@email.com",
      },
      {
        firstName: "Grace",
        lastName: "Taylor",
        email: "grace.taylor@email.com",
      },
      {
        firstName: "Henry",
        lastName: "Anderson",
        email: "henry.anderson@email.com",
      },
      { firstName: "Ivy", lastName: "Thomas", email: "ivy.thomas@email.com" },
      {
        firstName: "Jack",
        lastName: "Jackson",
        email: "jack.jackson@email.com",
      },
      { firstName: "Kate", lastName: "White", email: "kate.white@email.com" },
      { firstName: "Leo", lastName: "Harris", email: "leo.harris@email.com" },
      { firstName: "Mia", lastName: "Martin", email: "mia.martin@email.com" },
      {
        firstName: "Noah",
        lastName: "Thompson",
        email: "noah.thompson@email.com",
      },
      {
        firstName: "Olivia",
        lastName: "Garcia",
        email: "olivia.garcia@email.com",
      },
    ];

    const createdTenants = [];
    for (let i = 0; i < Math.min(count, tenantTemplates.length); i++) {
      const template = tenantTemplates[i];

      // Create user account for tenant
      const user = new User({
        firstName: template.firstName,
        lastName: template.lastName,
        email: template.email,
        password: "Tenant1234567!",
        role: UserRole.TENANT,
        phone: `+1-555-${String(1000 + i).padStart(4, "0")}`,
        isActive: true,
        emailVerified: new Date(),
      });

      await user.save();

      // Create tenant profile
      const tenant = new Tenant({
        userId: user._id,
        dateOfBirth: new Date(
          1980 + Math.floor(Math.random() * 30),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
        emergencyContact: {
          name: `Emergency Contact ${i + 1}`,
          phone: `+1-555-${String(2000 + i).padStart(4, "0")}`,
          relationship: "Family",
        },
        employmentInfo: {
          employer: `Company ${i + 1}`,
          position: "Employee",
          monthlyIncome: 3000 + Math.floor(Math.random() * 5000),
          startDate: new Date(2020, Math.floor(Math.random() * 12), 1),
        },
        isActive: true,
      });

      await tenant.save();
      createdTenants.push(tenant);
    }

    return createdTenants;
  }

  private async createDemoLeases(
    properties: any[],
    tenants: any[]
  ): Promise<any[]> {
    const createdLeases = [];
    const usedTenants = new Set();

    for (const property of properties) {
      const unitsToFill = Math.min(
        property.units,
        Math.floor(property.units * 0.8)
      ); // 80% occupancy

      for (let i = 0; i < unitsToFill; i++) {
        // Find an unused tenant
        const availableTenants = tenants.filter(
          (t) => !usedTenants.has(t._id.toString())
        );
        if (availableTenants.length === 0) break;

        const tenant =
          availableTenants[Math.floor(Math.random() * availableTenants.length)];
        usedTenants.add(tenant._id.toString());

        const startDate = new Date();
        startDate.setMonth(
          startDate.getMonth() - Math.floor(Math.random() * 12)
        );

        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        const lease = new Lease({
          propertyId: property._id,
          tenantId: tenant.userId, // Use userId from tenant, not tenant._id
          unitId:
            property.units?.[i % (property.units?.length || 1)]?._id ||
            property._id, // Use actual unit ID
          startDate,
          endDate,
          status: LeaseStatus.ACTIVE,
          terms: {
            rentAmount: 1200 + Math.floor(Math.random() * 1800),
            securityDeposit: 1000 + Math.floor(Math.random() * 1000),
            lateFee: 50 + Math.floor(Math.random() * 100),
            utilities: ["water", "sewer"],
            restrictions: ["no_pets", "no_smoking"],
          },
        });

        await lease.save();
        createdLeases.push(lease);
      }
    }

    return createdLeases;
  }

  private async createDemoPayments(tenants: any[]): Promise<any[]> {
    const createdPayments = [];

    for (const tenant of tenants) {
      // Create 3-6 months of payment history
      const paymentCount = 3 + Math.floor(Math.random() * 4);

      for (let i = 0; i < paymentCount; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() - i);
        dueDate.setDate(1); // First of the month

        const payment = new Payment({
          tenantId: tenant._id,
          amount: 1200 + Math.floor(Math.random() * 800),
          dueDate,
          paidDate:
            i === 0
              ? undefined
              : new Date(
                  dueDate.getTime() +
                    Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000
                ),
          status: i === 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
          paymentMethod: ["credit_card", "bank_transfer", "check"][
            Math.floor(Math.random() * 3)
          ],
          description: `Rent payment for ${dueDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}`,
        });

        await payment.save();
        createdPayments.push(payment);
      }
    }

    return createdPayments;
  }

  private async createDemoMaintenance(
    properties: any[],
    tenants: any[]
  ): Promise<any[]> {
    const maintenanceTypes = [
      {
        title: "Leaky Faucet",
        description: "Kitchen faucet is dripping constantly",
        priority: "medium",
      },
      {
        title: "Broken Air Conditioning",
        description: "AC unit not cooling properly",
        priority: "high",
      },
      {
        title: "Clogged Drain",
        description: "Bathroom sink drain is blocked",
        priority: "medium",
      },
      {
        title: "Electrical Issue",
        description: "Light switch not working in bedroom",
        priority: "high",
      },
      {
        title: "Paint Touch-up",
        description: "Wall needs paint repair after moving furniture",
        priority: "low",
      },
      {
        title: "Window Won't Close",
        description: "Living room window is stuck open",
        priority: "medium",
      },
      {
        title: "Garbage Disposal",
        description: "Kitchen garbage disposal making strange noise",
        priority: "medium",
      },
      {
        title: "Heating Problem",
        description: "Heater not working properly",
        priority: "high",
      },
    ];

    const createdMaintenance = [];

    for (let i = 0; i < Math.min(15, properties.length * 3); i++) {
      const property =
        properties[Math.floor(Math.random() * properties.length)];
      const tenant = tenants[Math.floor(Math.random() * tenants.length)];
      const template =
        maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];

      const request = new MaintenanceRequest({
        propertyId: property._id,
        tenantId: tenant._id,
        title: template.title,
        description: template.description,
        priority: template.priority,
        status: [
          MaintenanceStatus.SUBMITTED,
          MaintenanceStatus.IN_PROGRESS,
          MaintenanceStatus.COMPLETED,
        ][Math.floor(Math.random() * 3)],
        unitNumber: `${Math.floor(Math.random() * 4) + 1}${String.fromCharCode(
          65 + Math.floor(Math.random() * 4)
        )}`,
        category: ["Plumbing", "Electrical", "HVAC", "General Repair"][
          Math.floor(Math.random() * 4)
        ],
        estimatedCost: 50 + Math.floor(Math.random() * 500),
      });

      await request.save();
      createdMaintenance.push(request);
    }

    return createdMaintenance;
  }

  private async createDemoMessages(
    users: any[],
    properties: any[]
  ): Promise<any[]> {
    const createdMessages = [];
    const messageTemplates = [
      {
        subject: "Welcome to PropertyPro",
        content:
          "Welcome to our property management system! Please let us know if you have any questions.",
        messageType: "general",
      },
      {
        subject: "Rent Reminder",
        content:
          "This is a friendly reminder that your rent payment is due on the 1st of each month.",
        messageType: "payment",
      },
      {
        subject: "Maintenance Update",
        content:
          "Your maintenance request has been received and will be addressed within 24-48 hours.",
        messageType: "maintenance",
      },
    ];

    const manager = users.find((u) => u.role === UserRole.MANAGER);
    const tenantUsers = users.filter((u) => u.role === UserRole.TENANT);

    for (let i = 0; i < Math.min(10, tenantUsers.length); i++) {
      const tenant = tenantUsers[i];
      const template = messageTemplates[i % messageTemplates.length];

      const message = new Message({
        conversationId: `conv-${manager._id}-${tenant._id}`,
        senderId: manager._id,
        recipientId: tenant._id,
        propertyId:
          properties[Math.floor(Math.random() * properties.length)]._id,
        subject: template.subject,
        content: template.content,
        messageType: template.messageType,
        priority: "normal",
        status: "sent",
        isSystemMessage: false,
      });

      await message.save();
      createdMessages.push(message);
    }

    return createdMessages;
  }

  private async createDemoEvents(
    users: any[],
    properties: any[]
  ): Promise<any[]> {
    const createdEvents = [];
    const eventTemplates = [
      {
        title: "Property Inspection - Unit 1A",
        description: "Quarterly property inspection",
        type: EventType.PROPERTY_INSPECTION,
      },
      {
        title: "Lease Renewal Meeting",
        description: "Discuss lease renewal terms",
        type: EventType.LEASE_RENEWAL,
      },
      {
        title: "Maintenance Appointment",
        description: "Fix kitchen faucet",
        type: EventType.MAINTENANCE_APPOINTMENT,
      },
    ];

    const organizer = users.find((u) => u.role === UserRole.MANAGER);

    for (let i = 0; i < 8; i++) {
      const template = eventTemplates[i % eventTemplates.length];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
      startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const event = new Event({
        title: template.title,
        description: template.description,
        type: template.type,
        status: EventStatus.SCHEDULED,
        priority: "normal",
        startDate,
        endDate,
        allDay: false,
        timezone: "UTC",
        propertyId:
          properties[Math.floor(Math.random() * properties.length)]._id,
        organizer: organizer._id,
        attendees: [],
        isRecurring: false,
        reminders: [{ type: "email", minutesBefore: 15, sent: false }],
        createdBy: organizer._id,
      });

      await event.save();
      createdEvents.push(event);
    }

    return createdEvents;
  }

  private async createDemoAnnouncements(adminUser: any): Promise<any[]> {
    const announcementTemplates = [
      {
        title: "Welcome to PropertyPro Demo",
        content:
          "Welcome to the PropertyPro demo! This system includes sample data to help you explore all features. Feel free to test all functionality.",
        priority: "normal",
        type: "general",
      },
      {
        title: "Building Maintenance Schedule",
        content:
          "Please note that building maintenance will be performed this weekend. Water may be temporarily unavailable on Saturday from 9 AM to 12 PM.",
        priority: "high",
        type: "maintenance",
      },
      {
        title: "New Parking Regulations",
        content:
          "New parking regulations are now in effect. Please ensure your vehicle is properly registered and displays the required permit.",
        priority: "normal",
        type: "policy",
      },
    ];

    const createdAnnouncements = [];

    for (const template of announcementTemplates) {
      const announcement = new Announcement({
        title: template.title,
        content: template.content,
        priority: template.priority,
        type: template.type,
        targetAudience: {
          includeAll: true,
        },
        status: "published",
        publishedAt: new Date(),
        isSticky: false,
        allowComments: true,
        createdBy: adminUser._id,
        views: [],
        reactions: [],
      });

      await announcement.save();
      createdAnnouncements.push(announcement);
    }

    return createdAnnouncements;
  }

  async clearDemoData(): Promise<{ success: boolean; message: string }> {
    try {
      // Clear all collections
      await Promise.all([
        User.deleteMany({}),
        Property.deleteMany({}),
        Tenant.deleteMany({}),
        Lease.deleteMany({}),
        Payment.deleteMany({}),
        MaintenanceRequest.deleteMany({}),
        Message.deleteMany({}),
        Event.deleteMany({}),
        Announcement.deleteMany({}),
      ]);

      return {
        success: true,
        message: "Demo data cleared successfully",
      };
    } catch (error) {
      console.error("Error clearing demo data:", error);
      return {
        success: false,
        message: "Failed to clear demo data",
      };
    }
  }
}

export const demoDataService = DemoDataService.getInstance();
