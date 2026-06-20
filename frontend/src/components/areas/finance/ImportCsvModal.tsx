// @ts-nocheck
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Table, Checkbox, Steps } from "antd"
import { Dialog, Button, Select, Input, Textarea, Badge } from "@ledgr/ui"
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import styled from 'styled-components'

dayjs.extend(customParseFormat)

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const StepContainer = styled.div`
  margin-bottom: 1rem;
`

const FileInput = styled.input`
  display: block;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MonoTextarea = styled(Textarea)`
  font-size: 12px;
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

const FlexGapSmall = styled.div`
  display: flex;
  gap: 0.25rem;
`

const Grid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
`

const LabelInfo = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
`

const SelectFull = styled(Select)`
  width: 100%;
`

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

/** Minimal CSV parser with quoted-field support. */
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

export function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [rawText, setRawText] = useState('')
  const [dateCol, setDateCol] = useState<number>()
  const [descCol, setDescCol] = useState<number>()
  const [debitCol, setDebitCol] = useState<number>()
  const [creditCol, setCreditCol] = useState<string>(NONE)
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [accountId, setAccountId] = useState<string>()
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [checking, setChecking] = useState(false)

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    enabled: open })

  const parsed = useMemo(() => (rawText.trim() ? parseCsv(rawText) : []), [rawText])
  const header = parsed[0] ?? []
  const colOptions = header.map((h, i) => ({ label: h || `Column ${i + 1}`, value: i }))

  const reset = () => {
    setStep(0); setRawText(''); setDateCol(undefined); setDescCol(undefined)
    setDebitCol(undefined); setCreditCol(NONE); setRows([])
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
        category: guessCategory(desc) })
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
      setStep(2)
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
        category: r.category, description: r.description })),
      accountId,
    ),
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported_expenses} expense(s), ${res.imported_income} income row(s)${res.skipped ? `, ${res.skipped} skipped` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      close()
    },
    onError: () => toast.error('Import failed') })

  const includedCount = rows.filter(r => r.include).length

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close() }} title="Import Bank Statement (CSV)">
      
      <StepContainer>
        <Steps
          size="small"
          current={step}
          items={[{ title: 'Data' }, { title: 'Map Columns' }, { title: 'Preview & Import' }]}
        />
      </StepContainer>

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
            onChange={e => setRawText(e.target.value)}
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
              <SelectFull placeholder="Select" options={colOptions.map(o => ({...o, value: String(o.value)}))} value={dateCol !== undefined ? String(dateCol) : undefined} onChange={v => setDateCol(Number(v))} />
            </div>
            <div>
              <LabelInfo>Date format</LabelInfo>
              <SelectFull options={DATE_FORMATS.map(f => ({ label: f, value: f }))} value={dateFormat} onChange={setDateFormat} />
            </div>
            <div>
              <LabelInfo>Description column</LabelInfo>
              <SelectFull placeholder="Select" options={colOptions.map(o => ({...o, value: String(o.value)}))} value={descCol !== undefined ? String(descCol) : undefined} onChange={v => setDescCol(Number(v))} />
            </div>
            <div>
              <LabelInfo>Debit / withdrawal column</LabelInfo>
              <SelectFull placeholder="Select" options={colOptions.map(o => ({...o, value: String(o.value)}))} value={debitCol !== undefined ? String(debitCol) : undefined} onChange={v => setDebitCol(Number(v))} />
            </div>
            <div>
              <LabelInfo>Credit / deposit column (optional)</LabelInfo>
              <SelectFull
                options={[{ label: 'None — debits only', value: NONE }, ...colOptions.map(o => ({ label: o.label, value: String(o.value) }))]}
                value={creditCol}
                onChange={setCreditCol}
              />
            </div>
            <div>
              <LabelInfo>Link to account (optional, no balance change)</LabelInfo>
              <SelectFull
                placeholder="No account"
                options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))}
                value={accountId} onChange={setAccountId}
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
          <Table
            dataSource={rows}
            rowKey="index"
            size="small"
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            scroll={{ x: true }}
            columns={[
              {
                title: '', dataIndex: 'include', width: 40,
                render: (_: boolean, row: PreviewRow) => (
                  <Checkbox
                    checked={row.include}
                    onChange={e => setRows(rs => rs.map(r => r.index === row.index ? { ...r, include: e.target.checked } : r))}
                  />
                ) },
              { title: 'Date', dataIndex: 'logged_at', width: 100, render: (v: string) => dayjs(v).format('MMM D, YYYY') },
              {
                title: 'Type', dataIndex: 'kind', width: 90,
                render: (v: string, row: PreviewRow) => (
                  <FlexGapSmall>
                    <Badge tone={v === "income" ? "success" : "critical"}>{v}</Badge>
                    {row.duplicate && <Badge tone="warning">dup</Badge>}
                  </FlexGapSmall>
                ) },
              { title: 'Description', dataIndex: 'description', ellipsis: true },
              { title: 'Amount', dataIndex: 'amount', width: 100, align: 'right' as const, render: (v: number) => formatCurrency(v) },
              {
                title: 'Category', dataIndex: 'category', width: 150,
                render: (v: string | undefined, row: PreviewRow) => (
                  <SelectFull
                    size="sm" placeholder="Uncategorized"
                    value={v}
                    onChange={val => setRows(rs => rs.map(r => r.index === row.index ? { ...r, category: val } : r))}
                    options={[...new Set(['Food', 'Transport', 'Subscriptions', 'Shopping', 'Groceries', 'Rent', 'Utilities', 'Health', 'salary', ...(rows.map(r => r.category).filter(Boolean) as string[])])].map(c => ({ label: c, value: c }))}
                  />
                ) },
            ]}
          />
          <FlexBetween>
            <Button onClick={() => setStep(1)}>Back</Button>
            <FlexGap>
              <LabelInfo style={{ marginBottom: 0 }}>
                {includedCount} of {rows.length} selected · duplicates auto-deselected
              </LabelInfo>
              <Button
                variant="primary" icon={<Upload size={13} />}
                disabled={includedCount === 0} loading={commitMutation.isPending}
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
