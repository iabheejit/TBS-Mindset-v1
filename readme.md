# 📱 TBS WhatsApp Learning Management System

An automated WhatsApp-based learning platform that delivers structured courses daily, tracks user progress, and manages interactive content through Airtable integration.

## 🚀 Features

- **🤖 Automated User Registration**: New users are automatically registered when they message
- **📅 Daily Course Delivery**: Content delivered automatically at 9 AM IST via cron jobs
- **📊 Progress Tracking**: Complete user journey tracking in Airtable
- **💬 Interactive Messages**: Lists, buttons, questions, and media support
- **🔄 Smart Flow Management**: Automatic progression through modules and days
- **📈 Analytics Ready**: All interactions stored for analysis
- **⚡ Real-time Processing**: Instant webhook-based message handling

## 🏗️ System Architecture

```
WhatsApp → WATI API → Azure Web App → Airtable Database
                           ↓
                    Cron Jobs (Daily 9 AM)
```

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: Airtable (2 tables)
- **WhatsApp API**: WATI
- **Deployment**: Azure Web Apps
- **Automation**: Node-cron
- **CI/CD**: GitHub Actions

## 📋 Quick Start

1. **Clone Repository**:
```bash
git clone https://github.com/yourusername/tbs-whatsapp-learning.git
cd tbs-whatsapp-learning
npm install
```

2. **Environment Setup**:
```bash
cp .env.template .env
# Edit .env with your credentials
```

3. **Local Development**:
```bash
npm run dev
```

4. **Deploy to Azure**:
```bash
git push origin main
# GitHub Actions will auto-deploy
```

## 📚 Documentation

- **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Step-by-step setup instructions
- **[API Documentation](docs/API.md)** - Endpoint specifications
- **[Database Schema](docs/DATABASE.md)** - Airtable structure

## 🔑 Key Environment Variables

```env
# WATI Configuration
URL=your-instance.wati.io
API=Bearer your_wati_token

# Airtable Configuration  
baseId=appXXXXXXXXXXXXXX
tableId=tblXXXXXXXXXXXXXX
content_tableID=tblYYYYYYYYYYYYYY
personal_access_token=patXXXXXXXXXXXXXX...

# Server Configuration
PORT=3000
WEBHOOK_URL=https://your-app.azurewebsites.net
```

## 🎯 Core Workflows

### New User Registration
1. User sends first WhatsApp message
2. System checks if user exists in Airtable
3. If new, creates user record with default settings
4. Sends welcome message with course information

### Daily Course Delivery  
1. Cron job runs at 9 AM IST daily
2. Queries Airtable for users ready for new content (`Next Module = 0`)
3. Sends structured course content (text, media, interactions)
4. Updates user progress automatically

### Interactive Learning Flow
1. User receives content with questions/options
2. System processes responses and stores in Airtable
3. Automatically progresses to next module/day
4. Sends completion messages and next steps

## 📊 Monitoring Endpoints

- **Health Check**: `GET /ping` - Server status
- **System Status**: `GET /status` - Database connectivity
- **Manual Trigger**: `GET /trigger-daily` - Test course delivery
- **Send Course**: `POST /send-course` - Target specific user

## 🎛️ Admin Features

### Manual Controls
```bash
# Trigger daily delivery immediately
curl https://your-app.azurewebsites.net/trigger-daily

# Send course to specific user
curl -X POST https://your-app.azurewebsites.net/send-course \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890", "day": 1, "module": 0}'
```

### Analytics Queries
- User registration trends
- Course completion rates  
- Module engagement metrics
- Response analysis

## 🔍 Troubleshooting

### Common Issues

**Users not receiving messages?**
- Check WATI API status and credits
- Verify webhook URL in WATI dashboard
- Test Azure app health: `/ping` endpoint

**Cron jobs not running?**
- Verify Azure app is always-on (paid tiers)
- Check timezone settings (`TZ=Asia/Kolkata`)
- Monitor logs at scheduled times

**Database errors?**
- Validate Airtable Personal Access Token
- Check base and table IDs
- Test connection: `/status` endpoint

## 🚀 Production Deployment

### Prerequisites
- WATI WhatsApp Business account
- Airtable workspace with proper schema
- Azure subscription
- GitHub repository

### Deployment Steps
1. Set up Airtable database structure
2. Configure WATI webhook URL
3. Deploy to Azure via GitHub Actions
4. Configure environment variables
5. Test complete user journey

## 📈 Scaling Considerations

**For 100+ users**: Upgrade Azure plan, implement rate limiting
**For 1000+ users**: Move to Azure Functions, add message queuing
**For enterprise**: Implement microservices, Redis caching, monitoring

## 🛡️ Security

- Environment variables for all secrets
- Webhook signature validation
- Rate limiting on API endpoints
- Regular token rotation
- Azure Key Vault integration (recommended)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Issues**: GitHub Issues tab
- **Email**: support@yourcompany.com

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Automated user registration
- ✅ Daily cron job delivery
- ✅ Complete Azure deployment setup
- ✅ Enhanced error handling and logging
- ✅ Health monitoring endpoints

### v1.0.0
- ✅ Basic WhatsApp integration
- ✅ Manual content delivery
- ✅ Airtable storage

---

**Built with ❤️ for automated learning delivery**