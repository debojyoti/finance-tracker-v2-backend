# API Examples

This document provides examples of how to use the Finance Tracker V2 API endpoints.

## Base URL
```
http://localhost:5000
```

## Authentication Endpoints

### 1. Authenticate User (Login/Signup)

**Endpoint:** `POST /api/auth`

**Description:** Authenticates user with Firebase token. Creates a new user if doesn't exist, otherwise logs in existing user. Returns JWT token for subsequent API calls.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "user": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "loginMedium": "google",
      "createdAt": "2024-10-19T02:21:00.000Z",
      "updatedAt": "2024-10-19T02:21:00.000Z"
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Firebase token is required"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Firebase authentication failed"
}
```

---

### 2. Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Returns the currently authenticated user's information.

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "loginMedium": "google",
      "createdAt": "2024-10-19T02:21:00.000Z",
      "updatedAt": "2024-10-19T02:21:00.000Z"
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 3. Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout user (primarily handled client-side by removing token).

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## cURL Examples

### Authenticate User
```bash
curl -X POST http://localhost:5000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "YOUR_FIREBASE_TOKEN_HERE",
    "user": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## JavaScript Fetch Examples

### Authenticate User
```javascript
const authenticateUser = async (firebaseToken, user) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firebaseToken,
        user
      })
    });

    const data = await response.json();

    if (data.success) {
      // Store token in localStorage
      localStorage.setItem('token', data.data.token);
      console.log('Login successful:', data.data.user);
    }

    return data;
  } catch (error) {
    console.error('Authentication error:', error);
  }
};
```

### Get Current User
```javascript
const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get user error:', error);
  }
};
```

### Logout
```javascript
const logout = async () => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:5000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      // Remove token from localStorage
      localStorage.removeItem('token');
      console.log('Logout successful');
    }

    return data;
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

## Testing Flow

1. **Get Firebase Token:**
   - Use Firebase Authentication in your frontend to login with Google
   - Get the Firebase ID token from the authenticated user

2. **Authenticate with Backend:**
   - Send the Firebase token to `POST /api/auth`
   - Receive JWT token in response
   - Store JWT token in localStorage or secure storage

3. **Make Authenticated Requests:**
   - Include JWT token in Authorization header for all protected endpoints
   - Format: `Authorization: Bearer <your_jwt_token>`

4. **Logout:**
   - Call `POST /api/auth/logout` (optional)
   - Remove JWT token from storage
   - Redirect to login page

---

## Common Error Codes

- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or expired token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (server-side error)
