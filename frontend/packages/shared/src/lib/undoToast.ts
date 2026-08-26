import { toast } from 'sonner'

/**
 * Success toast for a delete, carrying an Undo action.
 *
 * Deletes on the financial tables are SOFT since `n001_soft_delete` — the row
 * keeps a `deleted_at` and the account balance effect is reversed, so it can be
 * put back exactly. That only helps a user if something offers to put it back,
 * which is what this does. Without it the restore endpoints have no caller and
 * soft delete is invisible: the user still experiences an irreversible delete.
 *
 * `onUndo` should call the matching `restore*` method. Failure is surfaced as
 * an error toast rather than swallowed — a failed undo means the row is still
 * deleted, and the user has to know that.
 */
export function toastDeletedWithUndo(
  message: string,
  onUndo: () => Promise<unknown>,
  onRestored?: () => void,
) {
  toast.success(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        void onUndo()
          .then(() => {
            toast.success('Restored')
            onRestored?.()
          })
          .catch(() => toast.error('Could not restore — it is still deleted'))
      },
    },
  })
}
