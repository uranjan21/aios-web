/**
 * Field-level validation feedback (F2, 2026-08-16; promoted to `@ct/shared`
 * 2026-08-20).
 *
 * Before this, every form reported failure with a toast — "Failed to create
 * account" — which says THAT something went wrong and never WHICH field. On a
 * four-field dialog the user is guessing, and `required` alone only gets you
 * the browser's native bubble on the first empty field.
 *
 * The split this enforces:
 *   - a FIELD problem (missing, malformed, out of range) is shown on the field,
 *     via `invalid` (red border + `aria-invalid`) and a message tied to the
 *     input with `aria-describedby`, so a screen reader reads the reason when
 *     focus lands there;
 *   - a TRANSPORT/SERVER problem stays a toast, because it belongs to no field.
 *
 * `@ledgr/ui`'s `Input` already supports `invalid`; it has no message slot, so
 * `FieldError` supplies one. This lived twice (`apps/finance` + `apps/health`)
 * because apps may not import each other; `@ct/shared` is the single copy.
 *
 * Usage: mark the form `noValidate`, do explicit checks on submit, and call
 * `clearField` from each `onChange` so a message goes as soon as it is fixed.
 */
import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'

/** Message per field name. A field is valid when its key is absent. */
export type FieldErrorMap<K extends string> = Partial<Record<K, string>>

const Message = styled.p`
  margin: ${({ theme }) => `${theme.spacing[1]} 0 0`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.destructive};
`

/**
 * The message under an invalid field.
 *
 * `role="alert"` so it is announced when it appears after a submit attempt.
 * `id` must match the `aria-describedby` produced by `fieldProps`.
 */
export function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null
  return <Message id={id} role="alert">{children}</Message>
}

export interface UseFieldErrors<K extends string> {
  errors: FieldErrorMap<K>
  /** Spread onto the `Input`: sets `invalid` + `aria-describedby`. */
  fieldProps: (field: K) => { invalid: boolean; 'aria-describedby': string | undefined }
  /** The id to give the matching `FieldError`. */
  errorId: (field: K) => string
  /** Clear one field's message — call from `onChange` so it goes on edit. */
  clearField: (field: K) => void
  /** Record a validation result. Returns true when there is nothing wrong. */
  submit: (found: FieldErrorMap<K>) => boolean
  reset: () => void
}

/**
 * @param formId  Prefix for the generated message ids — must be unique on the
 *                page, or two forms would point `aria-describedby` at the same
 *                element.
 */
export function useFieldErrors<K extends string>(formId: string): UseFieldErrors<K> {
  const [errors, setErrors] = useState<FieldErrorMap<K>>({})

  const errorId = useCallback((field: K) => `${formId}-${field}-error`, [formId])

  const fieldProps = useCallback(
    (field: K) => ({
      invalid: Boolean(errors[field]),
      // Undefined rather than empty string: an aria-describedby pointing at a
      // node that is not rendered is worse than no attribute at all.
      'aria-describedby': errors[field] ? errorId(field) : undefined,
    }),
    [errors, errorId],
  )

  const clearField = useCallback((field: K) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const submit = useCallback((found: FieldErrorMap<K>) => {
    setErrors(found)
    return Object.values(found).every(v => !v)
  }, [])

  const reset = useCallback(() => setErrors({}), [])

  // Memoised: callers put this object (or its members) in useMemo/useCallback
  // dependency arrays, and a fresh object literal every render would silently
  // defeat every one of those memos. Identity now changes only when `errors`
  // actually changes.
  return useMemo(
    () => ({ errors, fieldProps, errorId, clearField, submit, reset }),
    [errors, fieldProps, errorId, clearField, submit, reset],
  )
}
