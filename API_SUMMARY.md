# Finance Tracker V2 - Complete API Reference

Base URL: `http://localhost:5000`

## Authentication Required
All endpoints except `/health` and `POST /api/auth` require JWT authentication.

**Authentication Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Summary of All Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/auth` | Login/Signup with Firebase | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |
| POST | `/api/expenses` | Create expense transactions | Yes |
| GET | `/api/expenses` | Get expenses (filtered) | Yes |
| POST | `/api/expense-categories` | Create expense category | Yes |
| GET | `/api/expense-categories` | Get categories (search) | Yes |
| POST | `/api/expense-types` | Create expense type | Yes |
| GET | `/api/expense-types` | Get types (search) | Yes |
| POST | `/api/savings` | Create saving transaction | Yes |
| GET | `/api/savings` | Get savings (filtered) | Yes |
| POST | `/api/earnings` | Create earning transaction | Yes |
| GET | `/api/earnings` | Get earnings (filtered) | Yes |

---

## 🔐 Authentication Endpoints

### POST /api/auth
Authenticate user with Firebase token, create user if new.

**Request:**
```json
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "loginMedium": "google",
      "createdAt": "2024-10-19T02:21:00.000Z"
    }
  }
}
```

### GET /api/auth/me
Get current authenticated user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "loginMedium": "google"
    }
  }
}
```

---

## 💰 Expense Endpoints

### POST /api/expenses
Create multiple expense transactions at once.

**Request:**
```json
{
  "expenses": [
    {
      "expenseTypeId": "507f1f77bcf86cd799439011",
      "amount": 50.99,
      "expenseCategory": "507f1f77bcf86cd799439012",
      "description": "Grocery shopping",
      "expense_date": "2024-10-19",
      "need_or_want": "need",
      "could_have_saved": 10
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "1 expense(s) created successfully",
  "data": {
    "expenses": [...]
  }
}
```

### GET /api/expenses
Get expenses with pagination, filters, and sorting.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `startDate` - Filter by start date (YYYY-MM-DD)
- `endDate` - Filter by end date (YYYY-MM-DD)
- `categories` - Filter by category IDs (comma-separated)
- `expenseType` - Filter by expense type ID
- `need_or_want` - Filter by need or want
- `sort` (default: -expense_date) - Sort field

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    },
    "stats": {
      "totalAmount": 1500.50,
      "totalCouldHaveSaved": 200.00
    }
  }
}
```

---

## 🏷️ Category Endpoints

### POST /api/expense-categories
Create a new expense category.

**Request:**
```json
{
  "expenseCategoryName": "Food & Dining",
  "expenseCategoryIcon": "🍔"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439012",
      "expenseCategoryName": "Food & Dining",
      "expenseCategoryIcon": "🍔"
    }
  }
}
```

### GET /api/expense-categories
Get all expense categories with optional search.

**Query Parameters:**
- `search` - Search by category name

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [...],
    "total": 10
  }
}
```

---

## 📝 Type Endpoints

### POST /api/expense-types
Create a new expense type.

**Request:**
```json
{
  "expenseTypeName": "One-time"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Type created successfully",
  "data": {
    "type": {
      "_id": "507f1f77bcf86cd799439013",
      "expenseTypeName": "One-time"
    }
  }
}
```

### GET /api/expense-types
Get all expense types with optional search.

**Query Parameters:**
- `search` - Search by type name

**Response:**
```json
{
  "success": true,
  "data": {
    "types": [...],
    "total": 5
  }
}
```

---

## 💵 Saving Endpoints

### POST /api/savings
Create a new saving transaction.

**Request:**
```json
{
  "amount": 1000,
  "type": "add",
  "title": "Monthly Savings",
  "category": "fixed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Saving transaction created successfully",
  "data": {
    "saving": {
      "_id": "507f1f77bcf86cd799439014",
      "amount": 1000,
      "type": "add",
      "title": "Monthly Savings",
      "category": "fixed"
    }
  }
}
```

### GET /api/savings
Get savings with pagination, filters, and sorting.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `type` - Filter by type (add/withdraw)
- `category` - Filter by category (fixed/topup)
- `sort` (default: -createdOn) - Sort field

**Response:**
```json
{
  "success": true,
  "data": {
    "savings": [...],
    "pagination": {...},
    "stats": {
      "totalAdded": 5000,
      "totalWithdrawn": 500,
      "netSavings": 4500
    }
  }
}
```

---

## 💼 Earning Endpoints

### POST /api/earnings
Create a new earning transaction.

**Request:**
```json
{
  "amount": 5000,
  "type": "salary",
  "title": "October Salary"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Earning transaction created successfully",
  "data": {
    "earning": {
      "_id": "507f1f77bcf86cd799439015",
      "amount": 5000,
      "type": "salary",
      "title": "October Salary"
    }
  }
}
```

### GET /api/earnings
Get earnings with pagination, filters, and sorting.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `type` - Filter by type (salary/freelance/others)
- `sort` (default: -createdOn) - Sort field

**Response:**
```json
{
  "success": true,
  "data": {
    "earnings": [...],
    "pagination": {...},
    "stats": {
      "totalEarnings": 8000,
      "bySalary": 5000,
      "byFreelance": 2000,
      "byOthers": 1000
    }
  }
}
```

---

## ⚠️ Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message here",
  "error": {} // Only in development mode
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error, missing fields)
- `401` - Unauthorized (invalid/expired token)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔄 Data Types & Enums

### need_or_want
- `need`
- `want`

### Saving type
- `add`
- `withdraw`

### Saving category
- `fixed`
- `topup`

### Earning type
- `salary`
- `freelance`
- `others`

### Login Medium
- `google`
- `facebook`
- `email`

---

## 📊 Pagination Format

All paginated endpoints return:

```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

---

## 🔍 Search & Filter Examples

### Filter expenses by date range and category
```
GET /api/expenses?startDate=2024-10-01&endDate=2024-10-31&categories=507f1f77bcf86cd799439012
```

### Search categories
```
GET /api/expense-categories?search=food
```

### Filter savings by type
```
GET /api/savings?type=add&page=1&limit=20
```

### Sort expenses by amount (ascending)
```
GET /api/expenses?sort=amount
```

### Sort expenses by date (descending - default)
```
GET /api/expenses?sort=-expense_date
```
