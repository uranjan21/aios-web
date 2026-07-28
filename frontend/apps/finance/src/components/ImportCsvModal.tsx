import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Dialog, Button, Select, Textarea, Badge } from '@ledgr/ui'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { formatCurrency } from '@ct/shared/lib/utils'
import styled from 'styled-components'

dayjs.extend(customParseFormat)

/* ── Shared layout primitives ──────────────────────────────────────── */

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FlexEnd = styled.div`
  display: flex;
  justify-content: flex-end;
`

const FlexBetween = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const FlexGap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const Grid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
`

const LabelInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
`

const SelectFull = styled(Select)`
  width: 100%;
`

const FileInput = styled.input`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MonoTextarea = styled(Textarea)`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

/* ── Step indicator ─────────────────────────────────────────────────── */

const StepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 1rem;
`

const StepItem = styled.div<{ $active: boolean; $done: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  flex: 1;
`

const StepDot = styled.div<{ $active: boolean; $done: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  flex-shrink: 0;
  background: ${({ $active, $done, theme }) =>
    $done ? theme.color.primary : $active ? theme.color.primary : theme.color.muted};
  color: ${({ $active, $done, theme }) =>
    $done || $active ? theme.color.primaryForeground : theme.color.mutedForeground};
`

const StepLabel = styled.span<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  color: ${({ $active, theme }) =>
    $active ? theme.color.foreground : theme.color.mutedForeground};
`

const StepConnector = styled.div<{ $done: boolean }>`
  flex: 0 0 24px;
  height: 1px;
  background: ${({ $done, theme }) =>
    $done ? theme.color.primary : theme.color.border};
  margin: ${({ theme }) => `0 ${theme.spacing[1]}`};
  align-self: center;
`

const STEPS = ['Data', 'Map Columns', 'Preview & Import']

function StepIndicator({ current }: { current: number }) {
  return (
    <StepRow>
      {STEPS.map((label, i) => (
        <>
          <StepItem key={i} $active={i === current} $done={i < current}>
            <StepDot $active={i === current} $done={i < current}>
              {i < current ? '✓' : i + 1}
            </StepDot>
            <StepLabel $active={i === current}>{label}</StepLabel>
          </StepItem>
          {i < STEPS.length - 1 && <StepConnector key={`c-${i}`} $done={i < current} />}
        </>
      ))}
    </StepRow>
  )
}

/* ── Preview table ──────────────────────────────────────────────────── */

const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 500;
  white-space: nowrap;
`

const Td = styled.td`
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  vertical-align: middle;
`

const NativeCheckbox = styled.input`
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.color.primary};
`

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  margin-top: ${({ theme }) => `${theme.spacing[1.5]}`};
`

const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 26px;
  height: 26px;
  padding: ${({ theme }) => `0 ${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-radius: ${({ theme }) => theme.radii.xs};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.color.primary : theme.color.border)};
  background: ${({ $active, theme }) => ($active ? theme.color.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.color.primaryForeground : theme.color.foreground)};
  cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`

/* ── Business logic types + helpers ────────────────────────────────── */

const DATE_FORMATS = ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/swiggy|zomato|restaurant|cafe|food/i, 'Food'],
  [/uber|ola|rapido|metro|fuel|petrol/i, 'Transport'],
  [/netflix|spotify|prime|hotstar|subscription|apple/i, 'Subscriptions'],
  [/amazon|flipkart|myntra|shopping/i, 'Shopping'],
  [/bigbasket|blinkit|zepto|grocery|groceries|dmart/i, 'Groceries'],
  [/rent/i, 'Rent'],
  [/electricity|water bill|gas|broadband|airtel|jio|recharge/i, 'Utilities'],
  [/pharmacy|hospital|clinic|medical/i, 'Health'],
  [/salary|payroll/i, 'salary'],
]

export function guessCategory(desc: string): string | undefined {
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(desc)) return cat
  }
  return undefined
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(c => c.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(c => c.trim() !== '')) rows.push(row)
  return rows
}

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.abs(n)
}

type PreviewRow = {
  index: number
  include: boolean
  duplicate: boolean
  kind: 'expense' | 'income'
  logged_at: string
  description: string
  amount: number
  category?: string
}

const NONE = '__none__'
const PAGE_SIZE = 8

/* ── Component ──────────────────────────────────────────────────────── */

export function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [rawText, setRawText] = useState('')
  const [dateCol, setDateCol] = useState<number | undefined>()
  const [descCol, setDescCol] = useState<number | undefined>()
  const [debitCol, setDebitCol] = useState<number | undefined>()
  const [creditCol, setCreditCol] = useState<string>(NONE)
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [accountId, setAccountId] = useState<string | undefined>()
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [checking, setChecking] = useState(false)
  const [page, setPage] = useState(0)

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    enabled: open,
  })

  const { data: allCategories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories(),
    enabled: open,
    staleTime: 60_000,
  })
  const categoryNames = (allCategories ?? [])
    .filter(c => c.parent_id === null)
    .map(c => c.name)

  const parsed = useMemo(() => (rawText.trim() ? parseCsv(rawText) : []), [rawText])
  const header = parsed[0] ?? []
  const colOptions = header.map((h, i) => ({ label: h || `Column ${i + 1}`, value: String(i) }))

  const reset = () => {
    setStep(0); setRawText(''); setDateCol(undefined); setDescCol(undefined)
    setDebitCol(undefined); setCreditCol(NONE); setRows([]); setPage(0)
  }
  const close = () => { reset(); onClose() }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setRawText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const buildPreview = async () => {
    if (dateCol === undefined || descCol === undefined || debitCol === undefined) {
      toast.error('Map the date, description and debit columns first')
      return
    }
    const credit = creditCol === NONE ? undefined : Number(creditCol)
    const out: PreviewRow[] = []
    for (let r = 1; r < parsed.length; r++) {
      const cells = parsed[r]
      const d = dayjs(cells[dateCol]?.trim(), dateFormat, true)
      if (!d.isValid()) continue
      const desc = (cells[descCol] ?? '').trim()
      const debit = parseAmount(cells[debitCol] ?? '')
      const creditVal = credit !== undefined ? parseAmount(cells[credit] ?? '') : 0
      if (debit <= 0 && creditVal <= 0) continue
      const kind: 'expense' | 'income' = debit > 0 ? 'expense' : 'income'
      out.push({
        index: out.length, include: true, duplicate: false, kind,
        logged_at: d.format('YYYY-MM-DD') + 'T00:00:00',
        description: desc, amount: debit > 0 ? debit : creditVal,
        category: guessCategory(desc),
      })
    }
    if (out.length === 0) {
      toast.error('No valid rows found — check column mapping and date format')
      return
    }
    setChecking(true)
    try {
      const { duplicates } = await financeApi.importCheck(
        out.map(r => ({ logged_at: r.logged_at, amount: r.amount, kind: r.kind, description: r.description }))
      )
      const dupSet = new Set(duplicates)
      setRows(out.map(r => dupSet.has(r.index) ? { ...r, duplicate: true, include: false } : r))
      setStep(2); setPage(0)
    } catch {
      toast.error('Duplicate check failed')
    } finally {
      setChecking(false)
    }
  }

  const commitMutation = useMutation({
    mutationFn: () => financeApi.importCommit(
      rows.filter(r => r.include).map(r => ({
        logged_at: r.logged_at, amount: r.amount, kind: r.kind,
        category: r.category, description: r.description,
      })),
      accountId,
    ),
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported_expenses} expense(s), ${res.imported_income} income row(s)${res.skipped ? `, ${res.skipped} skipped` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      close()
    },
    onError: () => toast.error('Import failed'),
  })

  const toggleRow = (index: number, checked: boolean) =>
    setRows(rs => rs.map(r => r.index === index ? { ...r, include: checked } : r))

  const setRowCategory = (index: number, cat: string) =>
    setRows(rs => rs.map(r => r.index === index ? { ...r, category: cat } : r))

  const includedCount = rows.filter(r => r.include).length
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close() }} title="Import Bank Statement (CSV)" size="xl">
      <StepIndicator current={step} />

      {step === 0 && (
        <Stack>
          <FileInput
            type="file"
            accept=".csv,text/csv"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            aria-label="Upload CSV file"
          />
          <MonoTextarea
            value={rawText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRawText(e.target.value)}
            placeholder={'…or paste CSV here. First row must be headers, e.g.\nDate,Description,Withdrawal,Deposit\n05/06/2026,SWIGGY BANGALORE,450,'}
            rows={8}
          />
          <FlexEnd>
            <Button variant="primary" disabled={parsed.length < 2} onClick={() => setStep(1)}>
              Next — Map Columns
            </Button>
          </FlexEnd>
        </Stack>
      )}

      {step === 1 && (
        <Stack>
          <Grid2Col>
            <div>
              <LabelInfo>Date column</LabelInfo>
              <SelectFull
                placeholder="Select"
                options={colOptions}
                value={dateCol !== undefined ? String(dateCol) : undefined}
                onChange={(v: string | number) => setDateCol(Number(v))}
              />
            </div>
            <div>
              <LabelInfo>Date format</LabelInfo>
              <SelectFull
                options={DATE_FORMATS.map(f => ({ label: f, value: f }))}
                value={dateFormat}
                onChange={(v: string | number) => setDateFormat(String(v))}
              />
            </div>
            <div>
              <LabelInfo>Description column</LabelInfo>
              <SelectFull
                placeholder="Select"
                options={colOptions}
                value={descCol !== undefined ? String(descCol) : undefined}
                onChange={(v: string | number) => setDescCol(Number(v))}
              />
            </div>
            <div>
              <LabelInfo>Debit / withdrawal column</LabelInfo>
              <SelectFull
                placeholder="Select"
                options={colOptions}
                value={debitCol !== undefined ? String(debitCol) : undefined}
                onChange={(v: string | number) => setDebitCol(Number(v))}
              />
            </div>
            <div>
              <LabelInfo>Credit / deposit column (optional)</LabelInfo>
              <SelectFull
                options={[{ label: 'None — debits only', value: NONE }, ...colOptions]}
                value={creditCol}
                onChange={(v: string | number) => setCreditCol(String(v))}
              />
            </div>
            <div>
              <LabelInfo>Link to account (optional)</LabelInfo>
              <SelectFull
                placeholder="No account"
                options={(accounts ?? []).map((a: { id: string; name: string }) => ({ label: a.name, value: a.id }))}
                value={accountId}
                onChange={(v: string | number) => setAccountId(String(v))}
              />
            </div>
          </Grid2Col>
          <LabelInfo>
            {parsed.length - 1} data row(s) detected · headers: {header.join(' · ')}
          </LabelInfo>
          <FlexBetween>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="primary" loading={checking} onClick={buildPreview}>
              Next — Preview
            </Button>
          </FlexBetween>
        </Stack>
      )}

      {step === 2 && (
        <Stack>
          <div style={{ overflowX: 'auto' }}>
            <PreviewTable>
              <thead>
                <tr>
                  <Th style={{ width: 36 }}></Th>
                  <Th style={{ width: 100 }}>Date</Th>
                  <Th style={{ width: 90 }}>Type</Th>
                  <Th>Description</Th>
                  <Th style={{ width: 100, textAlign: 'right' }}>Amount</Th>
                  <Th style={{ width: 150 }}>Category</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.index}>
                    <Td>
                      <NativeCheckbox
                        type="checkbox"
                        checked={row.include}
                        onChange={e => toggleRow(row.index, e.target.checked)}
                        aria-label={`Include row ${row.index + 1}`}
                      />
                    </Td>
                    <Td>{dayjs(row.logged_at).format('MMM D, YYYY')}</Td>
                    <Td>
                      <FlexGap style={{ gap: 4 }}>
                        <Badge tone={row.kind === 'income' ? 'success' : 'destructive'}>{row.kind}</Badge>
                        {row.duplicate && <Badge tone="warning">dup</Badge>}
                      </FlexGap>
                    </Td>
                    <Td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.description}
                    </Td>
                    <Td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</Td>
                    <Td>
                      <SelectFull
                        size="sm"
                        placeholder="Uncategorized"
                        value={row.category}
                        onChange={(v: string | number) => setRowCategory(row.index, String(v))}
                        options={categoryNames.map(c => ({ label: c, value: c }))}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </PreviewTable>
          </div>

          {totalPages > 1 && (
            <PaginationRow>
              <PageBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</PageBtn>
              {Array.from({ length: totalPages }, (_, i) => (
                <PageBtn key={i} $active={i === page} onClick={() => setPage(i)}>
                  {i + 1}
                </PageBtn>
              ))}
              <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</PageBtn>
            </PaginationRow>
          )}

          <FlexBetween>
            <Button onClick={() => setStep(1)}>Back</Button>
            <FlexGap>
              <LabelInfo style={{ marginBottom: 0 }}>
                {includedCount} of {rows.length} selected · duplicates auto-deselected
              </LabelInfo>
              <Button
                variant="primary"
                startIcon={<Upload size={13} />}
                disabled={includedCount === 0}
                loading={commitMutation.isPending}
                onClick={() => commitMutation.mutate()}
              >
                Import {includedCount} row(s)
              </Button>
            </FlexGap>
          </FlexBetween>
        </Stack>
      )}
    </Dialog>
  )
}
