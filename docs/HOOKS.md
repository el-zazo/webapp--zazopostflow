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

**Returns**: `{ postsByDay, isLoading, getPostsForDay, hasPostsOnDay, getPostCountForDay, refetch }`

### Description

Fetches calendar posts from `/api/posts/calendar?year=X&month=Y` and groups them by day number. Used by the PostDatePicker component to show colored dots on days that have posts.

The hook automatically refetches when the `year` or `month` parameters change.

### Usage

```tsx
const { postsByDay, isLoading, hasPostsOnDay, getPostsForDay } = useDatePickerPosts(2024, 6);

// Check if a specific day has posts
if (hasPostsOnDay(15)) {
  const posts = getPostsForDay(15);
  // render dots or indicators
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
| `postsByDay`          | `Record<number, CalendarPost[]>`   | Object mapping day numbers to their posts                        |
| `isLoading`           | `boolean`                          | Whether the calendar data is currently being fetched             |
| `getPostsForDay`      | `(day: number) => CalendarPost[]`  | Returns the array of posts for a given day (empty array if none) |
| `hasPostsOnDay`       | `(day: number) => boolean`         | Whether a given day has any posts                                |
| `getPostCountForDay`  | `(day: number) => number`          | Number of posts on a given day                                   |
| `refetch`             | `() => void`                       | Manually trigger a refetch of the calendar data                  |

---

## use-mobile

**File**: `src/hooks/use-mobile.ts`

**Returns**: `boolean` — `true` if viewport width is below the mobile breakpoint.

### Description

Responsive breakpoint hook. Uses `window.matchMedia` to detect mobile viewport. Used for responsive sidebar and layout behavior.

This hook listens for changes to the viewport size and updates reactively, so components can adapt in real-time when the window is resized or the device orientation changes.

### Usage

```tsx
const isMobile = useMobile();

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

The hook returns the full shadcn/ui toast state and actions. The most commonly used function is:

| Property | Type                                                                 | Description                        |
|----------|----------------------------------------------------------------------|------------------------------------|
| `toast`  | `(options: { title?: string, description?: string, variant?: "default" \| "destructive" }) => void` | Displays a toast notification      |

For the complete return type, refer to the shadcn/ui toast documentation.

### Notes

- Toasts are automatically dismissed after a timeout.
- Use `variant: "destructive"` for error states to display a red-themed notification.
- Multiple toasts can be displayed simultaneously and are stacked vertically.
