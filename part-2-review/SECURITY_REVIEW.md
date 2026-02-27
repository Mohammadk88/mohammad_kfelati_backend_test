# Security Code Review — Medical Records API

## Vulnerabilities

### 1.Plaintext Password Storage

**Location:** `src/routes/auth.routes.ts`, line 32

**Description:** User passwords are stored directly in the database as plaintext strings. The `password` field from the request body is passed straight to `prisma.user.create()` without any hashing.

**Impact:** If the database is compromised through SQL injection, backup leaks, insider threats, or any other vector, every user's password is immediately exposed in readable form. Since users commonly reuse passwords across services, this could cascade into compromises on other platforms (email, banking, etc.).

**Fix:** Hash passwords using `bcrypt` with a cost factor of at least 10 before storing them. During login, use `bcrypt.compare()` to verify the password and the stored hash.

---

### 2.Plaintext Password Comparison

**Location:** `src/routes/auth.routes.ts`, line 66

**Description:** Login authentication compares the submitted password directly to the stored password using `user.password !== password`. This confirms that passwords are stored and compared in plaintext.

**Impact:** Same as vulnerability #1 plaintext passwords in the database. Additionally, the direct string comparison is susceptible to timing attacks, which could allow an attacker to determine password characters one by one.

**Fix:** Use `bcrypt.compare(password, user.password)` instead of direct string comparison. This securely compares the input against the hashed value in constant time.

---

### 3.SQL Injection

**Location:** `src/routes/records.routes.ts`, lines 56–58

**Description:** The search endpoint uses `prisma.$queryRawUnsafe()` with direct string interpolation of user input (`name` query parameter) into the SQL query. Like:
```sql
SELECT * FROM "Record" WHERE "patientName" ILIKE '%${name}%'
```
This is a standard SQL injection vulnerability.

**Impact:** An attacker can inject arbitrary SQL to:
- Extract all data from the database (patient records, user credentials)
- Modify or delete records
Example payload: `?name=' OR 1=1; DROP TABLE "Record"; ...`

**Fix:** Use Prisma's parameterized query method `$queryRaw` with template literals (tagged templates), should use Prisma's builtin query API with `contains` and `mode: 'insensitive'` for case insensitive search.

---

### 4.Hardcoded JWT Secret

**Location:** `src/middleware/auth.middleware.ts`, line 5 and `src/routes/auth.routes.ts`, line 9

**Description:** The JWT signing secret is hardcoded as `"clinic-portal-secret-2024"` in two separate files. This secret is embedded directly in the source code.

**Impact:** Anyone with access to the source code on Github can get a valid JWT tokens for any user, including admin accounts. This gives an attacker full, unrestricted access to the API.

**Fix:** Load the JWT secret from an environment variable (`process.env.JWT_SECRET`). Use a cryptographically random string of at least 128 bits. Validate that the variable is set at startup and fail fast if it's missing. Store the secret in `.env` with gitignored.

---

### 5.JWT Tokens Never Expire

**Location:** `src/routes/auth.routes.ts`, lines 72–75

**Description:** The `jwt.sign()` call does not include an `expiresIn` option. This creates tokens with no expiration time they are valid forever once issued.

**Impact:** If a token is stolen (By XSS, network interception, log exposure, or device theft), it can be used indefinitely. There is no way to invalidate a compromised token. This is especially dangerous for admin accounts, as it grants permanent access to the entire system.

**Fix:** Add an `expiresIn` option to `jwt.sign()`, e.g., `{ expiresIn: '7d' }` for reasonable session length. Consider implementing refresh tokens for longer lived sessions.

---

### 6.User limitation Role Assignment

**Location:** `src/routes/auth.routes.ts`, line 17 and line 32

**Description:** The registration endpoint accepts a `role` field directly from the request body and assigns it to the new user: `role: role || "STAFF"`. Any user can register themselves as an `ADMIN` or any other privileged role.

**Impact:** An attacker can create an account with admin privileges by simply including `"role": "ADMIN"` in the registration payload. This bypasses any intended access control hierarchy and grants full system access.

**Fix:** Remove the `role` field from user limitation input. Always assign a default role (`STAFF`) during registration. Role elevation should only be allowed through an admin only endpoint with proper authorization checks.

---

### 7.Path Traversal in File Download

**Location:** `src/routes/files.routes.ts`, line 15

**Description:** The file download endpoint constructs a file path by directly concatenating the user provide `filename` parameter with the uploads directory:
```typescript
const filePath = path.join(__dirname, "..", "uploads", req.params.filename);
```
No sanitization or validation is performed on the filename.

**Impact:** An attacker can use path like (`../../etc/passwd`) to read randomly files from the server's filesystem. This could view:

- Application source code and configuration
- Environment variables and secrets
- System files (`/etc/shadow`)

**Fix:** Clean the filename by stripping directory separators and path traversal sequences. Resolve the final path and verify it is still within the uploads directory using `path.resolve()` and checking that the resolved path starts with the expected uploads directory path.

---

### 8.Sensitive Data Exposure in User Profile

**Location:** `src/index.ts`, lines 27–41

**Description:** The `/users/me` endpoint fetches the complete user object from the database and returns it directly in the response. This includes the `password` field (stored in plaintext, making this even worse).

**Impact:** Every authenticated user can see their own password in the API response. If responses are logged, cached, or intercepted, passwords are exposed. Even with hashed passwords, returning the hash allows offline brute force attacks.

**Fix:** Select only the fields to return, excluding `password`:
```typescript
select: { id: true, email: true, name: true, role: true, createdAt: true }
```

---

### 9.No Authorization / Access Control on Medical Records

**Location:** `src/routes/records.routes.ts`, all endpoints

**Description:** All record endpoints only check for authentication (valid JWT), but perform no authorization checks. Any authenticated user.

**Impact:** A low privileged `STAFF` user has the same access as an `ADMIN`. There is no role access control.

**Fix:** Implement role access control. Check `req.user.role` before allowing operations. Create an authorization middleware that accepts allowed roles.

---

### 10.Error Stack Trace Leakage

**Location:**  `src/index.ts` lines 44–47,
               `src/routes/auth.routes.ts` lines 44–47 and 86–89,
               `src/routes/records.routes.ts` lines 32–35, 64–67, 96–99, 122–125,
               `src/routes/files.routes.ts` lines 26–29

**Description:** Every error handler returns `error.message` and `error.stack` in the JSON response:
```typescript
return res.status(500).json({
  error: "Internal server error",
  details: error.message,
  stack: error.stack,
});
```

**Impact:** Stack traces reveal internal file paths, library versions, database schema details, and application architecture to attackers. In production, this is an information disclosure vulnerability.

**Fix:** Log the full error server side for debugging, but return only a generic error message to the client. Use `NODE_ENV` to conditionally include details only in development.

---

### 11.No Input Validation

**Location:** `src/routes/auth.routes.ts` (register/login) and `src/routes/records.routes.ts` (create record)

**Description:** No input validation is performed on any request body. The register endpoint doesn't validate email format, password strength, or name length. The records endpoint doesn't validate that `patientName` is present or properly formatted.

**Impact:** Allows:
- User registration with invalid/empty emails
- Extremely weak passwords (empty strings, single characters)
- Creation of incomplete records
- Potential database errors from unexpected data types
- Facilitates other attacks (injection, XSS via stored data)

**Fix:** Add input validation using a schema validation library like `zod`. Validate email format, enforce minimum password length/complexity, require mandatory fields, and sanitize string inputs.

---

### 12.No Rate Limiting

**Location:** `src/index.ts` application wide, particularly auth endpoints

**Description:** The API has no rate limiting on any endpoints, including authentication endpoints (`/auth/login`, `/auth/register`).

**Impact:** Enables:
- Brute-force password attacks against the login endpoint
- Credential stuffing attacks
- Account enumeration
- Spam user registrations

**Fix:** Add rate limiting middleware using `express rate limit`. Apply stricter limits to authentication endpoints (5 attempts per 15 minutes) and more lenient limits to general API endpoints.

---

### 13.Missing Security Headers

**Location:** `src/index.ts`

**Description:** The Express application does not set any security headers. There is no `helmet` middleware or manual header configuration for protections like `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.

**Impact:** The application is more vulnerable to:
- Sniffing attacks
- Clickjacking
- XSS (missing CSP)
- Protocol downgrade attacks (missing HSTS)

**Fix:** Add the `helmet` middleware which sets a comprehensive set of security headers with sensible defaults.

---

### 14.No CORS Configuration

**Location:** `src/index.ts`

**Description:** The API has no CORS configuration. Without explicit CORS headers, browser behavior depends on defaults, and there's no restriction on which origins can make requests.

**Impact:** If the API is consumed by a frontend, any malicious website could make authenticated requests to the API on behalf of a logged in user (in conjunction with CSRF attacks). Without proper CORS, the API is open to cross origin abuse.

**Fix:** Add the `cors` middleware with a whitelist of allowed origins. Configure it to only allow trusted frontend domains.

---

### 15.Multiple PrismaClient Instances

**Location:**  `src/index.ts` line 9,
               `src/routes/auth.routes.ts` line 6,
               `src/routes/records.routes.ts` line 6

**Description:** Each file creates its own `new PrismaClient()` instance. This creates multiple database connection pools.

**Impact:** While not a direct security vulnerability, multiple connection pools can be effect on database connections, cause resource leaks, and make connection management unpredictable.

**Fix:** Create a single shared PrismaClient instance in a dedicated module (`utils/prisma.ts`) and import it wherever needed.
