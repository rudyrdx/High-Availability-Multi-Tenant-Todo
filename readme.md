## Test Workflow
npm test
  ↓
Jest reads jest.config.js
  ↓
globalSetup.js runs ONCE
  - Connects to Neo4j
  - MATCH (n) DETACH DELETE n
  - Calls seed()
  - Creates: constraints, 4 invite keys, 'acme' tenant, 'john@acme.com' user
  ↓
Tests run (using shared seeded data)
  - ✓ Tenant tests (Lookup, Create)
  - ✓ User tests (Create, Login)
  - ✓ Todo tests (Create, List, Update, Delete)
  ↓
globalTeardown.js runs ONCE
  - Closes Neo4j driver
  - Exit


## API Endpoints

### Tenant APIs

#### POST /api/tenant/lookup
**Params (JSON):**
  - tenantName: string (tenant name or slug)
**Response:**
  - success: boolean
  - tenantId: string (if found)
  - redirectTo: string (login URL)
  - message: string (if not found)

#### POST /api/tenant/create
**Params (JSON):**
  - name: string
  - slug: string (unique, lowercase, hyphens)
  - email: string (admin user email)
  - fullName: string (admin user full name)
  - inviteKey: string (must be valid and unused)
**Response:**
  - success: boolean
  - tenant: { id, name, slug }
  - user: { id, email, role }
  - message: string (on error)

### User APIs

#### POST /api/user/create
**Headers:**
  - Authorization: Bearer <admin JWT token>
**Params (JSON):**
  - email: string
  - fullName: string
  - role: string ('admin' or 'member')
**Response:**
  - success: boolean
  - user: { id, tenant_id, username, email, full_name, role, created_at }
  - message: string (on error)

#### POST /api/user/login
**Params (JSON):**
  - tenantId: string
  - email: string
  - password: string
**Response:**
  - success: boolean
  - token: string (JWT)
  - user: { id, tenant_id, username, email, full_name, role, created_at }
  - message: string (on error)

### Todo APIs

#### POST /api/todos
**Headers:**
  - Authorization: Bearer <JWT token>
**Params (JSON):**
  - title: string
  - description?: string
  - is_completed: boolean
  - due_date?: string (ISO date)
  - priority: 'low' | 'medium' | 'high'
  - category_id?: string
**Response:**
  - success: boolean
  - todo: { id, title, description, is_completed, priority, ... }

#### GET /api/todos
**Headers:**
  - Authorization: Bearer <JWT token>
**Response:**
  - success: boolean
  - todos: Array<Todo>

#### GET /api/todos/:id
**Headers:**
  - Authorization: Bearer <JWT token>
**Response:**
  - success: boolean
  - todo: { id, title, ... }

#### PUT /api/todos/:id
**Headers:**
  - Authorization: Bearer <JWT token>
**Params (JSON):**
  - title?: string
  - description?: string
  - is_completed?: boolean
  - priority?: string
  - category_id?: string
**Response:**
  - success: boolean
  - todo: { id, title, ... }

#### DELETE /api/todos/:id
**Headers:**
  - Authorization: Bearer <admin JWT token>
**Response:**
  - success: boolean
  - message: string