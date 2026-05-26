# Components Reference

Complete UI component documentation for ZazoPostFlow. Every custom component is documented below with its props, usage examples, behavioral notes, and important caveats.

---

## Table of Contents

- [Post Components](#post-components)
  - [PostForm](#postform)
  - [PostFilters](#postfilters)
  - [PostCard](#postcard)
  - [PostContentViewer](#postcontentviewer)
  - [PostDatePicker](#postdatepicker)
  - [QuickPublishButton](#quickpublishbutton)
- [Project Components](#project-components)
  - [ProjectForm](#projectform)
  - [ProjectFilters](#projectfilters)
  - [ProjectCard](#projectcard)
- [Tag Components](#tag-components)
  - [EditTagDialog](#edittagdialog)
- [Settings Components](#settings-components)
  - [TwoFactorSetup](#twofactorsetup)
  - [RegenerateBackupCodes](#regeneratebackupcodes)
- [Dashboard Components](#dashboard-components)
  - [StatsCard](#statscard)
- [Shared Components](#shared-components)
  - [ConfirmDialog](#confirmdialog)
  - [CopyButton](#copybutton)
  - [LogoutButton](#logoutbutton)
  - [PremiumPagination](#premiumpagination)
  - [TagsFilter](#tagsfilter)
  - [SortControls](#sortcontrols)

---

## Post Components

### PostForm

**File:** `src/components/posts/PostForm.tsx`

Dialog form for creating and editing posts. Wraps a shadcn/ui `Dialog` around a `react-hook-form` managed form with Zod validation. Submission is guarded by `useAsyncAction` to prevent double-click duplication.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | Yes | Controls dialog visibility |
| `onClose` | `() => void` | Yes | Called when the dialog is closed |
| `onSubmit` | `(data: PostFormData) => Promise<void>` | Yes | Async callback invoked on valid form submission |
| `post` | `Post` | No | Post data for edit mode. Omit or pass `undefined` for create mode |
| `projects` | `Project[]` | Yes | Available projects shown in the project selector |
| `defaultProjectId` | `string` | No | Pre-selected project ID when the dialog opens |

#### Form Fields

| Field | Control | Validation | Default | Notes |
|---|---|---|---|---|
| `project_id` | Select | Required | — | Populated from `projects` prop |
| `name` | Text input | 1-100 characters | — | |
| `content` | Textarea | 1+ characters | — | |
| `type` | Select | `"main"` or `"group"` | `"main"` | |
| `status` | Select | `"draft"`, `"scheduled"`, or `"published"` | `"draft"` | |
| `scheduled_date` | PostDatePicker | Optional | — | Uses custom date picker with post indicators |
| `published_date` | PostDatePicker | Optional | — | Conditionally shown only when `status === "published"` |
| `has_images` | Checkbox | — | `false` | |
| `has_videos` | Checkbox | — | `false` | |

#### Behavior

- **Create mode** (no `post` prop): All fields start with their defaults; `defaultProjectId` pre-selects the project when provided.
- **Edit mode** (`post` prop supplied): Every field is pre-populated from the existing post data. The form resets to the current post values when the `post` prop changes.
- **Validation** is performed by `react-hook-form` with a Zod schema. Errors appear inline beneath each field.
- **Double-click protection**: `useAsyncAction` disables the submit button and tracks in-flight state, preventing duplicate submissions.
- **Dialog close**: Clicking the X, pressing Escape, or clicking the overlay calls `onClose`. Any unsaved changes are discarded.

#### Usage

```tsx
<PostForm
  open={showForm}
  onClose={() => setShowForm(false)}
  onSubmit={handleCreatePost}
  projects={projects}
  defaultProjectId="proj_abc123"
/>

<PostForm
  open={showForm}
  onClose={() => setShowForm(false)}
  onSubmit={handleUpdatePost}
  post={selectedPost}
  projects={projects}
/>
```

---

### PostFilters

**File:** `src/components/posts/PostFilters.tsx`

A horizontally-laid filter bar for searching, filtering, and sorting the posts list. Each filter is a controlled input whose value and change handler are provided by the parent.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `search` | `string` | Yes | Current search query value |
| `onSearchChange` | `(value: string) => void` | Yes | Search input change handler |
| `status` | `string` | Yes | Current status filter value |
| `onStatusChange` | `(value: string) => void` | Yes | Status filter change handler |
| `type` | `string` | Yes | Current type filter value |
| `onTypeChange` | `(value: string) => void` | Yes | Type filter change handler |
| `media` | `string` | Yes | Current media filter value |
| `onMediaChange` | `(value: string) => void` | Yes | Media filter change handler |
| `sortBy` | `string` | Yes | Current sort field |
| `onSortByChange` | `(value: string) => void` | Yes | Sort field change handler |
| `sortOrder` | `string` | Yes | Current sort order (`"asc"` or `"desc"`) |
| `onSortOrderToggle` | `() => void` | Yes | Toggle between ascending/descending sort |
| `hasActiveFilters` | `boolean` | No | When `true`, highlights that filters are active |
| `onReset` | `() => void` | No | Resets all filters to their defaults |

#### Filter Options

| Filter | Options |
|---|---|
| **Status** | `all`, `draft`, `scheduled`, `published` |
| **Type** | `all`, `main`, `group` |
| **Media** | `all`, `has_images`, `has_videos`, `has_both`, `none` |
| **Sort By** | `createdAt`, `updatedAt`, `name`, `status`, `type`, `scheduled_date`, `published_date` |

#### Usage

```tsx
<PostFilters
  search={search}
  onSearchChange={setSearch}
  status={statusFilter}
  onStatusChange={setStatusFilter}
  type={typeFilter}
  onTypeChange={setTypeFilter}
  media={mediaFilter}
  onMediaChange={setMediaFilter}
  sortBy={sortBy}
  onSortByChange={setSortBy}
  sortOrder={sortOrder}
  onSortOrderToggle={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
  hasActiveFilters={hasActiveFilters}
  onReset={resetFilters}
/>
```

---

### PostCard

**File:** `src/components/posts/PostCard.tsx`

A card component that renders a summary of a single post with action buttons. Integrates `PostContentViewer` for reading the full content.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `post` | `Post` | Yes | Post data to display |
| `onEdit` | `(post: Post) => void` | Yes | Callback when the Edit action is triggered |
| `onDelete` | `(post: Post) => void` | Yes | Callback when the Delete action is triggered |

#### Features

- **Content preview**: Displays up to 3 lines of post content, truncated with an ellipsis.
- **Badges**: Status, type, and platform badges are rendered with distinct colors.
- **Media indicators**: Image and/or video icons appear when `has_images` or `has_videos` is `true`.
- **Copy content**: A copy button allows quick clipboard access to the post content.
- **PostContentViewer integration**: Clicking the content area opens the full content in a scrollable dialog.
- **Edit and Delete**: Dedicated action buttons invoke `onEdit` and `onDelete` respectively.

#### Usage

```tsx
<PostCard
  post={post}
  onEdit={(p) => { setEditingPost(p); setShowForm(true); }}
  onDelete={(p) => setPostToDelete(p)}
/>
```

---

### PostContentViewer

**File:** `src/components/posts/PostContentViewer.tsx`

Full-screen dialog for reading a post's complete content. Provides character count feedback and clipboard copying.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `post` | `Post` | Yes | The post whose content to display |

#### Features

- **Scrollable content**: Full post content is rendered in a scrollable container within a maximized dialog.
- **Character count**: Displays the total character count. A visual warning appears when content exceeds 3 000 characters (LinkedIn limit).
- **Copy to clipboard**: Button copies the entire content to the clipboard. Wrapped in `try/catch` to handle environments where the Clipboard API is unavailable (Fix #16).
- **Badges**: Status and type badges are shown at the top of the viewer.

#### Usage

```tsx
<PostContentViewer post={selectedPost} />
```

> **Caveat:** The component manages its own open/close state internally. It renders a trigger element (typically a button on the `PostCard`) that opens the dialog.

---

### PostDatePicker

**File:** `src/components/posts/PostDatePicker.tsx`

Custom date picker with a calendar dropdown that shows colored dots on days containing posts. Implements a two-click selection model for improved UX.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string \| undefined` | No | Currently selected date (ISO string) |
| `onChange` | `(date: string \| undefined) => void` | Yes | Callback when a date is selected |
| `placeholder` | `string` | No | Placeholder text shown when no date is selected |
| `label` | `string` | No | Label text rendered above the picker |
| `disabled` | `boolean` | No | Disables all interaction when `true` |
| `excludePostId` | `string` | No | Post ID excluded from calendar dot indicators (typically the post being edited) |

#### Features

- **Post indicators**: Colored dots appear on calendar days that have scheduled or published posts. Dot color reflects the post's status.
- **Two-click selection**:
  1. **First click** on a day: shows a popover listing the posts scheduled for that day.
  2. **Second click** on the same day: confirms the date selection and calls `onChange`.
- **Data fetching**: Uses the `useDatePickerPosts` hook to fetch post data for the visible calendar month.
- **Exclude current post**: When editing a post, pass its ID via `excludePostId` so it does not appear as a conflicting indicator on its own scheduled date.

#### Usage

```tsx
<PostDatePicker
  value={scheduledDate}
  onChange={setScheduledDate}
  placeholder="Pick a scheduled date"
  label="Scheduled Date"
  excludePostId={editingPost?.id}
/>
```

> **Caveat:** The two-click model means a single click does not immediately commit the date. This prevents accidental selections when the user intends to preview a day's posts.

---

### QuickPublishButton

**File:** `src/components/posts/QuickPublishButton.tsx`

A premium publish/unpublish toggler with dual-confirmation. When the post is published, clicking shows a `ConfirmDialog` to unpublish (reverts to scheduled/draft). When not published, clicking shows a `ConfirmDialog` to publish now. Uses `useRef` for double-click protection. Sends `PUT /api/posts/{id}` with `{ status, published_date }`.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `post` | `Post` | Yes | Post data to toggle publish state for |
| `onSuccess` | `() => void` | Yes | Callback invoked after the publish/unpublish action succeeds |
| `className` | `string` | No | Additional CSS classes applied to the button |

#### Behavior

1. **Post is published**: Clicking the button opens a `ConfirmDialog` asking to confirm unpublishing. On confirm, sends `PUT /api/posts/{id}` with `{ status: "scheduled" }` (or `"draft"` if no scheduled date), clearing `published_date`.
2. **Post is not published**: Clicking the button opens a `ConfirmDialog` asking to confirm publishing now. On confirm, sends `PUT /api/posts/{id}` with `{ status: "published", published_date: new Date().toISOString() }`.
3. **Double-click protection**: A `useRef` flag prevents multiple concurrent requests.
4. **On success**: Calls `onSuccess` so the parent can refresh data.

#### Usage

```tsx
<QuickPublishButton
  post={post}
  onSuccess={() => refetchPosts()}
  className="ml-2"
/>
```

> **Caveat:** The double-confirmation pattern means two clicks are required to complete the action — one to open the dialog and one to confirm. This is intentional to prevent accidental publish/unpublish operations.

---

## Project Components

### ProjectForm

**File:** `src/components/projects/ProjectForm.tsx`

Dialog form for creating and editing projects. Supports inline tag creation when a searched tag does not already exist.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | Yes | Controls dialog visibility |
| `onClose` | `() => void` | Yes | Called when the dialog is closed |
| `onSubmit` | `(data: ProjectFormData) => Promise<void>` | Yes | Async callback on valid form submission |
| `project` | `Project` | No | Project data for edit mode. Omit for create mode |

#### Form Fields

| Field | Control | Validation | Default | Notes |
|---|---|---|---|---|
| `name` | Text input | 1-100 characters | — | |
| `description` | Textarea | Max 500 characters | — | |
| `github_link` | URL input | Valid URL or empty string | `""` | |
| `demo_link` | URL input | Valid URL or empty string | `""` | |
| `tags` | Searchable multi-select | — | `[]` | Supports inline tag creation |
| `status` | Select | `"active"` or `"archived"` | `"active"` | |

#### Inline Tag Creation

When the user types a tag name that does not match any existing tag, a **"Create 'X'"** option appears at the top of the dropdown. Selecting it:

1. Sends `POST /api/tags` with the new tag name.
2. On success, the new tag is added to the project's tag list.
3. The tag is immediately available for selection in the current and future sessions.

#### Behavior

- **Create mode** (no `project` prop): All fields start with their defaults.
- **Edit mode** (`project` prop supplied): Fields are pre-populated from the existing project data. The form resets to the current project values when the `project` prop changes.
- **Validation** uses `react-hook-form` with Zod.
- **Select reset fix**: The tag select uses `value` (controlled) instead of `defaultValue` to ensure proper form reset when switching between projects (Fix #11).
- **Double-click protection** via `useAsyncAction` on the submit button.

#### Usage

```tsx
<ProjectForm
  open={showForm}
  onClose={() => setShowForm(false)}
  onSubmit={handleCreateProject}
/>

<ProjectForm
  open={showForm}
  onClose={() => setShowForm(false)}
  onSubmit={handleUpdateProject}
  project={selectedProject}
/>
```

---

### ProjectFilters

**File:** `src/components/projects/ProjectFilters.tsx`

Filter bar for searching, filtering by status, and sorting the projects list. Supports an optional `children` slot for injecting additional filters (e.g., `TagsFilter`).

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `search` | `string` | Yes | Current search query value |
| `onSearchChange` | `(value: string) => void` | Yes | Search input change handler |
| `status` | `string` | Yes | Current status filter value |
| `onStatusChange` | `(value: string) => void` | Yes | Status filter change handler |
| `sortBy` | `string` | Yes | Current sort field |
| `onSortByChange` | `(value: string) => void` | Yes | Sort field change handler |
| `sortOrder` | `string` | Yes | Current sort order (`"asc"` or `"desc"`) |
| `onSortOrderToggle` | `() => void` | Yes | Toggle between ascending/descending sort |
| `hasActiveFilters` | `boolean` | No | When `true`, highlights that filters are active |
| `onReset` | `() => void` | No | Resets all filters to their defaults |
| `children` | `ReactNode` | No | Additional filter content (e.g., `TagsFilter`) |

#### Exported Constants

**`PROJECT_SORT_OPTIONS`** — Array of available sort options:

| Value | Label |
|---|---|
| `createdAt` | Created Date |
| `updatedAt` | Updated Date |
| `name` | Name |
| `postsCount` | Posts Count |
| `status` | Status |
| `tagsCount` | Tags Count |

#### Usage

```tsx
<ProjectFilters
  search={search}
  onSearchChange={setSearch}
  status={statusFilter}
  onStatusChange={setStatusFilter}
  sortBy={sortBy}
  onSortByChange={setSortBy}
  sortOrder={sortOrder}
  onSortOrderToggle={toggleSortOrder}
  hasActiveFilters={hasActiveFilters}
  onReset={resetFilters}
>
  <TagsFilter selectedTags={tags} onTagsChange={setTags} />
</ProjectFilters>
```

---

### ProjectCard

**File:** `src/components/projects/ProjectCard.tsx`

A card component displaying a project summary with its tags, post count, and external links.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `project` | `Project` | Yes | Project data to display |
| `onEdit` | `(project: Project) => void` | Yes | Callback when the Edit action is triggered |
| `onDelete` | `(project: Project) => void` | Yes | Callback when the Delete action is triggered |

#### Features

- **Name and description**: Project name is shown prominently; description is truncated to 2 lines.
- **Tags**: Up to 3 tags are displayed inline. If the project has more, a **"+N"** overflow indicator appears.
- **Posts count badge**: Shows the total number of posts associated with the project.
- **External links**: GitHub and demo link icons appear when the respective URLs are set.
- **Actions**: View, Edit, and Delete buttons invoke their corresponding callbacks.

#### Usage

```tsx
<ProjectCard
  project={project}
  onEdit={(p) => { setEditingProject(p); setShowForm(true); }}
  onDelete={(p) => setProjectToDelete(p)}
/>
```

---

## Tag Components

### EditTagDialog

**File:** `src/components/tags/EditTagDialog.tsx`

Dialog for editing a tag name. Uses `useAsyncAction` for double-click protection. Resets form on open. Sends `PUT /api/tags/{id}` with `{ name }`. If name unchanged, just closes.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `tag` | `{ _id: string, name: string }` | Yes | The tag to edit, with its ID and current name |
| `onSuccess` | `(updatedTag: { _id: string, name: string }) => void` | Yes | Callback invoked with the updated tag after a successful edit |

#### Behavior

1. **On open**: The form input is reset to the tag's current name, ensuring stale values are cleared.
2. **If name unchanged**: When the submitted name matches the original, the dialog simply closes without making an API request.
3. **On submit**: Sends `PUT /api/tags/{id}` with `{ name }`.
4. **Double-click protection**: `useAsyncAction` disables the submit button while the request is in-flight, preventing duplicate submissions.
5. **On success**: Calls `onSuccess` with the updated tag object so the parent can update its state.

#### Usage

```tsx
<EditTagDialog
  tag={{ _id: "tag_123", name: "React" }}
  onSuccess={(updatedTag) => {
    setTags((prev) => prev.map((t) => t._id === updatedTag._id ? updatedTag : t));
  }}
/>
```

> **Caveat:** The component manages its own dialog open/close state internally. It renders a trigger element that opens the dialog when clicked.

---

## Settings Components

### TwoFactorSetup

**File:** `src/components/settings/TwoFactorSetup.tsx`

Full 2FA lifecycle management component. Handles enabling, verifying, disabling, and backup code management for two-factor authentication.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `isEnabled` | `boolean` | Yes | Whether 2FA is currently enabled for the user |
| `email` | `string` | Yes | User's email address (displayed during setup) |
| `onStatusChange` | `(enabled: boolean) => void` | Yes | Called when 2FA status changes (enabled or disabled) |

#### Setup Flow Steps

When 2FA is **not yet enabled**, the component walks the user through the following steps:

| Step | Description |
|---|---|
| **idle** | Shows an "Enable 2FA" button. Clicking it initiates the setup flow. |
| **setup** | Displays the QR code (base64-encoded image) and the secret key for manual entry in an authenticator app. |
| **verify** | A 6-digit code input. The user enters the code from their authenticator to verify the setup was successful. |
| **backup-codes** | Displays 8 single-use backup codes. **These are shown only once** — the user is advised to store them securely. |

#### When 2FA Is Enabled

The component renders the following actions:

- **"Disable 2FA" button** — Opens a dialog requiring the user's password and a current 2FA code to disable.
- **"View Backup Codes" button** — Opens a dialog requiring password + 2FA code to display existing backup codes.
- **"Regenerate Backup Codes" button** — Delegates to the `RegenerateBackupCodes` component.
- **"Request disable by email" link** — Allows the user to request a 2FA disable via email recovery if they have lost their authenticator.

#### Usage

```tsx
<TwoFactorSetup
  isEnabled={user.twoFactorEnabled}
  email={user.email}
  onStatusChange={(enabled) => setTwoFactorEnabled(enabled)}
/>
```

> **Caveat:** Backup codes are displayed only during the initial setup and when explicitly requested. Ensure users are prompted to save them.

---

### RegenerateBackupCodes

**File:** `src/components/settings/RegenerateBackupCodes.tsx`

Alert dialog that regenerates 2FA backup codes after confirming the destructive action.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `onSuccess` | `(newCodes: string[]) => void` | Yes | Called with the new array of backup codes after successful regeneration |

#### Behavior

1. Renders a trigger element that opens an alert dialog.
2. The dialog warns that **all previous backup codes will become invalid**.
3. On confirm, sends `POST /api/auth/2fa/regenerate-backup-codes`.
4. On success, calls `onSuccess` with the new backup codes array.
5. On failure, shows an error toast and the dialog remains open.

#### Usage

```tsx
<RegenerateBackupCodes
  onSuccess={(codes) => {
    setBackupCodes(codes);
    setShowBackupCodesDialog(true);
  }}
/>
```

> **Caveat:** This is a destructive operation. The old backup codes are immediately invalidated on the server side. There is no undo.

---

## Dashboard Components

### StatsCard

**File:** `src/components/dashboard/StatsCard.tsx`

Dashboard statistics card with an icon, title, value, and optional description. Used in the dashboard overview to display aggregate metrics.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Label for the statistic (e.g., "Total Posts") |
| `value` | `string \| number` | Yes | The primary value to display |
| `icon` | `ReactNode` | Yes | Icon element rendered alongside the title |
| `description` | `string` | No | Secondary text providing context (e.g., "+12% from last month") |

#### Features

- **Icon integration**: Accepts any React node as an icon, allowing Lucide icons or custom SVGs.
- **Responsive layout**: Stacks vertically on small screens and aligns horizontally on larger breakpoints.
- **Optional description**: When provided, renders beneath the value in a muted style.

#### Usage

```tsx
<StatsCard
  title="Total Posts"
  value={142}
  icon={<FileText className="h-4 w-4" />}
  description="+12% from last month"
/>
```

---

## Shared Components

### ConfirmDialog

**File:** `src/components/shared/ConfirmDialog.tsx`

Reusable confirmation dialog with async action handling, controlled open state, and built-in double-click protection.

#### Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `trigger` | `ReactNode` | Yes | — | Element that opens the dialog when clicked |
| `title` | `string` | Yes | — | Dialog title text |
| `description` | `string` | Yes | — | Dialog description/body text |
| `onConfirm` | `() => Promise<void>` | Yes | — | Async callback executed on confirmation |
| `confirmText` | `string` | No | `"Confirm"` | Label for the confirm button |
| `cancelText` | `string` | No | `"Cancel"` | Label for the cancel button |
| `variant` | `"default" \| "destructive"` | No | `"default"` | Visual style variant for the confirm button |
| `children` | `ReactNode` | No | — | Additional content rendered inside the dialog body |

#### Behavior

- **Controlled open state**: The dialog only closes after the async `onConfirm` handler resolves successfully. If the handler throws, the dialog stays open (Fix #10).
- **Error handling**: On failure, a toast notification is shown and the dialog remains open so the user can retry.
- **Double-click protection**: A `useRef` flag prevents multiple concurrent confirmations, identical to the pattern used by `useAsyncAction`.

#### Usage

```tsx
<ConfirmDialog
  trigger={<Button variant="destructive">Delete Post</Button>}
  title="Delete Post"
  description="Are you sure you want to delete this post? This action cannot be undone."
  onConfirm={async () => await deletePost(post.id)}
  confirmText="Delete"
  variant="destructive"
/>
```

> **Caveat:** The `trigger` element must be a valid clickable element. Avoid passing disabled elements as triggers, as they will not open the dialog.

---

### CopyButton

**File:** `src/components/shared/CopyButton.tsx`

A button that copies a text string to the user's clipboard and provides visual feedback.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | Yes | Text to copy to the clipboard |
| `className` | `string` | No | Additional CSS classes applied to the button |

#### Behavior

- On click, calls `navigator.clipboard.writeText(text)` inside a `try/catch` block (Fix #16). This prevents runtime errors in environments where the Clipboard API is unavailable (e.g., insecure contexts, some mobile browsers).
- After a successful copy, the button label/icon changes to **"Copied!"** for 2 seconds, then reverts.
- On failure, a toast notification informs the user that the copy failed.

#### Usage

```tsx
<CopyButton text={post.content} className="ml-2" />
```

> **Caveat:** The Clipboard API requires a secure context (HTTPS). In development over HTTP, the copy may fail silently or throw — the `try/catch` ensures the app does not crash.

---

### LogoutButton

**File:** `src/components/shared/LogoutButton.tsx`

A multi-variant logout button with confirmation dialog. Ensures the user explicitly confirms before ending their session.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `"sidebar" \| "settings" \| "icon-only"` | No | Display variant (see below) |
| `username` | `string` | No | Username displayed next to the icon (used by `sidebar` variant) |

#### Variants

| Variant | Appearance |
|---|---|
| `sidebar` | Shows the username text alongside a logout icon. Intended for the sidebar footer. |
| `settings` | Full-width button with a "Log out" label. Intended for the settings page. |
| `icon-only` | Displays only the logout icon with no text. Useful in compact layouts. |

#### Behavior

1. Clicking the button opens a `ConfirmDialog` asking "Are you sure you want to log out?"
2. On confirmation, sends `POST /api/auth/logout`.
3. On success, the session is cleared and the user is redirected to the login page.

#### Usage

```tsx
<LogoutButton variant="sidebar" username={user.name} />
<LogoutButton variant="settings" />
<LogoutButton variant="icon-only" />
```

---

### PremiumPagination

**File:** `src/components/shared/PremiumPagination.tsx`

A full-featured pagination component with item count display, per-page selector, and navigable page buttons with ellipsis support.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `totalItems` | `number` | Yes | Total number of items across all pages |
| `currentPage` | `number` | Yes | Currently active page number (1-based) |
| `itemsPerPage` | `number` | Yes | Number of items shown per page |
| `currentItemsCount` | `number` | Yes | Number of items rendered on the current page |
| `onPageChange` | `(page: number) => void` | Yes | Callback when the user navigates to a different page |
| `onLimitChange` | `(limit: number) => void` | Yes | Callback when the per-page limit changes |
| `limitOptions` | `number[]` | No | Available per-page options. Default: `[10, 20, 50]` |

#### Features

- **Item count display**: Shows a summary like "Showing 1-10 of 25 items" based on `totalItems`, `currentPage`, and `itemsPerPage`.
- **Per-page selector**: A dropdown allowing the user to choose how many items to display per page.
- **Navigation buttons**: First (|<), Prev (<), Next (>), and Last (>|) buttons.
- **Page number display**: Renders clickable page numbers with ellipsis (`...`) when the total page count is large, keeping the display compact.
- **Active page highlight**: The current page number is highlighted with an orange indicator.

#### Usage

```tsx
<PremiumPagination
  totalItems={totalCount}
  currentPage={page}
  itemsPerPage={limit}
  currentItemsCount={posts.length}
  onPageChange={setPage}
  onLimitChange={setLimit}
  limitOptions={[10, 20, 50, 100]}
/>
```

> **Caveat:** `currentItemsCount` must reflect the actual number of items rendered on the current page, not the `itemsPerPage` value. On the last page, this may be less than the limit.

---

### TagsFilter

**File:** `src/components/ui/TagsFilter.tsx`

Dropdown multi-select for filtering by tags. Shows selected count. Has search input. Toggle tag selection. "Clear all" button. Closes on outside click.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `availableTags` | `TagOption[]` | Yes | All available tags to display in the dropdown. `TagOption = { _id: string; name: string }` |
| `selectedTagIds` | `string[]` | Yes | Array of currently selected tag IDs |
| `onSelectionChange` | `(tagIds: string[]) => void` | Yes | Callback invoked when the selection changes, receiving the full array of selected tag IDs |

#### Features

- **Selected count badge**: Displays the number of currently selected tags (e.g., "Tags (3)").
- **Search input**: Filters the tag list by name as the user types.
- **Toggle selection**: Clicking a tag in the dropdown toggles its selection state.
- **Clear all button**: Resets the selection to an empty array.
- **Outside click**: Clicking outside the dropdown closes it.

#### Usage

```tsx
<TagsFilter
  availableTags={allTags}
  selectedTagIds={selectedTagIds}
  onSelectionChange={setSelectedTagIds}
/>
```

> **Caveat:** The component is a controlled component — the parent must manage the `selectedTagIds` state. It does not maintain internal selection state.

---

### SortControls

**File:** `src/components/ui/SortControls.tsx`

Reusable sort field selector + ASC/DESC toggle button. Uses `ArrowDownWideNarrow` / `ArrowUpNarrowWide` icons.

#### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `sortBy` | `string` | Yes | Current sort field value |
| `onSortByChange` | `(value: string) => void` | Yes | Callback when the sort field changes |
| `sortOrder` | `"asc" \| "desc"` | Yes | Current sort order direction |
| `onSortOrderToggle` | `() => void` | Yes | Callback to toggle between ascending and descending |
| `options` | `SortOption[]` | Yes | Available sort options. `SortOption = { value: string; label: string }` |

#### Features

- **Sort field selector**: A dropdown populated from the `options` prop allowing the user to choose which field to sort by.
- **ASC/DESC toggle**: A button that toggles between ascending and descending order. Displays `ArrowDownWideNarrow` icon for descending and `ArrowUpNarrowWide` icon for ascending.

#### Usage

```tsx
<SortControls
  sortBy={sortBy}
  onSortByChange={setSortBy}
  sortOrder={sortOrder}
  onSortOrderToggle={toggleSortOrder}
  options={[
    { value: "createdAt", label: "Created Date" },
    { value: "name", label: "Name" },
    { value: "status", label: "Status" },
  ]}
/>
```

> **Caveat:** The `options` array must contain at least one entry. An empty array will result in a non-functional dropdown.
