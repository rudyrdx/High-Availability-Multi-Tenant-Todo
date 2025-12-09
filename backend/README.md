# Multi-Tenant Todo API

A secure, multi-tenant todo application backend built with Node.js, Express, and Neo4j graph database.

## 🚀 Recent Improvements

### ✅ Password Security (bcrypt)
- Implemented bcrypt password hashing for all user accounts
- Default password for seeded users: `password123`
- Minimum password length: 8 characters
- All passwords are hashed with 10 salt rounds

### ✅ CORS Configuration
- Configured CORS for frontend integration
- Default allowed origins:
  - `http://localhost:3000` (React/Next.js)
  - `http://localhost:5173` (Vite)
  - `http://localhost:4200` (Angular)
- Supports credentials and custom headers
- Configurable via `CORS_ORIGIN` environment variable

### ✅ API Documentation (Swagger/OpenAPI)
- Complete API documentation available at `/api-docs`
- Interactive Swagger UI for testing endpoints
- Comprehensive schemas for all request/response types
- JWT authentication support in Swagger UI

### ✅ Category Management
- Full CRUD operations for categories
- Categories support name, color (hex), and optional icon
- Automatic category_id cleanup when category is deleted
- Categories are tenant-isolated and user-specific
- Integration with todos via category_id field
- 16 comprehensive tests covering all operations

## 📚 API Documentation

Once the server is running, visit:
```
http://localhost:3000/api-docs
```

## 🔧 Installation

```bash
npm install
```

## 🌱 Database Setup

1. **Reset database** (complete reset - drops constraints, deletes all data, recreates everything):
```bash
npm run reset
```

2. **Clean database** (removes all data only):
```bash
npm run cleanup
```

3. **Seed database** (creates test data):
```bash
npm run seed
```

4. **Reset and test** (cleanup + seed + test):
```bash
npm run test:reset
```

## 🏃 Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

Server will be available at: `http://localhost:3000`

## 🧪 Testing

**Test Coverage**: 52 tests across 4 test suites
- ✅ Tenant API: 13 tests (12 passing, 1 skipped)
- ✅ User API: 16 tests (all passing)
- ✅ Todo API: 7 tests (all passing)
- ✅ Category API: 16 tests (all passing)

Run all tests:
```bash
npm test
```

Run tests sequentially (recommended for consistency):
```bash
npm test -- --runInBand
```

Watch mode:
```bash
npm run test:watch
```

Run specific test suite:
```bash
npm test -- src/routes/categories/index.test.js
```

## 🔐 Authentication

### Test Accounts

After seeding, you can login with these accounts:

| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| john@acme.com | password123 | acme | admin |
| admin@othercorp.com | password123 | othercorp | admin |
| admin@logintest.com | password123 | logintest | admin |

### Login Flow

1. **Lookup Tenant**:
```bash
POST /api/tenant/lookup
{
  "tenantName": "acme"
}
```

2. **Login**:
```bash
POST /api/user/login
{
  "tenantId": "<tenant-id-from-lookup>",
  "email": "john@acme.com",
  "password": "password123"
}
```

3. **Use JWT Token**:
Add to headers for authenticated requests:
```
Authorization: Bearer <your-jwt-token>
```

## 📋 API Endpoints

### Tenant Management
- `POST /api/tenant/lookup` - Find tenant by name/slug
- `POST /api/tenant/create` - Create new tenant (requires invite key)

### User Management
- `POST /api/user/login` - User authentication
- `POST /api/user/create` - Create user (admin only)

### Todo Management
- `POST /api/todos` - Create todo
- `GET /api/todos` - List user's todos
- `GET /api/todos/:id` - Get single todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo (admin only)

### Category Management
- `POST /api/categories` - Create category
- `GET /api/categories` - List user's categories
- `GET /api/categories/:id` - Get single category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### System
- `GET /health` - Health check endpoint
- `GET /api-docs` - Interactive API documentation (Swagger UI)

## 🔑 Invite Keys

Available invite keys for creating new tenants:
- `chronos-beta`
- `test-key-1`
- `test-key-2`
- `test-key-3`

## 🌐 Environment Variables

Create a `.env` file with:

```env
# Neo4j Configuration
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# JWT Secret
JWT_SECRET=your-secret-key-here

# Server Port (optional)
PORT=3000

# CORS Origins (optional, comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## 🏗️ Architecture

### Multi-Tenancy
- Complete data isolation between tenants
- Tenant context extracted from JWT tokens
- Membership verification on all operations

### Security Features
- ✅ Bcrypt password hashing
- ✅ JWT-based authentication
- ✅ Role-based access control (admin/member)
- ✅ Input validation with Zod
- ✅ CORS protection
- ✅ Tenant isolation enforcement

### Database Schema (Neo4j)

**Nodes:**
- `Tenant` - Organizations
- `User` - Users with hashed passwords
- `Todo` - Tasks
- `InviteKey` - Registration keys

**Relationships:**
- `(Tenant)-[:HAS_USER]->(User)`
- `(Todo)-[:BELONGS_TO]->(Tenant)`
- `(Todo)-[:CREATED_BY]->(User)`
- `(InviteKey)-[:INVITED]->(User)`

## 📝 Example Usage

### Create a New Tenant

```bash
curl -X POST http://localhost:3000/api/tenant/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "slug": "mycompany",
    "email": "admin@mycompany.com",
    "fullName": "Admin User",
    "password": "SecurePass123!",
    "inviteKey": "chronos-beta"
  }'
```

### Create a Todo

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Complete documentation",
    "description": "Write API docs",
    "is_completed": false,
    "priority": "high",
    "due_date": "2024-12-31T23:59:59Z"
  }'
```

### Create a Category

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Work",
    "color": "#3B82F6",
    "icon": "briefcase"
  }'
```

### Create a Todo with Category

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Prepare presentation",
    "description": "Q4 review slides",
    "is_completed": false,
    "priority": "high",
    "category_id": "YOUR_CATEGORY_ID"
  }'
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5.2.1
- **Database**: Neo4j (Graph Database)
- **Authentication**: JWT
- **Password Hashing**: bcrypt
- **Validation**: Zod
- **API Docs**: Swagger/OpenAPI
- **CORS**: cors middleware
- **Testing**: Jest + Supertest

## 📊 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── neo4j.js          # Database connection
│   │   └── swagger.js        # API documentation config
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── tenant.js         # Multi-tenancy
│   │   └── validate.js       # Request validation
│   ├── routes/
│   │   ├── tenant/           # Tenant endpoints
│   │   ├── user/             # User endpoints
│   │   └── todos/            # Todo endpoints
│   ├── service/
│   │   ├── neo4j.service.js  # Database utilities
│   │   └── password.service.js # Password hashing
│   ├── scripts/
│   │   ├── seed.js           # Database seeding
│   │   └── cleanup.js        # Database cleanup
│   ├── tests/                # Test configuration
│   ├── app.js                # Express app
│   └── server.js             # Server entry
├── .env                      # Environment variables
├── package.json
└── README.md
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong JWT secrets** - Generate with `openssl rand -base64 32`
3. **Enforce password policies** - Minimum 8 characters
4. **Regular security updates** - Keep dependencies updated
5. **Rate limiting** - Consider adding for production
6. **HTTPS only** - Use SSL/TLS in production

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please follow the existing code style and add tests for new features.
