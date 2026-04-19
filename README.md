# Finance Tracker V2 Backend

Backend API for the personal finance tracker. This repo is the source of truth for auth, domain rules, persistence, and API contracts.

## Purpose

This repo powers a personal finance tracker used to:

- log daily expenses
- classify spending by category and type
- analyze need vs want spending
- estimate avoidable spend through `could_have_saved`
- track savings and earnings transactions
- record personal accomplishments with time spent and tags

If you want to understand business rules first, this is the repo to read before the UI.

## Features In This Repo

- Firebase token verification and backend JWT session auth
- Expense CRUD
- Expense dashboard analytics
- Category and type CRUD
- Savings transaction APIs
- Earnings transaction APIs
- Accomplishment and accomplishment tag APIs

## Read This First

- `AGENTS.md`: agent rules and change expectations
- `docs/backend-architecture.md`: architecture and data flow
- `docs/backend-api-map.md`: route-to-file map

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Firebase Admin SDK** - Authentication
- **JWT** - Custom token generation
- **CORS** - Cross-origin resource sharing

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB (local or Atlas)
- Firebase project with service account

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env` file

## Firebase Setup

### Get Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file (e.g., `serviceAccountKey.json`)

### Convert Service Account to Base64

**On Mac/Linux:**
```bash
cat serviceAccountKey.json | base64
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("serviceAccountKey.json"))
```

**On Windows (CMD):**
```cmd
certutil -encode serviceAccountKey.json base64.txt
```

Copy the base64 output and paste it into your `.env` file as `FIREBASE_SERVICE_ACCOUNT_BASE64`.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/finance-tracker-v2` |
| `JWT_SECRET` | Secret key for JWT | `your_secret_key` |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Base64 encoded Firebase service account | `base64_string` |

## Running the Server

### Development Mode (with nodemon):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`)

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Authentication
- `POST /api/auth` - Authenticate user with Firebase token
  - **Body**: `{ firebaseToken: string, user: { name: string, email: string } }`
  - **Response**: `{ token: string, user: object }`
  - Creates new user if doesn't exist, returns JWT token
- `GET /api/auth/me` - Get current user information
  - **Headers**: `Authorization: Bearer <token>`
  - **Response**: `{ user: object }`
- `POST /api/auth/logout` - Logout user
  - **Headers**: `Authorization: Bearer <token>`
  - **Response**: `{ message: string }`

### Expenses
- `POST /api/expenses` - Create multiple expense transactions
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ expenses: [{ expenseTypeId, amount, expenseCategory, description, expense_date, need_or_want, could_have_saved }] }`
  - **Response**: `{ expenses: array }`
- `GET /api/expenses` - Get expenses with pagination, filters, and sorting
  - **Headers**: `Authorization: Bearer <token>`
  - **Query**: `page, limit, startDate, endDate, categories, expenseType, need_or_want, sort`
  - **Response**: `{ expenses: array, pagination: object, stats: object }`

### Categories
- `POST /api/expense-categories` - Create expense category
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ expenseCategoryName, expenseCategoryIcon }`
  - **Response**: `{ category: object }`
- `GET /api/expense-categories` - Get expense categories with search
  - **Headers**: `Authorization: Bearer <token>`
  - **Query**: `search`
  - **Response**: `{ categories: array, total: number }`

### Types
- `POST /api/expense-types` - Create expense type
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ expenseTypeName }`
  - **Response**: `{ type: object }`
- `GET /api/expense-types` - Get expense types with search
  - **Headers**: `Authorization: Bearer <token>`
  - **Query**: `search`
  - **Response**: `{ types: array, total: number }`

### Savings
- `POST /api/savings` - Create saving transaction
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ amount, type, title, category }`
  - **Response**: `{ saving: object }`
- `GET /api/savings` - Get savings with pagination, filters, and sorting
  - **Headers**: `Authorization: Bearer <token>`
  - **Query**: `page, limit, startDate, endDate, type, category, sort`
  - **Response**: `{ savings: array, pagination: object, stats: object }`

### Earnings
- `POST /api/earnings` - Create earning transaction
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ amount, type, title }`
  - **Response**: `{ earning: object }`
- `GET /api/earnings` - Get earnings with pagination, filters, and sorting
  - **Headers**: `Authorization: Bearer <token>`
  - **Query**: `page, limit, startDate, endDate, type, sort`
  - **Response**: `{ earnings: array, pagination: object, stats: object }`

### Accomplishment Tags
- `POST /api/accomplishment-tags`
- `GET /api/accomplishment-tags`
- `PUT /api/accomplishment-tags/:id`
- `DELETE /api/accomplishment-tags/:id`

### Accomplishments
- `POST /api/accomplishments`
- `POST /api/accomplishments/bulk`
- `GET /api/accomplishments`
- `PUT /api/accomplishments/:id`
- `DELETE /api/accomplishments/:id`

See `docs/backend-api-map.md` for route grouping and file ownership.

## MongoDB Models

### User Model
- `firebaseUserId` - Unique Firebase user identifier
- `name` - User's full name
- `email` - User's email address (unique)
- `loginMedium` - Login method (google, facebook, email)
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

### ExpenseCategory Model
- `expenseCategoryName` - Category name (unique)
- `expenseCategoryIcon` - Icon identifier
- `createdOn` - Creation timestamp
- `userId` - Reference to User

### ExpenseType Model
- `expenseTypeName` - Type name (unique)
- `createdOn` - Creation timestamp
- `userId` - Reference to User

### ExpenseTransaction Model
- `expenseTypeId` - Reference to ExpenseType
- `amount` - Transaction amount
- `expenseCategory` - Reference to ExpenseCategory
- `description` - Transaction description
- `expense_date` - Date of expense
- `need_or_want` - Classification (need/want)
- `could_have_saved` - Potential savings amount
- `userId` - Reference to User

### SavingTransaction Model
- `amount` - Transaction amount
- `type` - Transaction type (add/withdraw)
- `title` - Transaction title
- `createdOn` - Creation timestamp
- `category` - Saving category (fixed/topup)
- `userId` - Reference to User

### EarningTransaction Model
- `amount` - Earning amount
- `type` - Earning type (salary/freelance/others)
- `title` - Earning title
- `createdOn` - Creation timestamp
- `userId` - Reference to User

## Authentication & Middleware

### JWT Utilities (`utils/jwt.js`)
- `generateToken(payload, expiresIn)` - Generate JWT token with custom expiration
- `verifyToken(token)` - Verify and decode JWT token
- `decodeToken(token)` - Decode token without verification (debugging)

### Authentication Middleware (`middleware/auth.js`)
- `authenticate` - Verify JWT token from Authorization header, attach user to request
- `optionalAuthenticate` - Optional authentication that doesn't fail if token missing

### Firebase Middleware (`middleware/firebaseAuth.js`)
- `verifyFirebaseAuth` - Verify Firebase ID token, attach Firebase user to request
- `validateUserInfo` - Validate user information from request body

### Usage Example
```javascript
const { authenticate } = require('./middleware/auth');
const { verifyFirebaseAuth } = require('./middleware/firebaseAuth');

// Protected route with JWT
app.get('/api/expenses', authenticate, getExpenses);

// Firebase authentication (for login)
app.post('/api/auth', verifyFirebaseAuth, authenticateUser);
```

## Project Structure

```
finance-tracker-v2-backend/
├── config/
│   ├── database.js       # MongoDB connection
│   └── firebase.js        # Firebase Admin SDK setup
├── controllers/           # Request handlers
│   ├── authController.js  # Authentication controller
│   ├── expenseController.js  # Expense controller
│   ├── categoryController.js  # Category controller
│   ├── typeController.js  # Type controller
│   ├── savingController.js  # Saving controller
│   ├── earningController.js  # Earning controller
│   └── index.js
├── middleware/            # Custom middleware
│   ├── auth.js            # JWT authentication
│   ├── firebaseAuth.js    # Firebase authentication
│   └── index.js
├── models/                # Mongoose models
│   ├── User.js
│   ├── ExpenseCategory.js
│   ├── ExpenseType.js
│   ├── ExpenseTransaction.js
│   ├── SavingTransaction.js
│   ├── EarningTransaction.js
│   └── index.js
├── routes/                # API routes
│   ├── auth.js            # Authentication routes
│   ├── expenses.js        # Expense routes
│   ├── categories.js      # Category routes
│   ├── types.js           # Type routes
│   ├── savings.js         # Saving routes
│   └── earnings.js        # Earning routes
├── utils/                 # Utility functions
│   ├── jwt.js             # JWT utilities
│   └── index.js
├── server.js              # Express server setup
├── package.json           # Dependencies and scripts
└── .env.example           # Environment variables template
```

## Current Implementation Status

- ✅ Phase 1: Backend - Project Setup and Configuration
- ✅ Phase 2: Backend - Firebase Admin SDK Setup
- ✅ Phase 3: Backend - MongoDB Models
- ✅ Phase 4: Backend - Authentication Middleware
- ✅ Phase 5: Backend - Authentication Endpoints
- ✅ Phase 6: Backend - Transaction Management Endpoints

**🎉 Backend Development Complete!**

## Security Notes

- Never commit `.env` file to version control
- Keep your Firebase service account key secure
- Use strong JWT secrets in production
- Enable MongoDB authentication in production
- Use HTTPS in production

## License

ISC
