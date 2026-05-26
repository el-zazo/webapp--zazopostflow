# Custom React Hooks

ZazoPostFlow provides a set of custom React hooks for common patterns like async operations, calendar data fetching, responsive breakpoints, and toast notifications.

---

## Table of Contents

- [useAsyncAction](#useasyncaction)
- [useDatePickerPosts](#usedatepickerposts)
- [use-mobile](#use-mobile)
- [use-toast](#use-toast)

---

## useAsyncAction

**File**: `src/hooks/useAsyncAction.ts`

**Returns**: `{ isLoading: boolean, execute: (action: () => Promise<void>) => Promise<void> }`

### Description

Provides loading state and double-click protection for async operations. Uses a `useRef` instead of `useState` for the guard flag (Fix #8) — the ref updates synchronously before React re-render, preventing stale closure double-submits that could occur with `useState`.

When a user clicks a button that triggers an async action, there is a window of time between the click and the next React render where `isLoading` would still be `false` if `useState` were used. By using `useRef`, the guard flag is set immediately in the same tick, ensuring that rapid double-clicks are blocked before the component even re-renders.

### Usage

```tsx
const { isLoading, execute } = useAsyncAction();

const handleSubmit = () => {
  execute(async () => {
    await apiFetch("/api/posts", { method: "POST", body: JSON.stringify(data) });
  });
};

return <Button disabled={isLoading} onClick={handleSubmit}>Submit</Button>;
```

### Parameters

None.

### Return Values

| Property   | Type                                        | Description                                          |
|------------|---------------------------------------------|------------------------------------------------------|
| `isLoading` | `boolean`                                  | Whether an async action is currently in progress     |
| `execute`   | `(action: () => Promise<void>) => Promise<void>` | Wraps an async action with loading state and double-click protection |

### Notes

- Only one action can be in-flight at a time. Subsequent calls to `execute` while an action is running are silently ignored.
- The `isLoading` state is automatically set back to `false` when the action completes or throws.

---

## useDatePickerPosts

**File**: `src/hooks/useDatePickerPosts.ts`

**Params**: `(year: number, month: number)`

**Returns**: `{ countsByDay, dayPosts, loadingCounts, loadingDayPosts, hasPostsOnDay, getPostCountForDay, fetchDayPosts, refetchCounts }`

### Description

Fetches post COUNTS per day from `/api/posts/calendar` and provides a function to fetch full post objects for specific days via `/api/posts/calendar/day`. Used by PostDatePicker to show colored dots on days that have posts.

The hook fetches counts from `GET /api/posts/calendar?year=&month=` (returns `Record<string, number>`) and fetches day posts from `GET /api/posts/calendar/day?year=&month=&day=` (returns `CalendarPost[]`).

A `useEffect` re-fetches counts when `year` or `month` changes; it also resets `dayPosts` to `[]`.

### Usage

```tsx
const { countsByDay, loadingCounts, hasPostsOnDay, getPostCountForDay, fetchDayPosts } = useDatePickerPosts(2024, 6);

// Check if a specific day has posts
if (hasPostsOnDay(15)) {
  const count = getPostCountForDay(15); // returns number
  await fetchDayPosts(15); // fetches full posts for day 15
}
```

### Parameters

| Parameter | Type     | Description                       |
|-----------|----------|-----------------------------------|
| `year`    | `number` | The calendar year (e.g. `2024`)   |
| `month`   | `number` | The calendar month (1-12)         |

### Return Values

| Property              | Type                               | Description                                                      |
|-----------------------|------------------------------------|------------------------------------------------------------------|
| `countsByDay`         | `Record<string, number>`           | Object mapping day numbers (as strings) to post counts           |
| `dayPosts`            | `CalendarPost[]`                   | Posts for a specific fetched day (starts empty)                  |
| `loadingCounts`       | `boolean`                          | Whether count data is currently being fetched                    |
| `loadingDayPosts`     | `boolean`                          | Whether day-specific posts are being fetched                     |
| `hasPostsOnDay`       | `(day: number) => boolean`         | Whether a given day has any posts (based on counts)              |
| `getPostCountForDay`  | `(day: number) => number`          | Number of posts on a given day                                   |
| `fetchDayPosts`       | `(day: number) => Promise<void>`   | Fetches full post objects for a specific day                     |
| `refetchCounts`       | `() => Promise<void>`              | Manually refetch the counts data                                 |

### CalendarPost Interface

The exported `CalendarPost` interface includes the following fields:

| Field             | Type     | Description                          |
|-------------------|----------|--------------------------------------|
| `_id`             | `string` | Post ID                              |
| `name`            | `string` | Post name                            |
| `content`         | `string` | Post content                         |
| `status`          | `string` | Post status                          |
| `type`            | `string` | Post type                            |
| `platform`        | `string` | Target platform                      |
| `has_images`      | `boolean`| Whether the post has images          |
| `has_videos`      | `boolean`| Whether the post has videos          |
| `scheduled_date`  | `string` | Scheduled publication date           |
| `published_date`  | `string` | Actual publication date              |
| `project_id`      | `string` | Associated project ID                |
| `projectName`     | `string` | Project name (optional)              |
| `createdAt`       | `string` | Creation timestamp                   |
| `updatedAt`       | `string` | Last update timestamp                |

---

## use-mobile

**File**: `src/hooks/use-mobile.ts`

**Returns**: `boolean` — `true` if viewport width is below the mobile breakpoint.

### Description

Responsive breakpoint hook. Uses `window.matchMedia` to detect mobile viewport (MOBILE_BREAKPOINT = 768px, matching max-width: 767px). Used for responsive sidebar and layout behavior.

This hook listens for changes to the viewport size and updates reactively, so components can adapt in real-time when the window is resized or the device orientation changes.

**Note**: Returns `false` on first render before the effect runs (initial state `undefined` → `!!undefined` = `false`).

### Usage

```tsx
const isMobile = useIsMobile();

return (
  <div>
    {isMobile ? <MobileSidebar /> : <DesktopSidebar />}
  </div>
);
```

### Parameters

None.

### Return Values

| Type      | Description                                           |
|-----------|-------------------------------------------------------|
| `boolean` | `true` if the current viewport is below the mobile breakpoint, `false` otherwise |

---

## use-toast

**File**: `src/hooks/use-toast.ts`

**Returns**: Toast state and action functions from shadcn/ui toast system.

### Description

Standard shadcn/ui toast hook. Used throughout the app for success/error notifications. This hook is a thin wrapper around the shadcn/ui toast provider, providing a simple API for displaying transient notifications to the user.

Only one toast is visible at a time (TOAST_LIMIT = 1). New toasts replace the previous one.

### Usage

```tsx
const { toast } = useToast();

const handleSave = async () => {
  try {
    await savePost(data);
    toast({
      title: "Post saved",
      description: "Your post has been saved successfully.",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save the post.",
      variant: "destructive",
    });
  }
};
```

### Parameters

None.

### Return Values

| Property  | Type                                                                                                                                 | Description                                                     |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| `toasts`  | `Toast[]`                                                                                                                            | Array of currently active toasts                                |
| `toast`   | `(options: { title?: string, description?: string, variant?: "default" \| "destructive" }) => { id: string, dismiss: () => void, update: (props: ToasterToast) => void }` | Displays a toast notification; returns id, dismiss, and update  |
| `dismiss` | `(toastId?: string) => void`                                                                                                         | Dismiss a specific toast (or all toasts if no ID provided)      |

### Notes

- Toasts are automatically dismissed after a timeout (TOAST_REMOVE_DELAY = 1000000 ms, ~16.67 minutes).
- Use `variant: "destructive"` for error states to display a red-themed notification.
- Only one toast is visible at a time (TOAST_LIMIT = 1). New toasts replace the previous one.
