# PropertyPro - Professional Property Management System

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://codecanyon.net)
[![License](https://img.shields.io/badge/license-Commercial-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x+-green.svg)](https://mongodb.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Latest-blue.svg)](https://stripe.com/)

> **🏠 Enterprise-grade property management platform built with modern technologies for landlords, property managers, and real estate professionals.**

## 📚 Complete Documentation Suite

### 🚀 Quick Start (15 Minutes)

- **[Quick Start Guide](QUICK_START_GUIDE.md)** - Get up and running in 15 minutes
- **[Environment Setup Guide](ENVIRONMENT_SETUP_GUIDE.md)** - Complete environment configuration
- **[Installation Guide](INSTALLATION_GUIDE.md)** - Comprehensive installation instructions

### 🌐 Deployment Guides

- **[VPS Deployment Guide](VPS_DEPLOYMENT_GUIDE.md)** - Deploy on your own server
- **[Vercel Deployment](INSTALLATION_GUIDE.md#vercel-deployment-recommended)** - One-click cloud deployment

### 🔧 Support & Troubleshooting

- **[Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)** - Solutions for common issues
- **[User Manual](docs/USER_MANUAL.md)** - Complete user documentation
- **[API Documentation](docs/api/)** - Developer API reference

---

## 🎯 For CodeCanyon Buyers

### ⚡ Quick Installation

```bash
# 1. Extract and install
unzip PropertyPro-codecanyon.zip && cd PropertyPro
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Start application
npm run dev
```

**👉 [Follow the complete Quick Start Guide →](QUICK_START_GUIDE.md)**

### 🔑 Required Services (All Free Tiers Available)

- **MongoDB Atlas** - Database (Free 512MB)
- **Stripe** - Payment processing (Free for testing)
- **Cloudflare R2** - File storage (10GB free)
- **SendGrid** - Email service (Free 100 emails/day)

### 📞 Support & Licensing

- **📧 Email Support**: support@PropertyPro.com
- **📖 Documentation**: Complete guides included
- **🔄 Updates**: 1 year of free updates
- **⚖️ License**: Commercial use allowed

---

## 🌟 Key Features

### 🏠 **Property Management**

- Multi-unit property management with detailed tracking
- Property analytics and performance metrics
- Bulk operations for efficient management
- Comprehensive property profiles with images and documents

### 💳 **Advanced Payment Processing**

- **Stripe Integration** - Full payment processing with webhooks
- Recurring payments and automated billing
- Late fees and grace periods
- Payment history and receipt generation
- Multiple payment methods support

### 💬 **Communication Hub**

- Real-time messaging system between landlords and tenants
- Automated notifications (Email, SMS, Push)
- Announcement system for property-wide communications
- Message status tracking and delivery confirmation

### 📋 **Lease Management**

- Complete lease lifecycle management
- Digital lease agreements and e-signatures
- Lease renewal automation
- Tenant screening and application processing

### 🔧 **Maintenance Management**

- Work order system with priority levels
- Emergency maintenance handling
- Vendor management and assignments
- Maintenance analytics and reporting

### 📊 **Business Intelligence**

- Real-time dashboards with key metrics
- Financial reporting and analytics
- Tenant behavior insights
- Property performance tracking

### 📱 **Modern User Experience**

- Responsive design for all devices
- Role-based dashboards (Admin, Manager, Tenant)
- Dark/Light theme support
- Progressive Web App (PWA) capabilities

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with multiple providers
- **Payments**: Stripe integration with webhooks
- **UI Components**: Radix UI, Tailwind CSS
- **File Storage**: Cloudflare R2 integration
- **Email**: SendGrid integration
- **SMS**: Twilio integration
- **Calendar**: Google Calendar integration

## 📋 Prerequisites

Before installation, ensure you have:

- **Node.js** (v18.17.0 or later)
- **npm** or **pnpm** (latest version)
- **MongoDB** (v6.0 or later) or MongoDB Atlas account
- **Git** for version control

## 🔑 Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Database Configuration

```env
MONGODB_URI=mongodb://localhost:27017/PropertyPro
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/PropertyPro
```

### Authentication

```env
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3000
# For production: NEXTAUTH_URL=https://yourdomain.com
```

### Stripe Payment Processing

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Email Configuration (SendGrid)

```env
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=PropertyPro
```

### SMS Configuration (Twilio) - Optional

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### File Storage (Cloudflare R2)

```env
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### OAuth Providers (Optional)

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Google Calendar Integration (Optional)

```env
GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_calendar_client_secret
```

### Feature Flags

```env
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_AUTO_LATE_FEES=true
ENABLE_AUTO_REMINDERS=true
```

## 🚀 Local Development Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/PropertyPro.git
cd PropertyPro
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 4. Database Setup

If using local MongoDB:

```bash
# Install MongoDB Community Edition
# macOS:
brew install mongodb/brew/mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Create database (optional - will be created automatically)
mongosh
use PropertyPro
```

### 5. Initialize the Database

```bash
# Seed system settings
npm run seed:settings

# Setup unified settings (if needed)
npm run setup:unified-settings
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application running.

### 7. Create Your First Admin User

1. Navigate to `http://localhost:3000/auth/signin`
2. Register with your email
3. Run the admin setup script:

```bash
node scripts/setup-admin.js your@email.com
```

## 🌐 Deployment Guides

### Vercel Deployment (Recommended)

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**

   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables in Vercel dashboard
   - Deploy automatically

3. **Configure Webhooks**
   Update your Stripe webhook endpoint to:
   ```
   https://your-domain.vercel.app/api/stripe/webhook
   ```

### VPS/Server Deployment

#### Using PM2 (Production)

1. **Server Setup**

   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm nginx

   # Install PM2 globally
   sudo npm install -g pm2
   ```

2. **Application Setup**

   ```bash
   # Clone repository
   git clone https://github.com/your-repo/PropertyPro.git
   cd PropertyPro

   # Install dependencies
   npm install

   # Build application
   npm run build
   ```

3. **Environment Configuration**

   ```bash
   # Create production environment file
   nano .env.production
   # Add all required environment variables
   ```

4. **Start with PM2**

   ```bash
   # Start application
   pm2 start npm --name "PropertyPro" -- start

   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

5. **Nginx Configuration**

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

#### Using Docker

1. **Create Dockerfile**

   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Docker Compose Setup**

   ```yaml
   version: "3.8"
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       env_file:
         - .env.production
       depends_on:
         - mongodb

     mongodb:
       image: mongo:6
       ports:
         - "27017:27017"
       volumes:
         - mongodb_data:/data/db

   volumes:
     mongodb_data:
   ```

## 🔧 Configuration Guides

### Setting Up Stripe Payments

1. **Create Stripe Account**

   - Sign up at [stripe.com](https://stripe.com)
   - Complete account verification

2. **Get API Keys**

   - Navigate to Developers > API keys
   - Copy Secret key and Publishable key

3. **Setup Webhooks**
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.updated`

### Setting Up Email (SendGrid)

1. **Create SendGrid Account**

   - Sign up at [sendgrid.com](https://sendgrid.com)

2. **Get API Key**

   - Navigate to Settings > API Keys
   - Create new API key with Full Access

3. **Verify Domain**
   - Go to Settings > Sender Authentication
   - Verify your sending domain

### Setting Up SMS (Twilio)

1. **Create Twilio Account**

   - Sign up at [twilio.com](https://twilio.com)

2. **Get Credentials**

   - Find Account SID and Auth Token in Console
   - Purchase a phone number

3. **Configure Messaging**
   - Ensure messaging service is enabled

### Setting Up File Storage (Cloudflare R2)

1. **Create Cloudflare Account**

   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Navigate to R2 Object Storage

2. **Create R2 Bucket**

   - Create a new bucket for PropertyPro
   - Enable public access if needed
   - Note the bucket name

3. **Get API Credentials**

   - Go to R2 > Manage R2 API Tokens
   - Create a new API token with read/write permissions
   - Save the Access Key ID and Secret Access Key
   - Note your Account ID from the R2 dashboard

4. **Configure Public URL**
   - Set up a custom domain or use the default R2.dev URL
   - Update CORS settings if needed for browser uploads

## 📊 Complete Feature List

### 🏠 **Property Management**

- **Multi-Property Support**: Manage unlimited properties with detailed profiles
- **Unit Management**: Individual unit tracking with custom attributes
- **Property Analytics**: Performance metrics, occupancy rates, revenue tracking
- **Bulk Operations**: Mass updates, bulk messaging, batch processing
- **Property Photos**: R2-powered image management with optimization
- **Property Documents**: Lease agreements, certificates, inspection reports
- **Location Management**: Address validation, mapping integration
- **Amenity Tracking**: Property and unit-level amenity management

### 👥 **User Management & Authentication**

- **Multi-Role System**: Admin, Property Manager, Tenant roles with granular permissions
- **Secure Authentication**: NextAuth.js with session management
- **OAuth Integration**: Google and GitHub login options
- **Profile Management**: Comprehensive user profiles with avatars
- **Account Security**: Password policies, session management, audit logs
- **User Onboarding**: Guided setup process for new users
- **Access Control**: Role-based feature access and data visibility

### 💳 **Advanced Payment Processing**

- **Stripe Integration**: Complete payment processing with PCI compliance
- **Recurring Payments**: Automated rent collection with customizable schedules
- **Multiple Payment Methods**: Credit cards, bank transfers, digital wallets
- **Late Fee Automation**: Configurable late fees with grace periods
- **Payment Reminders**: Multi-channel notification system (Email, SMS)
- **Payment History**: Detailed transaction records and receipt generation
- **Partial Payments**: Support for installment payments and payment plans
- **Refund Management**: Automated and manual refund processing
- **Payment Analytics**: Revenue tracking, payment success rates, trending

### 💬 **Communication System**

- **Real-Time Messaging**: Instant messaging between all user types
- **Message Threads**: Organized conversations with context preservation
- **File Attachments**: Document and image sharing within messages
- **Message Status**: Read receipts, delivery confirmation, typing indicators
- **Announcement System**: Property-wide and tenant-specific announcements
- **Email Notifications**: Automated email alerts for messages and updates
- **SMS Integration**: Optional SMS notifications via Twilio
- **Communication History**: Complete audit trail of all interactions

### 📋 **Lease Management**

- **Digital Lease Creation**: Template-based lease generation
- **Lease Templates**: Customizable lease agreement templates
- **E-Signature Integration**: Digital signing capabilities
- **Lease Renewal**: Automated renewal processes and notifications
- **Lease Amendments**: Digital addendums and modifications
- **Move-In/Move-Out**: Checklist management and damage assessment
- **Lease Analytics**: Renewal rates, lease duration analysis
- **Document Management**: Centralized lease document storage

### 🔧 **Maintenance Management**

- **Work Order System**: Complete maintenance request lifecycle
- **Priority Levels**: Emergency, urgent, normal, and low priority classification
- **Vendor Management**: Contractor database with ratings and specializations
- **Maintenance Scheduling**: Calendar integration for maintenance appointments
- **Photo Documentation**: Before/after photos with timestamp
- **Cost Tracking**: Maintenance expense recording and budgeting
- **Preventive Maintenance**: Scheduled recurring maintenance tasks
- **Maintenance Analytics**: Response times, completion rates, cost analysis
- **Emergency Protocols**: 24/7 emergency maintenance handling

### 📊 **Business Intelligence & Reporting**

- **Real-Time Dashboards**: Role-specific dashboards with key metrics
- **Financial Reports**: Income statements, cash flow, profit/loss
- **Occupancy Analytics**: Vacancy rates, turnover analysis
- **Tenant Analytics**: Payment behavior, lease compliance, retention rates
- **Performance Metrics**: Property ROI, maintenance costs, revenue per unit
- **Export Capabilities**: PDF and Excel export for all reports
- **Custom Date Ranges**: Flexible reporting periods
- **Comparative Analysis**: Year-over-year, month-over-month comparisons

### 📅 **Calendar & Scheduling**

- **Integrated Calendar**: Property-wide event and appointment management
- **Google Calendar Sync**: Two-way synchronization with Google Calendar
- **Appointment Scheduling**: Maintenance, inspections, showings
- **Recurring Events**: Automated recurring appointments and reminders
- **Event Notifications**: Multi-channel event reminders
- **Availability Management**: Scheduling conflict prevention
- **Calendar Sharing**: Shared calendars between team members

### 📄 **Document Management**

- **Cloud Storage**: Cloudflare R2 integration for secure file storage
- **Document Categories**: Organized filing system with custom categories
- **Version Control**: Document versioning and revision history
- **Access Permissions**: Role-based document access control
- **Search Functionality**: Full-text document search
- **Bulk Upload**: Multiple file upload with drag-and-drop
- **Document Templates**: Reusable document templates
- **Digital Signatures**: Secure document signing workflows

### 🔍 **Tenant Screening & Applications**

- **Online Applications**: Digital rental application forms
- **Background Checks**: Integration with screening services
- **Credit Reporting**: Credit score and history verification
- **Employment Verification**: Income and employment validation
- **Reference Checks**: Previous landlord and personal references
- **Application Scoring**: Automated application evaluation
- **Approval Workflows**: Multi-step approval processes
- **Applicant Communication**: Direct messaging with applicants

### 📱 **Mobile-First Design**

- **Responsive Interface**: Optimized for all device sizes
- **Progressive Web App**: App-like experience on mobile devices
- **Touch Optimization**: Mobile-friendly interactions and navigation
- **Offline Support**: Basic functionality without internet connection
- **Push Notifications**: Real-time mobile notifications
- **Mobile Photography**: Camera integration for maintenance photos
- **Quick Actions**: Streamlined mobile workflows

### 🔐 **Security & Compliance**

- **Data Encryption**: End-to-end encryption for sensitive data
- **Role-Based Access**: Granular permission system
- **Audit Logging**: Complete activity tracking and logs
- **GDPR Compliance**: Data privacy and protection compliance
- **Secure File Storage**: Encrypted cloud storage with access controls
- **Session Management**: Secure session handling and timeout
- **Two-Factor Authentication**: Optional 2FA for enhanced security
- **Regular Security Updates**: Automated security patches and updates

### 🎨 **Customization & Branding**

- **White Label Support**: Custom branding and logos
- **Theme Customization**: Light/dark mode with custom color schemes
- **Custom Fields**: Property and tenant-specific custom fields
- **Workflow Customization**: Configurable business processes
- **Email Templates**: Customizable email notification templates
- **Invoice Branding**: Custom invoice design and branding
- **Domain Configuration**: Custom domain support

### 🔧 **System Administration**

- **System Settings**: Global application configuration
- **User Management**: Admin tools for user account management
- **Feature Flags**: Enable/disable features based on requirements
- **Backup & Recovery**: Automated data backup and restoration
- **Performance Monitoring**: System health and performance metrics
- **Error Tracking**: Comprehensive error logging and notification
- **Update Management**: Seamless application updates and maintenance
- **Integration Management**: Third-party service configuration

### 📈 **Advanced Analytics**

- **Predictive Analytics**: Lease renewal probability, maintenance forecasting
- **Trend Analysis**: Market trends, pricing optimization suggestions
- **Benchmarking**: Performance comparison against industry standards
- **Custom Metrics**: User-defined KPIs and performance indicators
- **Data Visualization**: Interactive charts and graphs
- **Automated Insights**: AI-powered business intelligence
- **Export Tools**: Data export for external analysis

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Run Specific Tests

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Load Testing

```bash
node scripts/load-test.js
```

## 🚨 Troubleshooting

### Common Issues

#### MongoDB Connection Issues

```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Restart MongoDB
brew services restart mongodb-community

# Check connection string
echo $MONGODB_URI
```

#### Stripe Webhook Issues

- Verify webhook URL is publicly accessible
- Check webhook secret matches environment variable
- Ensure all required events are selected

#### Email Delivery Issues

- Verify SendGrid API key is valid
- Check sender email is verified
- Review SendGrid activity logs

#### Build/Deployment Issues

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules
npm install

# Check environment variables
npm run build
```

#### Environment Variable Issues

```bash
# Check if all required variables are set
node -e "console.log(process.env.MONGODB_URI ? 'DB: OK' : 'DB: Missing')"
node -e "console.log(process.env.STRIPE_SECRET_KEY ? 'Stripe: OK' : 'Stripe: Missing')"
node -e "console.log(process.env.NEXTAUTH_SECRET ? 'Auth: OK' : 'Auth: Missing')"
```

#### Permission Issues

- Ensure MongoDB user has read/write permissions
- Check file system permissions for uploads
- Verify API keys have necessary scopes

### Performance Optimization

#### Database Optimization

- Ensure proper indexing on frequently queried fields
- Monitor query performance with MongoDB Compass
- Use MongoDB Atlas Performance Advisor
- Implement database connection pooling

#### Frontend Optimization

- Images are pre-processed and optimized during upload using Sharp
- Static assets are cached with proper headers
- Bundle size is optimized with code splitting
- Implement service worker for offline functionality

#### API Optimization

- Enable compression middleware
- Implement request caching where appropriate
- Use database aggregation for complex queries
- Monitor API response times

### Debug Mode

Enable debug mode for detailed logging:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

## 📚 API Documentation

The application provides a comprehensive REST API. Key endpoints:

### Authentication

- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/session` - Current session
- `POST /api/auth/signout` - User logout

### Properties

- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `PUT /api/properties/[id]` - Update property
- `DELETE /api/properties/[id]` - Delete property
- `GET /api/properties/[id]/units` - List property units

### Payments

- `GET /api/payments` - List payments
- `POST /api/payments` - Process payment
- `GET /api/payments/history` - Payment history
- `POST /api/stripe/webhook` - Stripe webhook endpoint for tenant rent payments (`/api/payments/webhook` is a legacy alias of it)

### Messages

- `GET /api/messages` - List messages
- `POST /api/messages` - Send message
- `PUT /api/messages/[id]/read` - Mark as read
- `DELETE /api/messages/[id]` - Delete message

### Leases

- `GET /api/leases` - List leases
- `POST /api/leases` - Create lease
- `PUT /api/leases/[id]` - Update lease
- `GET /api/leases/[id]/documents` - Lease documents

### Maintenance

- `GET /api/maintenance` - List work orders
- `POST /api/maintenance` - Create work order
- `PUT /api/maintenance/[id]` - Update work order
- `POST /api/maintenance/[id]/complete` - Complete work order

## 🔒 Security Features

- **Authentication**: Secure session management with NextAuth.js
- **Authorization**: Role-based access control with granular permissions
- **Data Validation**: Input validation with Zod schemas
- **SQL Injection Prevention**: MongoDB ODM protections
- **XSS Prevention**: Content sanitization and CSP headers
- **CSRF Protection**: Built-in Next.js protections
- **Rate Limiting**: API endpoint protection against abuse
- **Encryption**: Sensitive data encryption at rest
- **Secure Headers**: Security headers for all responses
- **File Upload Security**: Malware scanning and file type validation

## 📱 Browser Support

### Desktop Browsers

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

### Mobile Browsers

- iOS Safari 14+ ✅
- Chrome Mobile 90+ ✅
- Samsung Internet 13+ ✅
- Firefox Mobile 88+ ✅

### Progressive Web App Features

- Offline functionality
- Install prompts
- Push notifications
- Background sync

## 💡 Development Tips

### Code Structure

- Follow Next.js 15 App Router conventions
- Use TypeScript for type safety
- Implement proper error boundaries
- Follow component composition patterns

### Database Best Practices

- Use proper indexing strategies
- Implement data validation at schema level
- Use aggregation pipelines for complex queries
- Monitor query performance regularly

### API Development

- Implement proper error handling
- Use middleware for common functionality
- Validate all inputs with Zod
- Document all endpoints

## 🤝 Support

### Getting Help

1. **Documentation**: Check this README and inline code comments
2. **GitHub Issues**: Create detailed issue reports
3. **Email Support**: Contact support@PropertyPro.com
4. **Community**: Join our Discord/Slack community
5. **Video Tutorials**: Access our YouTube channel

### Reporting Bugs

When reporting bugs, please include:

- Environment details (OS, Node version, browser)
- Steps to reproduce the issue
- Expected vs actual behavior
- Console errors and network logs
- Screenshots or screen recordings
- Configuration details (anonymized)

### Feature Requests

For new feature requests:

- Describe the use case and business value
- Provide mockups or examples if possible
- Explain how it fits with existing functionality
- Consider implementation complexity

## 🔄 Version History

### Version 1.0.0 (Current)

- ✨ Initial release with full feature set
- 🏠 Complete property management system
- 💳 Stripe payment integration with webhooks
- 👥 Multi-user authentication and authorization
- 💬 Real-time messaging system
- 📄 Document management with Cloudflare R2
- 📅 Calendar integration with Google Calendar
- 🔧 Maintenance management workflow
- 📊 Business intelligence and reporting
- 📱 Mobile-responsive design
- 🔒 Enterprise-level security features

### Upcoming Features (v1.1.0)

- 📊 Enhanced analytics with AI insights
- 🔔 Advanced notification preferences
- 📱 Native mobile applications
- 🏦 Additional payment gateway integrations
- 🌐 Multi-language support
- 📈 Market analysis tools

## 📄 License

This is a **commercial software product**. All rights reserved.

### License Terms

- ✅ **Commercial Use**: Use for commercial projects and revenue generation
- ✅ **Modification**: Modify source code for your specific use case
- ✅ **Private Deployment**: Deploy on your own servers and infrastructure
- ✅ **Client Projects**: Use for client work and consulting services
- ❌ **Redistribution**: Cannot resell or redistribute the source code
- ❌ **Public Repository**: Cannot publish code to public repositories
- ❌ **Copyright Removal**: Must maintain copyright notices
- ❌ **Derivative Sales**: Cannot create competing products for resale

### Support & Updates

- 🔧 **1 Year Support**: Technical support and bug fixes included
- 🆕 **Version Updates**: Free updates for 1 year from purchase
- 📧 **Priority Support**: Email support with 24-48 hour response time
- 📖 **Documentation**: Comprehensive documentation and guides

### Extended Licensing

For additional licensing options including:

- White-label resale rights
- Source code repository access
- Extended support periods
- Custom development services

Contact: **licensing@PropertyPro.com**

---

**🏠 Built with ❤️ for Property Management Professionals**

_Transform your property management business with PropertyPro - where technology meets real estate excellence._

**Support Contacts:**

- 📧 Technical Support: [support@PropertyPro.com](mailto:support@PropertyPro.com)
- 💼 Business Inquiries: [business@PropertyPro.com](mailto:business@PropertyPro.com)
- 📄 Licensing: [licensing@PropertyPro.com](mailto:licensing@PropertyPro.com)
