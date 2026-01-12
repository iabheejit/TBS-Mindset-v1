# CLAUDE.md - AI Assistant Guide for TBS WhatsApp Learning System

> **Last Updated:** 2026-01-12
> **Version:** 2.0.0
> **Purpose:** Comprehensive guide for AI assistants working with this codebase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Architecture](#codebase-architecture)
3. [File Structure & Responsibilities](#file-structure--responsibilities)
4. [Core Workflows](#core-workflows)
5. [Development Guidelines](#development-guidelines)
6. [Environment & Configuration](#environment--configuration)
7. [Database Schema (Airtable)](#database-schema-airtable)
8. [API Integrations](#api-integrations)
9. [Deployment & CI/CD](#deployment--cicd)
10. [Common Tasks & Patterns](#common-tasks--patterns)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Testing Strategy](#testing-strategy)

---

## Project Overview

### What is This Project?

**TBS WhatsApp Learning Management System** is an automated, WhatsApp-based learning platform that delivers structured educational content to users daily. It leverages:

- **WhatsApp Business API** (via WATI) for messaging
- **Airtable** as the database for user data and course content
- **Node.js/Express** backend for webhook handling and automation
- **Azure Web Apps** for hosting
- **GitHub Actions** for CI/CD

### Key Features

- Automated user registration on first message
- Scheduled daily content delivery (9 AM IST via cron)
- Interactive learning modules (text, media, quizzes, lists)
- Progress tracking and response storage
- Multi-day course support with module-based progression

### Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js |
| **Database** | Airtable (cloud) |
| **Messaging API** | WATI (WhatsApp) |
| **Scheduling** | node-cron |
| **Deployment** | Azure Web Apps |
| **CI/CD** | GitHub Actions |

---

## Codebase Architecture

### Architecture Pattern

**Monolithic Server with Webhook-Based Event Handling**

```
┌─────────────────┐
│  WhatsApp User  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   WATI API      │ ◄──── Sends messages
└────────┬────────┘       Receives webhooks
         │
         ▼
┌─────────────────────────────────────┐
│   Azure Web App (server.js)         │
│  ┌──────────────────────────────┐   │
│  │  POST /web (Webhook Handler) │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  Cron Jobs (9 AM, 6 PM IST)  │   │
│  └──────────────────────────────┘   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Airtable Database                  │
│  ┌────────────┐  ┌────────────────┐ │
│  │  Students  │  │ Course Content │ │
│  │   Table    │  │     Table      │ │
│  └────────────┘  └────────────────┘ │
└─────────────────────────────────────┘
```

### Request Flow

1. **User sends WhatsApp message** → WATI captures it
2. **WATI sends webhook** to `/web` endpoint
3. **server.js processes request**:
   - Checks if user exists (new registration or existing)
   - Determines user state (current day, module)
   - Routes to appropriate handler in `test.js`
4. **test.js executes logic**:
   - Fetches content from Airtable via `update.js`
   - Sends messages via `wati.js`
   - Updates user progress in Airtable
5. **Response sent** back to WhatsApp user

---

## File Structure & Responsibilities

### Core Files

| File | Lines | Purpose | Key Functions |
|------|-------|---------|--------------|
| **server.js** | 309 | Main application entry, webhook handler, cron scheduler | `handleNewUser()`, `deliverDailyCourse()`, `/web` endpoint |
| **test.js** | 1467 | Core business logic for course delivery and progression | `sendModuleContent()`, `findModule()`, `markModuleComplete()`, `store_responses()` |
| **update.js** | 548 | Airtable database operations and queries | `getID()`, `updateField()`, `findTable()`, `findField()`, `totalDays()` |
| **wati.js** | 225 | WhatsApp API wrapper for WATI | `sendText()`, `sendListInteractive()`, `sendMedia()`, `sendInteractiveButtonsMessage()` |
| **image.js** | 102 | Media file handler for images/documents | `sendMediaFile()`, `sendMediaFile_v2()` |

### Configuration Files

| File | Purpose |
|------|---------|
| **.env.template** | Environment variable template |
| **package.json** | Dependencies and scripts |
| **.github/workflows/azure-deploy.yml** | CI/CD pipeline for Azure deployment |
| **docker-compose.yml** | Local development container setup |
| **Dockerfile** | Container image definition |

### Documentation Files

| File | Purpose |
|------|---------|
| **readme.md** | User-facing project documentation |
| **DEPLOYMENT_GUIDE.md** | Step-by-step deployment instructions |
| **SECURITY.md** | Security policy and vulnerability reporting |

---

## Core Workflows

### 1. New User Registration Flow

**Trigger:** User sends first WhatsApp message

```
POST /web receives message
  ↓
Check if user exists via airtable.getID(senderID)
  ↓
If user NOT found:
  ↓
  handleNewUser(senderID, userName)
    ↓
    Create user record in Airtable
      - Phone: senderID
      - Name: userName
      - Course: "TBS-Mindset"
      - Next Day: 1
      - Next Module: 0
      - Registration Date: now
    ↓
    Send welcome message via WA.sendText()
```

**Location:** `server.js:15-67`

**Key Fields Created:**
- `Phone`: User's WhatsApp number
- `Course`: "TBS-Mindset" (fixed)
- `Next Day`: 1 (starting day)
- `Next Module`: 0 (indicates waiting for day start)
- `Last_Msg`: "Welcome"

---

### 2. Daily Course Delivery Flow

**Trigger:** Cron job at 9:00 AM IST daily

```
cron.schedule('0 9 * * *') triggers deliverDailyCourse()
  ↓
Fetch all users from Airtable student table
  ↓
For each user:
  ↓
  Check if Next Module === 0 (ready for new day)
  AND Next Day <= totalDays (course not complete)
  ↓
  If eligible:
    ↓
    Update Next Module to 1
    ↓
    Call test.sendModuleContent(phone)
      ↓
      Send "Day Topic" message with "Let's Begin" button
```

**Location:** `server.js:69-130`

**Cron Configuration:**
- Timezone: `Asia/Kolkata`
- Schedule: Daily at 9:00 AM
- Additional: Evening reminder at 6:00 PM (placeholder)

---

### 3. Interactive Message Processing

**Trigger:** User responds to message (keyword, list selection, button click)

```
POST /web receives user response
  ↓
Identify message type:
  ├─ req.body.listReply → List selection
  ├─ keyword === "Let's Begin" → Start day modules
  ├─ keyword === "Start Day" → Manual day trigger
  ├─ keyword === "Next." → Advance to next module
  └─ else → Text response to question
  ↓
Route to appropriate handler in test.js:
  ├─ test.store_responses() → List/quiz answers
  ├─ test.findModule() → Continue module progression
  ├─ test.sendModuleContent() → Start new day
  └─ test.store_quesResponse() → Open-ended question answers
```

**Location:** `server.js:133-203`

**Keyword Mapping:**
- `"Let's Begin"` → `test.findModule(currentDay, current_module, senderID)`
- `"Start Day"` → `test.sendModuleContent(senderID)`
- `"Next."` or `"नेक्स्ट"` → `test.markModuleComplete(senderID)`
- List reply → `test.store_responses(senderID, reply.title)`
- Any other text → `test.store_quesResponse(senderID, keyword)`

---

### 4. Module Progression Logic

**Core Function:** `test.js:findModule(currentDay, module_No, number)`

```
findModule() retrieves content for current day/module
  ↓
Check module structure:
  ├─ Has Text + List → Send text then list
  ├─ Has Question only → Send media + question
  ├─ Has Interactive body → Send interactive buttons
  └─ Has Text only → Send text messages
  ↓
Split text by "#" delimiter
  ↓
Send each segment with delay:
  - First segment: immediate
  - "Image X" → trigger sendMediaFile_v2(X)
  - Other text → 10s delay between messages
  ↓
If module has link → send link after 2s
  ↓
If module has question → send question after 5s
  ↓
Send "Next." button to advance
```

**Location:** `test.js:905-1193`

**Module Types:**
1. **Text Module** (`Module X Text`): Plain text content
2. **List Module** (`Module X LTitle` + `Module X List`): Multiple choice selection
3. **Question Module** (`Module X Question`): Open-ended question
4. **Interactive Module** (`Module X iBody` + `Module X iButtons`): Button-based interaction
5. **Media Module** (`Module X File`): Images, PDFs, videos

---

### 5. Response Storage and Validation

**Quiz/List Responses:** `test.js:store_responses(number, value)`

```
User selects list option
  ↓
Fetch correct answer: us.findAns(currentDay, currentModule, number)
  ↓
Compare user selection with correct answer:
  ├─ Correct on 1st attempt → Congratulations message
  ├─ Incorrect on 1st attempt → Update Last_Msg to "Incorrect", prompt retry
  └─ 2nd attempt → Show correct answer, proceed
  ↓
Store response in "Question Responses" field
  ↓
Call findContent() to send next module or "Next." button
```

**Location:** `test.js:289-562`

**Validation Logic:**
- **First attempt correct:** Send random congratulations message, store answer, proceed
- **First attempt wrong:** Send retry message, set `Last_Msg = "Incorrect"`
- **Second attempt (any answer):** Reveal correct answer if still wrong, proceed

**Open-Ended Responses:** `test.js:store_quesResponse(number, value)`

```
User types text response
  ↓
Check if Last_Msg matches current question
  ↓
If matched:
  ↓
  Store in "Responses" field as: "Q: {question}\nA: {value}"
  ↓
  Call find_QContent() to continue progression
```

**Location:** `test.js:630-707`

---

### 6. Day Completion Flow

**Trigger:** User completes all modules in a day

```
markModuleComplete() called when Next Module >= 6
  ↓
Update fields:
  - Next Module → 0 (reset for next day)
  - Module Completed → current module number
  ↓
Call findDay(cDay, number)
  ↓
Check if currentDay === 4 (final day):
  ├─ Yes → Send completion message without "tomorrow" language
  └─ No → Send "You will receive Day X tomorrow"
  ↓
Call markDayComplete(number)
  ↓
Update fields:
  - Next Day → currentDay + 1
  - Day Completed → currentDay
  - Next Module → 1
  - Module Completed → 0
  ↓
Send referral link after 5s delay
```

**Location:** `test.js:19-89` (markDayComplete), `test.js:92-168` (findDay)

**Special Logic for Day 4:**
- No "tomorrow" mention (course ends)
- Optionally trigger outro flow (currently commented out)

---

## Development Guidelines

### Code Style & Conventions

1. **Async/Await:** All Airtable and API calls use `async/await` with `.catch()` for error handling
2. **Naming Conventions:**
   - Functions: camelCase (`sendModuleContent`, `findDay`)
   - Variables: camelCase (`currentDay`, `module_No`, `senderID`)
   - Constants: UPPER_CASE (`TABLE_ID`, `BASE_ID`, `API_KEY`)
3. **Error Handling:**
   - Console.log for debugging
   - Try-catch blocks in main functions
   - `.catch(e => console.log(e))` for promise chains
4. **Comments:**
   - Function purpose documented at the top
   - Complex logic explained inline
   - Debugging logs prefixed with numbers (e.g., "1. Updating")

### Important Patterns

#### 1. Delayed Message Sending

**Pattern:** Use `setTimeout()` for sequential message delivery

```javascript
setTimeout(() => {
    WA.sendText(message, number);
}, 2000); // 2 second delay
```

**Why:** Prevents message ordering issues and rate limiting

#### 2. Airtable Query Pattern

**Pattern:** Fetch with filterByFormula, then iterate records

```javascript
const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
const params = new URLSearchParams({
    filterByFormula: `({Phone} = "${number}")`,
    view: 'Grid view'
});

const response = await fetch(`${url}?${params}`, {
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    }
});

const data = await response.json();
const records = data.records;

for (const record of records) {
    // Process record
}
```

**Location:** Used in `update.js` and `test.js` throughout

#### 3. Module Content Check Pattern

**Pattern:** Check for undefined before processing

```javascript
if (module_text !== undefined && module_list !== undefined) {
    // Both exist, send both
} else if (module_text !== undefined) {
    // Only text
} else if (module_list !== undefined) {
    // Only list
}
```

**Why:** Modules can have different content types; checking prevents null errors

#### 4. Split Message Pattern

**Pattern:** Split text by delimiter, send with delays

```javascript
let module_split = module_text.split("#");
let index = 0;

for (index; index < module_split.length; index++) {
    if (index === 0) {
        await WA.sendText(module_split[index], number);
    } else if (module_split[index].includes("Image")) {
        let imageIndex = Number(module_split[index].split(" ")[1]);
        await sendContent.sendMediaFile_v2(imageIndex, day, module_No, number);
    } else {
        await awaitTimeout(10000);
        await WA.sendText(module_split[index], number);
    }
}
```

**Location:** `test.js:1197-1234`

**Why:** Allows inline media insertion and natural pacing

---

### Critical Rules

**DO:**
- Always check if user exists before processing messages
- Update `Last_Msg` field when sending questions/lists for validation
- Use delays between messages (2-10 seconds)
- Store all user responses in appropriate Airtable fields
- Validate quiz answers before progression
- Check `totalDays` before sending new day content
- Use `Next Module === 0` as indicator for new day readiness

**DON'T:**
- Never skip user state checks (Next Day, Next Module, Last_Msg)
- Don't send multiple messages without delays (causes ordering issues)
- Don't hardcode credentials (use environment variables)
- Don't modify core progression logic without understanding full flow
- Don't skip error handling on Airtable/WATI calls
- Don't assume module structure (always check for undefined)

---

## Environment & Configuration

### Environment Variables

**Required Variables:**

```bash
# WATI WhatsApp API
URL=your-instance.wati.io          # WATI subdomain
API=Bearer your_wati_token         # WATI API token with "Bearer " prefix

# Airtable Database
BASE_ID=appXXXXXXXXXXXXXX          # Airtable base ID
TABLE_ID=tblXXXXXXXXXXXXXX         # Students table ID
CONTENT_TABLE_ID=tblYYYYYYYYYYYY   # Course content table ID (or table name)
PERSONAL_ACCESS_TOKEN=patXXXXX...  # Airtable PAT (starts with "pat")

# Server Configuration
PORT=3000                           # Server port (Azure uses 8080)
NODE_ENV=production                 # Environment mode
WEBHOOK_URL=https://your-app.azure  # Publicly accessible webhook URL

# Optional
TZ=Asia/Kolkata                     # Timezone for cron jobs
```

**Location:** `.env` (local), Azure App Settings (production)

### Configuration Notes

1. **Airtable Table Names:**
   - Student table: Fixed by `TABLE_ID` env var
   - Content table: Can be `CONTENT_TABLE_ID` (table ID) or table name (fetched from user's `Course` field)

2. **WATI Configuration:**
   - Webhook must be set in WATI dashboard to point to `{WEBHOOK_URL}/web`
   - API token requires session message permissions

3. **Azure Configuration:**
   - `SCM_DO_BUILD_DURING_DEPLOYMENT=true` (enables build)
   - `PORT=8080` (Azure default)
   - App Settings sync via GitHub Actions (see `.github/workflows/azure-deploy.yml:32-46`)

---

## Database Schema (Airtable)

### Students Table (TABLE_ID)

**Purpose:** Track user enrollment, progress, and responses

| Field Name | Type | Purpose | Example |
|------------|------|---------|---------|
| `Phone` | Single Line Text | User's WhatsApp number (primary key) | `918779171731` |
| `Name` | Single Line Text | User's name | `John Doe` |
| `Course` | Single Line Text | Course name (also used as content table name) | `TBS-Mindset` |
| `Registration Date` | Date | When user first enrolled | `2026-01-12` |
| `Next Day` | Number | Current day user is on | `2` |
| `Day Completed` | Number | Last completed day | `1` |
| `Next Module` | Number | Current module user is on (0 = ready for new day) | `3` |
| `Module Completed` | Number | Last completed module | `2` |
| `Last_Msg` | Single Line Text | Last message sent (for validation) | `Q: What is the capital?` |
| `Responses` | Long Text | Open-ended question responses | `Q: ...\nA: ...\n\nQ: ...\nA: ...` |
| `Question Responses` | Long Text | Quiz/list responses | `Q: ...\nA: ...\n\nQ: ...\nA: ...` |
| `Interactive_Responses` | Long Text | Interactive button responses | `Body\nResponse\n\nBody\nResponse` |
| `Feedback` | Long Text | User feedback scores | `Day 1 - 4\n\nDay 2 - 3` |

**Key Logic:**
- `Next Module === 0` → User is ready for next day's content
- `Next Day > totalDays` → User has completed the course

### Course Content Table (CONTENT_TABLE_ID or Course name)

**Purpose:** Store structured course content by day and module

| Field Name | Type | Purpose | Example |
|------------|------|---------|---------|
| `Day` | Number | Day number | `1` |
| `Day Topic` | Long Text | Introduction message for the day | `Welcome to Day 1!` |
| `Module X Text` | Long Text | Main text content for module X | `This is lesson content...` |
| `Module X Link` | URL | External link for module X | `https://example.com` |
| `Module X LTitle` | Single Line Text | List question/title | `Which option is correct?` |
| `Module X List` | Long Text | Newline-separated list options | `Option A\nOption B\nOption C` |
| `Module X Ans` | Single Line Text | Correct answer for list | `Option B` |
| `Module X Question` | Long Text | Open-ended question | `What did you learn?` |
| `Module X iBody` | Long Text | Interactive message body | `Choose your preference:` |
| `Module X iButtons` | Long Text | Newline-separated button labels | `Yes\nNo\nMaybe` |
| `Module X File` | Attachment | Media files (images, PDFs) | `image.jpg` |
| `Module X next` | Single Line Text | Custom "Next" button message | `Continue Learning!` |

**Module Structure (X = 1-6):**
- Each day can have up to 6 modules
- Modules are processed sequentially (1 → 2 → 3 → 4 → 5 → 6)
- Empty modules are skipped automatically

**Content Type Combinations:**
1. **Text-only:** `Module X Text`
2. **Text + Link:** `Module X Text` + `Module X Link`
3. **Text + Media:** `Module X Text` (with `#Image 0` inline) + `Module X File`
4. **List/Quiz:** `Module X LTitle` + `Module X List` + `Module X Ans`
5. **Question:** `Module X Question`
6. **Interactive:** `Module X iBody` + `Module X iButtons`

---

## API Integrations

### 1. Airtable API

**Base URL:** `https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}`

**Authentication:** Bearer token in `Authorization` header

**Common Operations:**

#### Fetch Records with Filter
```javascript
const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
const params = new URLSearchParams({
    filterByFormula: `({Phone} = "${phoneNumber}")`,
    view: 'Grid view'
});

const response = await fetch(`${url}?${params}`, {
    headers: {
        'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    }
});
```

#### Update Record
```javascript
const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`;

const response = await fetch(url, {
    method: 'PATCH',
    headers: {
        'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        fields: {
            "Next Module": 2,
            "Module Completed": 1
        }
    })
});
```

#### Create Record
```javascript
const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        fields: {
            Phone: "918779171731",
            Name: "John Doe",
            Course: "TBS-Mindset"
        }
    })
});
```

**Wrapper Functions:** See `update.js` for all database operations

---

### 2. WATI WhatsApp API

**Base URL:** `https://{URL}/api/v1/`

**Authentication:** Bearer token in `Authorization` header

**Common Operations:**

#### Send Text Message
```javascript
POST /sendSessionMessage/{phoneNumber}
Content-Type: multipart/form-data

{
  "messageText": "Your message here"
}
```

**Wrapper:** `wati.js:sendText(msg, senderID)`

#### Send Interactive Buttons
```javascript
POST /sendInteractiveButtonsMessage?whatsappNumber={phoneNumber}
Content-Type: application/json

{
  "header": { "type": "Text", "text": "Header" },
  "body": "Body text",
  "buttons": [
    { "text": "Button 1" },
    { "text": "Button 2" }
  ]
}
```

**Wrapper:** `wati.js:sendInteractiveButtonsMessage(hTxt, bTxt, btnTxt, senderID)`

#### Send List Message
```javascript
POST /sendInteractiveListMessage?whatsappNumber={phoneNumber}
Content-Type: application/json

{
  "body": "Choose an option:",
  "buttonText": "Options",
  "sections": [
    {
      "title": "Section 1",
      "rows": [
        { "title": "Option 1" },
        { "title": "Option 2" }
      ]
    }
  ]
}
```

**Wrapper:** `wati.js:sendListInteractive(data, body, btnText, senderID)`

#### Send Media File
```javascript
POST /sendSessionFile/{phoneNumber}
Content-Type: multipart/form-data

{
  "file": <binary data>,
  "filename": "image.jpg"
}
```

**Wrapper:** `wati.js:sendMedia(file, filename, senderID)`

**Webhook Payload (Incoming Message):**

```json
{
  "waId": "918779171731",
  "text": "User message text",
  "senderName": "John Doe",
  "listReply": {
    "title": "Selected Option"
  },
  "buttonReply": {
    "text": "Button Text"
  }
}
```

---

## Deployment & CI/CD

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/tbs-whatsapp-learning.git
cd tbs-whatsapp-learning

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.template .env
# Edit .env with your credentials

# 4. Start development server
npm run dev

# 5. Test webhook (requires ngrok or similar)
ngrok http 3000
# Update WATI webhook to: https://<ngrok-url>/web
```

**Development Server:** Runs on `localhost:3000` with nodemon auto-reload

---

### Production Deployment (Azure)

**Deployment Method:** GitHub Actions → Azure Web Apps

**Workflow File:** `.github/workflows/azure-deploy.yml`

**Deployment Steps:**

1. **Trigger:** Push to `main` branch or manual workflow dispatch
2. **Build:**
   - Checkout code
   - Setup Node.js 20
   - Install production dependencies: `npm ci --omit=dev`
3. **Azure Login:** OIDC authentication with Azure
4. **Sync App Settings:** Inject environment variables (including secrets)
5. **Package:** Create `app.zip` (excludes `.git` and `.github`)
6. **Deploy:** Push to Azure Web App

**Azure Configuration:**

```yaml
App Name: TBS-rg
Region: Central India
Runtime: Node 20 LTS
App Settings: Synced from GitHub Actions
Deployment: ZIP package
Build: Oryx (SCM_DO_BUILD_DURING_DEPLOYMENT=true)
```

**Required GitHub Secrets:**

```
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

**Manual Deployment:**

```bash
# Using Azure CLI
az login
az webapp deploy --resource-group <rg-name> --name TBS-rg --src-path app.zip
```

---

### Continuous Deployment Checklist

**Before Pushing to Main:**

- [ ] Test locally with ngrok webhook
- [ ] Verify all environment variables are set
- [ ] Check Airtable schema matches code expectations
- [ ] Test new user registration flow
- [ ] Test module progression (at least 1 full day)
- [ ] Verify cron job timing (optional: test with manual trigger)
- [ ] Check error handling for edge cases
- [ ] Update README/CLAUDE.md if API changes

**After Deployment:**

- [ ] Check Azure deployment logs
- [ ] Hit `/ping` endpoint to verify server is up
- [ ] Hit `/status` endpoint to verify Airtable connection
- [ ] Update WATI webhook URL (if changed)
- [ ] Test end-to-end flow with test user
- [ ] Monitor logs for first 24 hours

---

## Common Tasks & Patterns

### Task 1: Add a New Module Type

**Scenario:** You want to add "Video Module" support

**Steps:**

1. **Update Airtable Schema:**
   ```
   Add field: "Module X Video URL" (URL type)
   ```

2. **Modify `test.js:findModule()`:**
   ```javascript
   let module_video = record.fields[`Module ${module_No} Video URL`];

   if (module_video !== undefined) {
       WA.sendText(`Watch this video: ${module_video}`, number);
   }
   ```

3. **Test with sample content:**
   ```
   Day 1, Module 1 Video URL: https://youtube.com/watch?v=xyz
   ```

4. **Deploy and verify**

---

### Task 2: Change Daily Delivery Time

**Current:** 9:00 AM IST
**Goal:** Change to 8:00 AM IST

**Location:** `server.js:281-287`

```javascript
// Change from:
cron.schedule('0 9 * * *', async () => {
    // ...
});

// To:
cron.schedule('0 8 * * *', async () => {
    // ...
});
```

**Cron Syntax:** `'0 8 * * *'`
- Minute: 0
- Hour: 8 (24-hour format)
- Day of month: * (every day)
- Month: * (every month)
- Day of week: * (every day)

---

### Task 3: Add Custom Validation for Quiz Answers

**Scenario:** Allow partial credit or case-insensitive matching

**Location:** `test.js:store_responses()`

**Current Logic:**
```javascript
const isCorrect = correct_ans === value;
```

**Enhanced Logic:**
```javascript
const isCorrect = correct_ans.toLowerCase().trim() === value.toLowerCase().trim();
```

**For Partial Credit:**
```javascript
const correctAnswers = correct_ans.split("|"); // "A|B" allows both
const isCorrect = correctAnswers.some(ans =>
    ans.toLowerCase().trim() === value.toLowerCase().trim()
);
```

---

### Task 4: Send Reminder to Incomplete Users

**Goal:** At 6 PM, remind users who haven't completed the day

**Location:** `server.js:289-296` (evening cron job)

**Implementation:**

```javascript
cron.schedule('0 18 * * *', async () => {
    console.log('Sending evening reminders...');

    const url = `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_ID}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();

    for (const record of data.records) {
        const phone = record.fields.Phone;
        const nextModule = record.fields["Next Module"];

        // User started but didn't finish
        if (nextModule > 0) {
            WA.sendText(
                "👋 Hey! Don't forget to complete today's learning modules. Type 'Start Day' to continue!",
                phone
            );
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});
```

---

### Task 5: Export User Progress Report

**Goal:** Generate CSV of all user progress

**New Endpoint:** `GET /report`

```javascript
webApp.get('/report', async (req, res) => {
    try {
        const url = `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_ID}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        let csv = 'Phone,Name,Current Day,Current Module,Day Completed,Registration Date\n';

        data.records.forEach(record => {
            const f = record.fields;
            csv += `${f.Phone},${f.Name},${f["Next Day"]},${f["Next Module"]},${f["Day Completed"]},${f["Registration Date"]}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=progress.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## Troubleshooting Guide

### Issue 1: Users Not Receiving Messages

**Symptoms:**
- Cron job logs show "Sent to X users"
- But users report no WhatsApp messages

**Diagnosis Steps:**

1. **Check WATI Credits:**
   ```
   Log into WATI dashboard → Check message credits
   ```

2. **Verify Webhook URL:**
   ```
   WATI Dashboard → Settings → Webhooks
   Should point to: https://<your-app>.azurewebsites.net/web
   ```

3. **Test WATI API Manually:**
   ```bash
   curl -X POST "https://<your-instance>.wati.io/api/v1/sendSessionMessage/<phone>" \
     -H "Authorization: Bearer <token>" \
     -F "messageText=Test message"
   ```

4. **Check Azure Logs:**
   ```bash
   az webapp log tail --name TBS-rg --resource-group <rg-name>
   ```

**Common Fixes:**
- Recharge WATI credits
- Update webhook URL in WATI
- Restart Azure app: `az webapp restart --name TBS-rg`

---

### Issue 2: Duplicate Message Sending

**Symptoms:**
- Users receive same message 2-3 times
- Airtable shows correct state

**Root Cause:** Multiple webhook calls or async race conditions

**Fix 1 - Webhook Deduplication:**

```javascript
// In server.js, add request tracking
const processedRequests = new Set();

webApp.post('/web', async (req, res) => {
    const requestId = `${req.body.waId}-${req.body.text}-${Date.now()}`;

    if (processedRequests.has(requestId)) {
        return res.status(200).send('Duplicate request ignored');
    }

    processedRequests.add(requestId);
    setTimeout(() => processedRequests.delete(requestId), 5000); // Clear after 5s

    // ... rest of handler
});
```

**Fix 2 - State Lock:**

```javascript
// Add "Processing" field to Airtable student table
// Check before processing:

const isProcessing = await airtable.findField("Processing", senderID);
if (isProcessing === "true") {
    return res.status(200).send('Already processing');
}

await airtable.updateField(id, "Processing", "true");
// ... do work
await airtable.updateField(id, "Processing", "false");
```

---

### Issue 3: Cron Job Not Running

**Symptoms:**
- No logs at scheduled time (9 AM IST)
- Users don't get daily content

**Diagnosis:**

1. **Check Azure Always On:**
   ```
   Azure Portal → App Service → Configuration → General Settings
   "Always On" must be ON (requires Basic tier or higher)
   ```

2. **Verify Timezone:**
   ```javascript
   console.log(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
   ```

3. **Test Manual Trigger:**
   ```bash
   curl https://<your-app>.azurewebsites.net/trigger-daily
   ```

**Fixes:**
- Upgrade to Basic tier or higher
- Add `TZ=Asia/Kolkata` to app settings
- Use external cron service (e.g., Azure Logic Apps) to hit `/trigger-daily`

---

### Issue 4: "Failed to fetch records from Airtable" Error

**Symptoms:**
- 401/403 errors in logs
- Database operations fail

**Diagnosis:**

1. **Check Token:**
   ```bash
   curl "https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?maxRecords=1" \
     -H "Authorization: Bearer ${PERSONAL_ACCESS_TOKEN}"
   ```

2. **Verify Scopes:**
   - Token must have `data.records:read` and `data.records:write` scopes
   - Token must have access to specific base

3. **Check Table IDs:**
   ```javascript
   console.log('BASE_ID:', process.env.BASE_ID);
   console.log('TABLE_ID:', process.env.TABLE_ID);
   // Should be: appXXXXXXXXXXXXXX and tblXXXXXXXXXXXXXX
   ```

**Fixes:**
- Regenerate Airtable Personal Access Token
- Update token in Azure App Settings
- Verify base and table IDs are correct
- Restart Azure app

---

### Issue 5: Module Progression Stuck

**Symptoms:**
- User reports being stuck on one module
- "Next." button doesn't advance

**Diagnosis:**

1. **Check User State:**
   ```
   Open Airtable → Find user by phone
   Check: Next Day, Next Module, Last_Msg
   ```

2. **Check Content Table:**
   ```
   Verify Day X has modules 1-6 defined
   Check for empty/undefined fields
   ```

3. **Review Logs:**
   ```
   Look for: "After X" logs to see progression loop
   Look for: "Module text undefined" messages
   ```

**Fixes:**

**Fix 1 - Manual Reset:**
```
Update user in Airtable:
- Next Module → 1 (or next expected module)
- Last_Msg → "Reset"
- Ask user to type "Start Day"
```

**Fix 2 - Content Gap:**
```
If module 3 is empty but module 4 exists:
- Either fill module 3
- Or adjust loop in findModule to skip more intelligently
```

**Fix 3 - State Mismatch:**
```javascript
// In server.js, add debug endpoint:
webApp.post('/debug-user', async (req, res) => {
    const phone = req.body.phone;
    const id = await airtable.getID(phone);
    const user = await airtable.findRecord(id);
    res.json(user);
});
```

---

## Testing Strategy

### Unit Testing (Future Enhancement)

**Recommended Framework:** Jest

**Key Functions to Test:**
1. `update.js:getID()` - User lookup
2. `update.js:findField()` - Field retrieval
3. `test.js:store_responses()` - Answer validation logic
4. `wati.js` - Mock API calls

**Sample Test:**

```javascript
// tests/update.test.js
const { getID } = require('../update');

jest.mock('node-fetch');

describe('getID', () => {
    it('should return record ID for existing user', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ records: [{ id: 'rec123' }] })
        });

        const id = await getID('918779171731');
        expect(id).toBe('rec123');
    });

    it('should return null for non-existing user', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ records: [] })
        });

        const id = await getID('999999999');
        expect(id).toBeNull();
    });
});
```

---

### Integration Testing

**Test User Flow:**

1. **New User Registration:**
   ```bash
   curl -X POST http://localhost:3000/web \
     -H "Content-Type: application/json" \
     -d '{
       "waId": "919999999999",
       "text": "Hello",
       "senderName": "Test User"
     }'

   # Expected: User created in Airtable, welcome message sent
   ```

2. **Start Day:**
   ```bash
   curl -X POST http://localhost:3000/web \
     -H "Content-Type: application/json" \
     -d '{
       "waId": "919999999999",
       "text": "Start Day"
     }'

   # Expected: Day 1, Module 1 content sent
   ```

3. **Advance Module:**
   ```bash
   curl -X POST http://localhost:3000/web \
     -H "Content-Type: application/json" \
     -d '{
       "waId": "919999999999",
       "text": "Next."
     }'

   # Expected: Next module content sent
   ```

4. **Answer Question:**
   ```bash
   curl -X POST http://localhost:3000/web \
     -H "Content-Type: application/json" \
     -d '{
       "waId": "919999999999",
       "text": "My answer here"
     }'

   # Expected: Response stored, progression continues
   ```

---

### Manual Testing Checklist

**Pre-Deployment:**

- [ ] New user registration (first message)
- [ ] Welcome message received
- [ ] "Start Day" manual trigger
- [ ] Module 1 content delivery
- [ ] Text-only module
- [ ] Module with media (image/PDF)
- [ ] List/quiz module with correct answer
- [ ] List/quiz module with wrong answer (retry)
- [ ] Open-ended question response
- [ ] "Next." button progression
- [ ] Day completion message
- [ ] Multi-day progression (Day 1 → Day 2)
- [ ] Course completion (Day 4 end)
- [ ] `/ping` health check
- [ ] `/status` database check
- [ ] `/trigger-daily` manual cron

**Edge Cases:**

- [ ] User sends message during processing (duplicate handling)
- [ ] Invalid phone number
- [ ] Missing Airtable fields
- [ ] WATI API down (error handling)
- [ ] Empty module content
- [ ] Media file load failure
- [ ] User sends random text (not a keyword)

---

### Monitoring & Logs

**Production Monitoring:**

1. **Azure Application Insights:**
   - Enable in Azure Portal
   - Track: Response times, error rates, dependency calls

2. **Custom Logging:**
   ```javascript
   // Add structured logging
   const logger = {
       info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, meta, timestamp: new Date() })),
       error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, meta, timestamp: new Date() }))
   };

   logger.info('User registered', { phone: senderID, name: userName });
   ```

3. **Key Metrics to Track:**
   - Daily active users (unique phones in `/web` endpoint)
   - Message delivery success rate
   - Average module completion time
   - Error rate by endpoint
   - Airtable API response times

---

## Conclusion

This guide provides a comprehensive overview of the TBS WhatsApp Learning System for AI assistants. When working with this codebase:

1. **Always check user state** before making changes
2. **Follow existing patterns** for consistency
3. **Test thoroughly** before deploying
4. **Update this document** when making architectural changes

**For Questions:**
- Review code comments in source files
- Check Airtable schema documentation
- Refer to WATI API docs: https://docs.wati.io
- Consult Airtable API docs: https://airtable.com/developers/web/api

**Version History:**
- v2.0.0 (2026-01-12): Initial comprehensive documentation
- Future updates: Track changes in git commit messages

---

**Last Updated:** 2026-01-12 by Claude AI Assistant
