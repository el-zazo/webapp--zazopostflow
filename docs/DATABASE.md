# ZazoPostFlow — Database Models & Schema Documentation

> **Database:** MongoDB  
> **ODM:** Mongoose 9  
> **Convention:** All models use Mongoose schemas with automatic `createdAt` / `updatedAt` timestamps unless otherwise noted.

---

## Table of Contents

- [1. Database Connection](#1-database-connection)
- [2. User Model](#2-user-model)
  - [2.1 Schema Definition](#21-schema-definition)
  - [2.2 Indexes](#22-indexes)
  - [2.3 Key Behaviors & Design Rationale](#23-key-behaviors--design-rationale)
- [3. Post Model](#3-post-model)
  - [3.1 Schema Definition](#31-schema-definition)
  - [3.2 Indexes](#32-indexes)
  - [3.3 Key Behaviors & Design Rationale](#33-key-behaviors--design-rationale)
- [4. Project Model](#4-project-model)
  - [4.1 Schema Definition](#41-schema-definition)
  - [4.2 Indexes](#42-indexes)
  - [4.3 Key Behaviors & Design Rationale](#43-key-behaviors--design-rationale)
- [5. Tag Model](#5-tag-model)
  - [5.1 Schema Definition](#51-schema-definition)
  - [5.2 Indexes](#52-indexes)
  - [5.3 Key Behaviors & Design Rationale](#53-key-behaviors--design-rationale)
- [6. Entity Relationships](#6-entity-relationships)
- [7. Cascading Deletes](#7-cascading-deletes)
- [8. Index Summary](#8-index-summary)
- [9. TypeScript Types](#9-typescript-types)
- [10. Environment Variables](#10-environment-variables)

---

## 1. Database Connection

**Source:** `src/lib/mongodb.ts`

The application connects to MongoDB through a single exported function that implements the **global singleton pattern** to prevent connection pool exhaustion during development (where Next.js hot-reloading can create multiple Mongoose instances).

```ts
export default function dbConnect(): Promise<typeof mongoose>
```

| Parameter | Description |
|---|---|
| `MONGODB_URI` | **Required.** Full MongoDB connection string (e.g. `mongodb+srv://...`). Read from `process.env`. |
| `DB_NAME` | *Optional.* Database name override. If omitted, the name is derived from the connection string. |

### How the Singleton Works

1. On first call, `mongoose.connect()` is invoked with the URI and options.
2. The resulting connection is cached on `global.mongoose` (a Node.js global augmented at runtime).
3. Subsequent calls return the cached promise immediately, skipping the connect call entirely.
4. This ensures that even with Fast Refresh or serverless cold starts, only one connection pool exists per process.

---

## 2. User Model

**Source:** `src/models/User.ts`  
**Collection:** `users`

### 2.1 Schema Definition

| Field | BSON Type | Constraints | Default | Description |
|---|---|---|---|---|
| `username` | String | **required**, unique, trim, minlength: 3, maxlength: 30 | — | Public display name; must be unique across all users |
| `email` | String | **required**, unique, trim, lowercase | — | Login identifier; auto-lowered for case-insensitive lookups |
| `password` | String | **required**, minlength: 6 | — | Bcrypt hash (12 salt rounds). The minlength applies to the *plaintext* input before hashing |
| `avatar` | String | — | `null` | URL to avatar image; null means default avatar is rendered |
| `theme` | String | enum: `["dark", "light"]` | `"dark"` | UI theme preference persisted per user |
| `active` | Boolean | — | `false` | Email verification flag. New users cannot log in until this is `true` |
| `email_verification_token` | String | — | `null` | Crypto-random hex token sent to the user's email on registration |
| `email_verification_expires` | Date | — | `null` | Expiration for the email verification token |
| `delete_account_token` | String | — | `null` | Token sent to email to confirm account deletion |
| `delete_account_expires` | Date | — | `null` | Expiration for the delete-account confirmation token |
| `delete_account_requested_at` | Date | — | `null` | Timestamp of when the deletion was requested (for audit/UI display) |
| `resetToken` | String | — | `null` | Password-reset token (hashed) |
| `resetTokenExpiry` | Date | — | `null` | Expiration for the password-reset token |
| `passwordChangedAt` | Date | — | `null` | Timestamp of the most recent password change; used for JWT session invalidation |
| `two_factor_secret` | String | — | `null` | TOTP secret (base32-encoded) for authenticator apps |
| `two_factor_enabled` | Boolean | — | `false` | Whether 2FA is currently active for this user |
| `two_factor_backup_codes` | [String] | — | `[]` | Array of **bcrypt-hashed** backup codes for 2FA recovery |
| `disable_2fa_token` | String | — | `null` | Token for confirming 2FA disable action |
| `disable_2fa_expires` | Date | — | `null` | Expiration for the 2FA disable token |

**Timestamps:** `createdAt`, `updatedAt` (auto-managed by Mongoose)

### 2.2 Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| `username_1` | `{ username: 1 }` | Unique | Fast lookup & enforcement of unique usernames |
| `email_1` | `{ email: 1 }` | Unique | Fast lookup & enforcement of unique emails |

### 2.3 Key Behaviors & Design Rationale

- **Bcrypt hashing (12 salt rounds):** Passwords are never stored in plaintext. The 12-round cost factor balances security with performance — each hash takes ~200 ms, which is acceptable for login flows but prohibitive for brute-force attacks.

- **`active: false` by default:** Implements a verified-email gate. After registration, a verification token is emailed. Only after clicking the link is `active` set to `true`. This prevents spam accounts and ensures email ownership.

- **JWT session invalidation via `passwordChangedAt`:** When a user changes their password, this field is updated. On every authenticated request, the server compares the JWT's `iat` (issued-at) claim against `passwordChangedAt`. If the token was issued *before* the password change, the request is rejected. This cleanly invalidates all existing sessions without requiring a token blocklist.

- **Bcrypt-hashed backup codes:** `two_factor_backup_codes` stores *hashed* codes, not plaintext — the same principle as password storage. When a user submits a backup code, it is compared using `bcrypt.compare()`. Each code is single-use; after successful verification it is removed from the array.

- **Dedicated token fields:** Each security flow (email verification, password reset, account deletion, 2FA disable) uses its own token + expiry pair. This prevents token confusion attacks where a token intended for one flow could be replayed in another.

- **Account deletion flow:** The three `delete_account_*` fields support a two-step deletion: the user requests deletion → a confirmation email is sent → the user clicks the link → the account (and all dependent data) is destroyed. The `requested_at` field is preserved for audit logging and user-facing "your account will be deleted in X days" messaging.

---

## 3. Post Model

**Source:** `src/models/Post.ts`  
**Collection:** `posts`

### 3.1 Schema Definition

| Field | BSON Type | Constraints | Default | Description |
|---|---|---|---|---|
| `project_id` | ObjectId (ref: `Project`) | **required**, indexed | — | Parent project; ownership is verified through the project → user chain |
| `name` | String | **required**, trim, minlength: 1, maxlength: 100 | — | Post title / headline |
| `content` | String | **required**, minlength: 1 | — | Full post body (Markdown or plain text) |
| `type` | String | enum: `["main", "group"]` | `"main"` | `main` = standalone post; `group` = part of a carousel/thread |
| `platform` | String | — | `"LinkedIn"` | Target social media platform |
| `scheduled_date` | Date | sparse index | `null` | When the post is scheduled to go live; null means not scheduled |
| `published_date` | Date | sparse index | `null` | When the post was actually published; null means not yet published |
| `status` | String | enum: `["draft", "scheduled", "published"]` | `"draft"` | Lifecycle state of the post |
| `has_videos` | Boolean | — | `false` | Whether the post has video attachments |
| `has_images` | Boolean | — | `false` | Whether the post has image attachments |

**Timestamps:** `createdAt`, `updatedAt` (auto-managed by Mongoose)

### 3.2 Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| `project_id_1` | `{ project_id: 1 }` | Single | Fast lookups of all posts in a project |
| `project_id_1_status_1` | `{ project_id: 1, status: 1 }` | Compound | Efficient filtering by status within a project (e.g. "show me all drafts in Project X") |
| `project_id_1_scheduled_date_1` | `{ project_id: 1, scheduled_date: 1 }` | Compound | Calendar/scheduling queries — e.g. "what posts are scheduled this week for Project X?" |
| `project_id_1_published_date_1` | `{ project_id: 1, published_date: 1 }` | Compound | Published-post lookups, sorted chronologically |
| `scheduled_date_1` | `{ scheduled_date: 1 }` | Sparse | Find posts with a scheduled date across all projects (used by the scheduler worker) |
| `published_date_1` | `{ published_date: 1 }` | Sparse | Find published posts across all projects |

> **Sparse indexes** only include documents where the indexed field has a value. Since most posts start as drafts with `scheduled_date: null` and `published_date: null`, a sparse index keeps the index size small and avoids indexing millions of `null` entries.

### 3.3 Key Behaviors & Design Rationale

- **Ownership through project chain:** Posts do not have a direct `user_id` field. Instead, ownership is verified by resolving `post.project_id → project.user_id → current user`. This avoids data duplication and keeps the ownership chain authoritative at the project level.

- **Auto-set `published_date`:** When `status` is set to `"published"` and `published_date` is not explicitly provided, the model automatically sets it to `Date.now()`. This ensures every published post has a reliable publication timestamp without relying on the client clock.

- **Sparse indexes on date fields:** The `scheduled_date` and `published_date` fields use sparse indexes because the vast majority of posts will be in `draft` status with no date set. A regular index would create entries for all those `null` values, wasting space and degrading write performance for no query benefit.

- **Boolean media flags (`has_videos`, `has_images`):** These denormalized flags allow the UI to render media indicators in list views without loading full attachment data. They are set when media is attached to the post.

- **Post type (`main` vs `group`):** The `type` field distinguishes standalone posts from grouped posts (e.g. LinkedIn carousels or threads). Grouped posts are displayed and managed together in the UI but are stored as separate documents for independent editing and scheduling.

---

## 4. Project Model

**Source:** `src/models/Project.ts`  
**Collection:** `projects`

### 4.1 Schema Definition

| Field | BSON Type | Constraints | Default | Description |
|---|---|---|---|---|
| `user_id` | ObjectId (ref: `User`) | **required**, indexed | — | Owner of the project |
| `name` | String | **required**, trim, minlength: 1, maxlength: 100 | — | Project name; unique per user (enforced by compound index) |
| `description` | String | maxlength: 500 | `""` | Brief project description |
| `github_link` | String | — | `""` | URL to the project's GitHub repository |
| `demo_link` | String | — | `""` | URL to the project's live demo |
| `tags` | [ObjectId] (ref: `Tag`) | — | `[]` | Array of tag references; tags are shared across projects |
| `status` | String | enum: `["active", "archived", "completed"]` | `"active"` | Project lifecycle status |

**Timestamps:** `createdAt`, `updatedAt` (auto-managed by Mongoose)

### 4.2 Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| `user_id_1` | `{ user_id: 1 }` | Single | Fast lookups of all projects for a user |
| `user_id_1_name_1` | `{ user_id: 1, name: 1 }` | Compound (unique) | Prevents duplicate project names per user; also speeds up "find project by name" queries |

### 4.3 Key Behaviors & Design Rationale

- **Referenced tags (not embedded):** Tags are stored as an array of ObjectId references rather than embedded sub-documents. This allows a single tag to be shared across multiple projects, and tag name changes are instantly reflected everywhere. The trade-off is that populating tags requires an extra `$lookup` or `.populate()` call, but the flexibility and data consistency benefits outweigh the cost.

- **Unique project names per user:** The compound unique index `{ user_id: 1, name: 1 }` ensures that one user cannot create two projects with the same name. This prevents confusion in the UI and in URL-based routing.

- **Project status (`status` field):** The `status` field has three possible values: `"active"` (default, visible in the main project list), `"archived"` (hidden from the main list but preserved for reference), and `"completed"` (marks the project as finished). The `"archived"` status acts as a filter state to hide projects from the main view. Users can also hard-delete a project via `DELETE /api/projects/[id]`, which triggers a cascade that removes the project and all its associated posts.

- **Computed counts (`postsCount`, `tagsCount`):** These fields are **not stored** in the database. They are computed at query time using MongoDB aggregation pipelines (`$lookup` + `$count`). This avoids count staleness and the complexity of increment/decrement maintenance on every post/tag change.

- **Cascade delete:** When a project is hard-deleted, all associated posts are deleted in a cascading operation. This is handled at the application/service layer, not via MongoDB's native cascade (which doesn't exist for non-sharded collections).

---

## 5. Tag Model

**Source:** `src/models/Tag.ts`  
**Collection:** `tags`

### 5.1 Schema Definition

| Field | BSON Type | Constraints | Default | Description |
|---|---|---|---|---|
| `user_id` | ObjectId (ref: `User`) | **required**, indexed | — | Owner of the tag |
| `name` | String | **required**, trim, minlength: 1, maxlength: 50 | — | Tag label; case-insensitive unique per user (enforced at API level) |

**Timestamps:** `createdAt`, `updatedAt` (auto-managed by Mongoose)

### 5.2 Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| `user_id_1` | `{ user_id: 1 }` | Single | Fast lookups of all tags for a user |
| `user_id_1_name_1` | `{ user_id: 1, name: 1 }` | Compound (unique) | Prevents duplicate tag names per user at the database level |

### 5.3 Key Behaviors & Design Rationale

- **Case-insensitive uniqueness at the API level:** The compound unique index enforces exact-match uniqueness (e.g. "React" ≠ "react"). For case-insensitive enforcement, the API layer uses an escaped regex check (`/^react$/i`) before creating a tag. This two-layer approach ensures correctness: the regex catches visual duplicates before insert, and the unique index catches any race-condition duplicates at the database level.

- **Escaped regex for safety:** Tag names are user-supplied strings. Before constructing the regex, special regex characters are escaped to prevent ReDoS (Regular Expression Denial of Service) attacks. For example, a tag name of `C++` is escaped to `C\+\+` before being used in the query regex.

- **Referential integrity on delete:** When a tag is deleted, a `$pull` operation removes its ObjectId from the `tags` array of **all** projects that reference it. Projects themselves are not deleted. This is handled at the application layer:

  ```ts
  await Project.updateMany(
    { tags: tagId },
    { $pull: { tags: tagId } }
  );
  ```

- **Computed `projectsCount`:** Like `postsCount` on projects, this is not stored. It is computed via an aggregation pipeline that `$lookup`s projects containing the tag and counts them. This ensures accuracy without the overhead of maintaining a counter.

- **Minimal schema, maximum flexibility:** Tags are intentionally lightweight — just a name and an owner. This makes them cheap to create, easy to query, and simple to share across projects. Richer metadata (color, category) can be added in the future without migration pain.

---

## 6. Entity Relationships

```
User
 ├── 1:N ──→ Project (via project.user_id)
 │              ├── 1:N ──→ Post (via post.project_id)
 │              └── M:N ──→ Tag  (via project.tags[] array of references)
 └── 1:N ──→ Tag  (via tag.user_id)
```

| Relationship | Type | Stored On | Delete Cascade |
|---|---|---|---|
| User → Project | One-to-Many | `Project.user_id` | User deletion removes all projects |
| Project → Post | One-to-Many | `Post.project_id` | Project deletion removes all posts |
| Project → Tag | Many-to-Many | `Project.tags[]` | Tag deletion `$pull`s from `tags[]`; project is preserved |
| User → Tag | One-to-Many | `Tag.user_id` | User deletion removes all tags |

### Design Decision: Referenced vs. Embedded Tags

Tags are **referenced** (stored as ObjectIds) rather than **embedded** (stored as sub-documents inside projects). This decision was made because:

1. **Shared tags:** A single tag (e.g. "React") can be applied to many projects. Embedding would duplicate the tag name across every project, leading to inconsistency if the tag is renamed.
2. **Independent lifecycle:** Tags can be created, renamed, and deleted independently of projects. With embedding, "deleting a tag" would require scanning and mutating every project document.
3. **Query flexibility:** Referenced tags support queries like "find all projects with tag X" and "count how many projects use tag Y" without duplicating data.

The trade-off is that reading a project with its tags requires a `populate()` or `$lookup`, but this is a standard MongoDB pattern and well-optimized with proper indexing.

---

## 7. Cascading Deletes

All cascade operations are performed at the **application/service layer** (not via MongoDB's native mechanisms, since MongoDB does not support foreign-key cascades for non-sharded collections). Operations are executed in dependency order to maintain referential integrity.

| Delete Action | Cascade Behavior | Implementation |
|---|---|---|
| **Delete User** | 1. Delete all projects owned by the user → (which cascades to delete all posts in those projects) 2. Delete all tags owned by the user | Service layer: sequential deletes with project → post cascade first |
| **Delete Project** | Delete all posts whose `project_id` matches the deleted project | `Post.deleteMany({ project_id: projectId })` |
| **Delete Tag** | `$pull` the tag's ObjectId from the `tags` array of **all** projects referencing it. Projects and their posts are **not** deleted. | `Project.updateMany({ tags: tagId }, { $pull: { tags: tagId } })` |

### Cascade Sequence for User Deletion

```
1. Find all projects where user_id = userId
2. For each project:
   a. Delete all posts where project_id = project._id
3. Delete all projects where user_id = userId
4. Delete all tags where user_id = userId
5. Delete the user document
```

> **Note:** These operations are not wrapped in a MongoDB transaction. In a production environment with high concurrency, wrapping the cascade in a `session.withTransaction()` call is recommended to ensure atomicity.

---

## 8. Index Summary

A consolidated view of all indexes across the four collections:

### `users`

| Index Key | Fields | Unique | Sparse | Purpose |
|---|---|---|---|---|
| `username_1` | `{ username: 1 }` | Yes | No | Unique username enforcement & lookup |
| `email_1` | `{ email: 1 }` | Yes | No | Unique email enforcement & login lookup |

### `posts`

| Index Key | Fields | Unique | Sparse | Purpose |
|---|---|---|---|---|
| `project_id_1` | `{ project_id: 1 }` | No | No | Project → posts lookup |
| `project_id_1_status_1` | `{ project_id: 1, status: 1 }` | No | No | Status filtering per project |
| `project_id_1_scheduled_date_1` | `{ project_id: 1, scheduled_date: 1 }` | No | No | Calendar queries per project |
| `project_id_1_published_date_1` | `{ project_id: 1, published_date: 1 }` | No | No | Published post lookups per project |
| `scheduled_date_1` | `{ scheduled_date: 1 }` | No | Yes | Cross-project scheduler queries |
| `published_date_1` | `{ published_date: 1 }` | No | Yes | Cross-project published queries |

### `projects`

| Index Key | Fields | Unique | Sparse | Purpose |
|---|---|---|---|---|
| `user_id_1` | `{ user_id: 1 }` | No | No | User → projects lookup |
| `user_id_1_name_1` | `{ user_id: 1, name: 1 }` | Yes | No | Prevent duplicate project names per user |

### `tags`

| Index Key | Fields | Unique | Sparse | Purpose |
|---|---|---|---|---|
| `user_id_1` | `{ user_id: 1 }` | No | No | User → tags lookup |
| `user_id_1_name_1` | `{ user_id: 1, name: 1 }` | Yes | No | Prevent duplicate tag names per user |

---

## 9. TypeScript Types

**Source:** `src/types/index.ts`

The following interfaces define the shape of data as it flows through the application layer. They represent the **public API surface** — sensitive fields like `password`, `two_factor_secret`, and token fields are intentionally excluded.

### `User`

```ts
interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string | null;
  theme: "dark" | "light";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

> Password, 2FA secrets, and all token fields are **never** included in the public type. They exist only in the Mongoose schema for internal use.

### `Project`

```ts
interface Project {
  _id: string;
  user_id: string;
  name: string;
  description: string;
  github_link: string;
  demo_link: string;
  tags: { _id: string; name: string }[];
  status: "active" | "archived" | "completed";
  createdAt: string;
  updatedAt: string;
  postsCount?: number; // computed via aggregation, not stored
}
```

> `tags` is populated as an array of sub-objects `{ _id, name }` via Mongoose `.populate()` or `$lookup`. The raw schema stores `ObjectId[]`; the TypeScript type reflects the populated shape.

### `Post`

```ts
interface Post {
  _id: string;
  project_id: string;
  name: string;
  content: string;
  type: "main" | "group";
  platform: string;
  scheduled_date: string | null;
  published_date: string | null;
  status: "draft" | "scheduled" | "published";
  has_videos: boolean;
  has_images: boolean;
  createdAt: string;
  updatedAt: string;
  projectName?: string; // populated from parent project for display
}
```

> `projectName` is an optional virtual field populated at query time for list views where the project name needs to be displayed alongside the post.

### `Tag`

```ts
interface Tag {
  _id: string;
  user_id: string;
  name: string;
  projectsCount?: number; // computed via aggregation, not stored
  createdAt: string;
  updatedAt: string;
}
```

### `DashboardStats`

```ts
interface DashboardStats {
  totalProjects: number;
  totalPosts: number;
  scheduledThisWeek: number;
  publishedThisMonth: number;
}
```

> Computed via aggregation pipeline — no stored counters. This ensures real-time accuracy at the cost of a slightly more expensive query.

### `RecentPost`

```ts
interface RecentPost {
  _id: string;
  name: string;
  status: "draft" | "scheduled" | "published";
  type?: "main" | "group";
  has_images?: boolean;
  has_videos?: boolean;
  createdAt: string;
  projectName: string;
  projectId: string;
}
```

> A flattened view of a post with its parent project's name and ID, used for the dashboard's recent-activity feed.

### `ApiResponse<T>`

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

> Generic wrapper for all API responses. On success, `data` contains the typed payload. On failure, `error` contains a human-readable message.

---

## 10. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | **Yes** | Full MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/...`) |
| `DB_NAME` | No | Database name override. If omitted, Mongoose uses the database specified in the connection string. |
