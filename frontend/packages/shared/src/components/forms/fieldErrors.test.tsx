import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import { ctLightTheme } from '@ct/shared/theme/ctTheme'
import { FieldError, useFieldErrors } from './fieldErrors'

/**
 * F2. The helper's whole job is that a field problem lands ON the field: red
 * border via `invalid`, `aria-invalid` for assistive tech, and a message the
 * input actually points at with `aria-describedby`. Every assertion here is on
 * that wiring rather than on the styling, because the wiring is what a toast
 * could never do.
 */
function Harness({ formId = 'demo' }: { formId?: string }) {
  const [name, setName] = useState('')
  const f = useFieldErrors<'name'>(formId)
  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault()
        f.submit({ name: name.trim() ? undefined : 'Give the account a name.' })
      }}
    >
      <label htmlFor="name-input">Name</label>
      <input
        id="name-input"
        value={name}
        aria-invalid={f.fieldProps('name').invalid}
        aria-describedby={f.fieldProps('name')['aria-describedby']}
        onChange={e => { f.clearField('name'); setName(e.target.value) }}
      />
      <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
      <button type="submit">Save</button>
      <button type="button" onClick={f.reset}>Reset</button>
    </form>
  )
}

function renderHarness(formId?: string) {
  return render(
    <ThemeProvider theme={ctLightTheme}>
      <Harness formId={formId} />
    </ThemeProvider>,
  )
}

const input = () => screen.getByLabelText('Name')

// `globals: false` means vitest never registers RTL's auto-cleanup, so each
// render would otherwise stack another form into the same document.
afterEach(cleanup)

describe('useFieldErrors / FieldError', () => {
  it('renders nothing and sets no aria wiring before a submit attempt', () => {
    renderHarness()
    expect(input().getAttribute('aria-invalid')).toBe('false')
    // Undefined, not '': describedby pointing at an unrendered node is worse
    // than no attribute at all.
    expect(input().hasAttribute('aria-describedby')).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('marks the offending field and announces the reason on submit', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Give the account a name.')
    expect(input().getAttribute('aria-invalid')).toBe('true')
  })

  it('links the input to its message so a screen reader reads it on focus', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const describedBy = input().getAttribute('aria-describedby')
    expect(describedBy).toBe('demo-name-error')
    expect(document.getElementById(describedBy!)).toBe(screen.getByRole('alert'))
  })

  it('namespaces ids by form so two forms on one page cannot collide', async () => {
    const user = userEvent.setup()
    renderHarness('edit-account')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(input().getAttribute('aria-describedby')).toBe('edit-account-name-error')
  })

  it('clears the message as soon as the user corrects the field', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toBeTruthy()

    await user.type(input(), 'HDFC Savings')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(input().getAttribute('aria-invalid')).toBe('false')
    expect(input().hasAttribute('aria-describedby')).toBe(false)
  })

  it('stays clean when a corrected form is submitted again', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.type(input(), 'HDFC Savings')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(input().getAttribute('aria-invalid')).toBe('false')
  })

  it('treats whitespace as empty rather than as a valid name', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.type(input(), '   ')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert').textContent).toBe('Give the account a name.')
  })

  it('reset() wipes every message — this is what reopening a dialog calls', async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
