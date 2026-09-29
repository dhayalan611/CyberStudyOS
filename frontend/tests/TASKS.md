# Tasks verification

The `/tasks` page uses the existing Tasks API. Start the backend and frontend using their existing development commands.

1. Open Tasks from the sidebar. With an empty database, expect an invitation to create a task; counts should be zero.
2. Create a task with title, category, description, priority, status, and a local due date. Reload and confirm all fields persist and the due time matches what you entered.
3. Edit the title without changing the date. Confirm the due instant stays unchanged. Clear the description and due date, save, and reload to confirm they are cleared.
4. Complete a task, then reopen it. Confirm the status and counters update and completed tasks sort last. Edit a task to In Progress.
5. Combine search, category, status, priority, and overdue filters. Completed tasks never count as overdue. Clear filters to restore the full list.
6. Verify an empty search result is distinct from an empty task list. Create a past-due task to check its overdue label.
7. Stop the backend and reload: expect an error and Retry. Restart it and retry. A failed save should leave the form open with its input intact.
8. Use keyboard navigation: the editor traps focus; Escape closes it when idle; focus returns to the trigger. Check the layout at mobile width.

Automated API contract, ordering, and date checks: `node --test tests/tasks.test.mjs` from `frontend`. These mock fetch and do not create persistent records. Browser interactions require the manual checks above.
