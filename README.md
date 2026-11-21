# SchemeSathi – Smart Government Welfare Scheme Finder

**SchemeSathi** is a modern, responsive, user-friendly full-stack web application designed to help Indian citizens discover Central Government and State Government (including extensive Andhra Pradesh) welfare schemes they may qualify for.

The platform provides intelligent, rule-based eligibility evaluation, interactive document checklists, comprehensive scheme information (benefits, step-by-step application instructions, and official links), full bilingual support in **English** and **Telugu (తెలుగు)**, and a protected **Administrator Portal** backed by an SQLite database.

---

## 🌟 Key Features

1. **Intelligent Rule-Based Scheme Matching**:
   - Collects citizen demographic, educational, economic, and social profile data.
   - Evaluates mandatory and optional criteria strictly against verified guidelines from official government sources (no guesswork or mere keyword matching).
   - Results are automatically categorized into three distinct confidence tiers:
     - **Category A – Appears Eligible**: All verified mandatory conditions match the citizen profile.
     - **Category B – Possibly Eligible / Needs Verification**: Some criteria are unverified, optional, or profile fields are missing that need verification on the official portal.
     - **Category C – Not Eligible**: One or more verified mandatory conditions are not satisfied (with clear, transparent explanations).

2. **Zero Sensitive Data & Privacy by Design**:
   - **No Aadhaar numbers, bank account numbers, OTPs, or passwords are ever requested.**
   - All evaluations are executed securely in-session and via clean backend REST endpoints.

3. **Bilingual Interface (English & Telugu - తెలుగు)**:
   - Built specifically for accessibility across rural and urban citizens.
   - Instant language toggle in the header for all navigation items, form fields, scheme details, eligibility badges, and FAQs.

4. **12-Point Detailed Scheme Information**:
   Every scheme includes a comprehensive view covering:
   1. About the scheme
   2. Purpose of the scheme
   3. Who can apply?
   4. Age requirements
   5. Income requirements
   6. State and residence requirements
   7. Educational or occupational requirements
   8. Required documents
   9. Benefits provided
   10. Step-by-step application procedure (Step 1 to 5)
   11. Official application portal link
   12. Contact information / official helpline

5. **Interactive Document Checklist**:
   - Live checklist with checkboxes for each required document.
   - Visual progress bar showing completion percentage and remaining documents needed.
   - LocalStorage persistence and one-click print feature.

6. **Search & Filter Directory**:
   - Instant search across scheme names, departments, and keywords.
   - Filter by State (Central Pan-India, Andhra Pradesh, All States).
   - Filter by Category (Agriculture, Health, Education, Pension, Business/MSME, Housing & Energy, Women & Child, Financial Assistance).

7. **Administrator Dashboard with SQLite Database**:
   - Protected with administrator authentication (email & SHA-256 hashed password).
   - Complete CRUD operations: Add new schemes, edit details, delete outdated records, update criteria, and toggle active/inactive status.
   - Metric cards showing total schemes, active count, and category distributions.

8. **Official Government Sources**:
   - Information verified and linked with official portals:
     - [myScheme Portal](https://www.myscheme.gov.in/)
     - [National Portal of India](https://www.india.gov.in/)
     - [Government of Andhra Pradesh](https://www.ap.gov.in/)
     - [PM-KISAN Portal](https://pmkisan.gov.in/)
     - [Ayushman Bharat PM-JAY](https://pmjay.gov.in/)
     - [PM Vishwakarma](https://pmvishwakarma.gov.in/)
     - [National Scholarship Portal](https://scholarships.gov.in/)
     - [AP Navasakam / Welfare Schemes](https://navasakam.ap.gov.in/)
     - [Dr. YSR Aarogyasri Trust](https://aarogyasri.ap.gov.in/)
     - [AP SERP Pension Portal](https://sspensions.ap.gov.in/)

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Lucide Icons, CSS3 (Modern Responsive Design).
- **Backend**: Node.js REST API server with built-in `node:http` and `node:crypto`.
- **Database**: SQLite (via Node 24 native `node:sqlite` - `DatabaseSync`), easily portable to PostgreSQL or MySQL.
- **Testing**: Vitest (Unit and integration tests for eligibility rules, API, and bilingual translations).

---

## 📂 Project Structure

```
├── package.json               # NPM scripts and project dependencies
├── vite.config.ts             # Vite configuration with API reverse proxy
├── tsconfig.json              # TypeScript root configuration
├── index.html                 # HTML5 entry page
│
├── server/                    # Backend API & Database
│   ├── db/
│   │   ├── schema.sql         # SQLite DDL schema (schemes, criteria, docs, steps, admins)
│   │   ├── database.mjs       # SQLite connection manager (node:sqlite DatabaseSync)
│   │   ├── seed.mjs           # Database seeder with Central & AP verified schemes
│   │   └── schemesathi.db     # SQLite physical database file
│   └── server.mjs             # REST API server (CORS, JSON routing, Auth, Evaluation, CRUD)
│
├── src/                       # Frontend React Application
│   ├── assets/                # Static brand graphics and icons
│   ├── components/            # Modular React components
│   │   ├── Navbar.tsx         # Header, brand, language switcher, saved pill, admin button
│   │   ├── EligibilityForm.tsx# Multi-tab citizen profile input form
│   │   ├── EligibilityDashboard.tsx # Results dashboard (Category A, B, C)
│   │   ├── SchemeDetailModal.tsx   # 12-point scheme detail dialog
│   │   ├── DocumentChecklistModal.tsx # Interactive document checklist
│   │   ├── ExploreSchemes.tsx # Search, category tabs, and state filter catalog
│   │   ├── HowItWorks.tsx     # 4-step workflow guide
│   │   ├── WhyChooseSection.tsx # Key citizen benefits & trust markers
│   │   ├── FAQSection.tsx     # Interactive FAQ accordion
│   │   ├── AdminPortal.tsx    # Administrator authentication & scheme management
│   │   └── AuthDialog.tsx     # Citizen optional account dialog
│   │
│   ├── data/
│   │   ├── schemes.ts         # Verified scheme dataset & criteria models
│   │   ├── translations.ts    # Comprehensive English & Telugu (తెలుగు) dictionaries
│   │   └── careerGuides.ts    # Educational domain pathways
│   │
│   ├── lib/
│   │   ├── api.ts             # Client API client with transparent offline fallback
│   │   ├── eligibility.ts     # Core rule-based evaluation engine
│   │   ├── domainMatching.ts  # Domain mapping utilities
│   │   └── firebase.ts        # Optional Firebase authentication client
│   │
│   ├── App.tsx                # Main application orchestrator
│   ├── App.css                # Polished government-grade responsive styles
│   ├── index.css              # Typography and base CSS reset
│   └── main.tsx               # React DOM entry point
│
└── tests/
    ├── src/lib/schemesathi.test.ts  # End-to-end matching, admin auth & Telugu tests
    ├── src/lib/eligibility.test.ts  # Criterion operator & verification tests
    ├── src/lib/domainMatching.test.ts # Domain matching tests
    └── src/data/careerGuides.test.ts # Career guides tests
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20 or higher (v24 recommended).
- **npm**: Comes bundled with Node.js.

### 2. Install Dependencies
Run in your project root:
```powershell
npm install
```

### 3. Initialize & Seed the SQLite Database
The SQLite database automatically initializes when the server starts, or you can seed it explicitly:
```powershell
node server/db/seed.mjs
```

### 4. Run the Project
You can run the backend server and frontend Vite development server:

**Terminal 1 (Backend API Server on port 5000):**
```powershell
npm run server
```

**Terminal 2 (Frontend React + Vite on port 5173):**
```powershell
npm run dev
```

Open your browser at: **`http://localhost:5173`**

*(Note: SchemeSathi also has a built-in offline engine fallback; if the backend server is not running, the frontend automatically evaluates rules client-side without crashing!)*

### 5. Run Tests
To verify all eligibility engine logic and translation suites:
```powershell
npm test
```

### 6. Production Build
To create an optimized production build in `dist/`:
```powershell
npm run build
```

---

## 🔐 Administrator Portal Access

To access the administrator dashboard:
1. Click **"Admin Portal"** in the top navigation bar.
2. Sign in with the default credentials:
   - **Email**: `admin@schemesathi.in`
   - **Password**: `Admin@12345`
3. As an administrator, you can:
   - Add new Central or State welfare schemes.
   - Update eligibility criteria, income thresholds, and age rules.
   - Edit application links, deadlines, and required documents.
   - Toggle schemes active or inactive.
   - Delete outdated schemes.

---

## 📋 Verified Schemes Included

| Scheme ID | Scheme Name | Level | Department / Portal |
| :--- | :--- | :--- | :--- |
| `pm-kisan` | PM-KISAN Samman Nidhi | Central | Ministry of Agriculture & Farmers Welfare |
| `pmjay` | Ayushman Bharat PM-JAY | Central | National Health Authority (NHA) |
| `vishwakarma` | PM Vishwakarma Scheme | Central | Ministry of MSME |
| `apy` | Atal Pension Yojana | Central | PFRDA / Ministry of Finance |
| `surya-ghar` | PM Surya Ghar: Muft Bijli Yojana | Central | Ministry of New & Renewable Energy |
| `scholarships`| Post-Matric Scholarship (SC/ST/OBC) | Central | National Scholarship Portal |
| `pmay-g` | PM Awas Yojana - Gramin | Central | Ministry of Rural Development |
| `ap-rythu-bharosa` | AP Rythu Bharosa | State (AP) | Agriculture Dept, Government of AP |
| `ap-amma-vodi` | Jagananna Amma Vodi / Thalliki Vandanam | State (AP) | School Education Dept, Govt of AP |
| `ap-vidya-deevena`| Jagananna Vidya Deevena (RTF) | State (AP) | Higher Education Dept, Govt of AP |
| `ap-aarogyasri` | Dr. YSR Aarogyasri Health Scheme | State (AP) | Dr. YSR Aarogyasri Health Care Trust |
| `ap-cheyutha` | YSR Cheyutha | State (AP) | Social Welfare Dept, Govt of AP |
| `ap-pension-kanuka` | YSR Pension Kanuka (NTR Bharosa) | State (AP) | SERP, Panchayat Raj & Rural Dev, AP |
| `ap-vahana-mitra` | YSR Vahana Mitra | State (AP) | Transport Dept, Government of AP |
| `ap-nethanna-nestham` | YSR Nethanna Nestham | State (AP) | Handlooms & Textiles Dept, Govt of AP |

---

## ⚖️ Official Disclaimer

SchemeSathi is an independent public service discovery platform built to assist Indian citizens in identifying welfare programs. Preliminary eligibility matches generated by this application do not constitute official government sanction or legal guarantee of benefits. Citizens are always directed to apply through the verified official government portal or local administrative centres (such as Grama/Ward Sachivalayams).
