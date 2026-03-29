# ScholarStream — Server

REST API backend for the ScholarStream scholarship management platform.

**Frontend Repository:** [scholarstream-client](https://github.com/rezaulrht/scholarstream-client)

---

## Overview

The server is an **Express.js 5** application backed by **MongoDB via Mongoose**. It handles authentication verification (Firebase Admin SDK), scholarship and application CRUD, Stripe payments, document uploads to Cloudflare R2, email delivery via Nodemailer, and admin analytics aggregations.

---

## Tech Stack

| Technology | Role |
| --- | --- |
| Express.js 5 | HTTP framework |
| MongoDB + Mongoose | Database and ODM |
| Firebase Admin SDK | JWT verification |
| Stripe | Payment processing |
| Cloudflare R2 (AWS S3 SDK) | Document storage with presigned upload URLs |
| Nodemailer | Transactional email |
| express-rate-limit | Rate limiting |
| dotenv | Environment configuration |

---

## File Structure

```text
ScholarStream-server/
├── index.js              # App entry — middleware, route mounting, server start
├── config/
│   ├── db.js             # Mongoose connection
│   ├── stripe.js         # Stripe client
│   ├── mailer.js         # Nodemailer transporter
│   └── r2.js             # Cloudflare R2 / S3 client
├── middleware/
│   └── auth.js           # verifyFirebaseToken, verifyAdmin, verifyModerator
├── models/
│   ├── User.js
│   ├── Scholarship.js
│   ├── Application.js
│   ├── Review.js
│   └── Subscriber.js
├── routes/
│   ├── users.js
│   ├── scholarships.js
│   ├── applications.js
│   ├── reviews.js
│   ├── payment.js
│   ├── analytics.js
│   ├── newsletter.js
│   ├── email.js
│   └── upload.js
├── controllers/          # One controller per route file
└── utils/
    └── emailTemplates.js # HTML email templates
```

---

## Authentication & Authorization

Authentication uses Firebase ID tokens issued by the frontend.

### Middleware chain

```
Request → verifyFirebaseToken → [verifyAdmin | verifyModerator] → controller
```

**`verifyFirebaseToken`** — Reads the `Authorization: Bearer <token>` header, verifies the token with Firebase Admin SDK, and attaches `req.decoded_email` for downstream use.

**`verifyAdmin`** — Looks up the decoded email in the `users` collection and asserts `role === "admin"`.

**`verifyModerator`** — Asserts `role === "moderator"` **or** `role === "admin"` (admins inherit moderator access).

Roles are stored in MongoDB, not inside the Firebase token, so they can be changed at runtime without re-issuing tokens.

---

## API Routes

### Users — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/users` | public | Create user on first login |
| GET | `/user/:email/role` | token | Get a user's role |
| GET | `/users` | token + admin | List all users |
| GET | `/users/:email` | token | Get user profile |
| PATCH | `/users/:email` | token | Update profile |
| PATCH | `/users/:id/role` | token + admin | Change role |
| DELETE | `/users/:id` | token + admin | Delete user |

### Scholarships — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/scholarships` | public | List scholarships (search/filter) |
| GET | `/scholarships/countries` | public | All distinct countries |
| GET | `/scholarships/:id` | public | Single scholarship detail |
| GET | `/scholarships/:id/recommendations` | public | Related scholarships |
| POST | `/add-scholarship` | token + admin | Add new scholarship |
| PATCH | `/scholarships/:id` | token + admin | Update scholarship |
| DELETE | `/scholarships/:id` | token + admin | Delete scholarship |

### Applications — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/applications` | token | Submit application |
| GET | `/applications` | token + admin | All applications |
| GET | `/applications/user/:email` | token | Student's own applications |
| GET | `/applications/moderator` | token + moderator | Applications for moderation |
| GET | `/applications/:id` | token | Single application |
| PATCH | `/applications/:id` | token | Edit application (student) |
| PATCH | `/applications/:id/review` | token + moderator | Mark as reviewed |
| PATCH | `/applications/:id/feedback` | token + moderator | Add feedback |
| PATCH | `/applications/:id/status` | token + moderator | Update status |
| DELETE | `/applications/:id` | token | Delete application |

### Reviews — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/reviews` | public | All reviews |
| GET | `/reviews/:scholarshipId` | public | Reviews for a scholarship |
| POST | `/reviews` | token | Post a review |
| PATCH | `/reviews/:id` | token | Edit own review |
| DELETE | `/reviews/:id` | token | Delete review |

### Payment — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/create-checkout-session` | token | Create Stripe Checkout session |
| PATCH | `/payment-success` | token | Verify payment and mark application paid |

Rate-limited to 10 requests/minute per IP on `/create-checkout-session`.

### Analytics — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/analytics` | token + admin | Snapshot: users, scholarships, fees, applications by university and category |
| GET | `/analytics/trends` | token + admin | Monthly application counts over the last 12 months |

### Document Upload — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/upload-url` | token | Generate up to 5 presigned R2 upload URLs |

### Newsletter & Email — `/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/newsletter/subscribe` | public | Subscribe an email address |
| POST | `/send-email` | token | Send transactional email |

---

## Key Logic

### Payment Flow

1. Client posts `POST /create-checkout-session` with the application ID and scholarship info.
2. Server creates a Stripe Checkout session with `success_url` pointing back to the frontend.
3. On redirect, client calls `PATCH /payment-success?session_id=…`.
4. Server retrieves the session from Stripe, confirms `payment_status === "paid"`, then updates the application: `paymentStatus: "paid"`, `transactionId: session.id`.

### Document Upload Flow

1. Client requests presigned URLs via `POST /upload-url` with an array of `{ fileName, fileType }` (1–5 files).
2. Server generates a unique key per file (`applications/<email>/<timestamp>-<random>-<filename>`) and returns `{ uploadUrl, fileUrl }` pairs.
3. Client uploads directly to Cloudflare R2 using the presigned `uploadUrl`.
4. Client stores the `fileUrl` values in the application payload — the server never handles the file bytes.

### Rate Limiting

A general limit of **100 requests/minute per IP** applies to all routes. The `/create-checkout-session` endpoint has a stricter limit of **10 requests/minute** to prevent abuse.

### Analytics Aggregations

The analytics endpoint runs MongoDB aggregation pipelines to compute:

- Total counts for users, scholarships, and applications
- Total fees collected (sum of `totalAmount` where `paymentStatus: "paid"`)
- Application distribution by university and by scholarship category
- Monthly application trend over the trailing 12 months

---

## Data Models

### Scholarship

Key fields: `scholarshipName`, `universityName`, `universityCountry`, `universityWorldRank`, `scholarshipCategory`, `subjectCategory`, `degree`, `applicationFees`, `serviceCharge`, `stipend`, `applicationDeadline`, `postedUserEmail`.

### Application

Key fields: `scholarshipId`, `userEmail`, `applicationStatus` (enum: `pending | processing | accepted | rejected | needs revision`), `paymentStatus` (enum: `pending | paid`), `transactionId`, `documentUrls`, `feedback`, `cgpa`, `dateOfBirth`, `gender`.

### User

Stores `email`, `name`, `photo`, and `role` (enum: `user | moderator | admin`). Created on first login.

### Review

Linked to a scholarship via `scholarshipId` and to a user via `userEmail`. Stores `rating` and `comment`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)
- Firebase project with a service account key
- Stripe account
- Cloudflare R2 bucket

### Environment Variables

Create `.env` in this directory:

```env
PORT=5000
MONGODB_URI=
FB_SERVICE_KEY=           # Base64-encoded Firebase Admin SDK JSON
STRIPE_SECRET_KEY=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=
SITE_DOMAIN=http://localhost:5173
EMAIL_USER=
EMAIL_PASS=
```

> **`FB_SERVICE_KEY`** — Download the service account JSON from Firebase console, then encode it:
> `base64 -i service-account.json | tr -d '\n'`

### Running Locally

```bash
npm install
node index.js
# Server available at http://localhost:5000
```

---

## Deployment

Deployed to **Vercel**. `vercel.json` routes all incoming traffic to `index.js`.
