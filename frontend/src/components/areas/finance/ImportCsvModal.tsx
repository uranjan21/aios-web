import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Modal, Button, Select, Input, Table, Tag, Checkbox, Steps } from 'antd'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'

dayjs.extend(customParseFormat)

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
    enabled: open,
  })

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

  const includedCount = rows.filter(r => r.include).length

  return (
    <Modal open={open} onCancel={close} footer={null} width={760} title="Import Bank Statement (CSV)">
      <Steps
        size="small"
        current={step}
        items={[{ title: 'Data' }, { title: 'Map Columns' }, { title: 'Preview & Import' }]}
        className="mb-4"
      />

      {step === 0 && (
        <div className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block text-[12px] text-muted-foreground"
            aria-label="Upload CSV file"
          />
          <Input.TextArea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={'…or paste CSV here. First row must be headers, e.g.\nDate,Description,Withdrawal,Deposit\n05/06/2026,SWIGGY BANGALORE,450,'}
            autoSize={{ minRows: 8, maxRows: 14 }}
            className="font-mono text-[12px]"
          />
          <div className="flex justify-end">
            <Button type="primary" disabled={parsed.length < 2} onClick={() => setStep(1)}>
              Next — Map Columns
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Date column</div>
              <Select className="w-full" placeholder="Select" options={colOptions} value={dateCol} onChange={setDateCol} />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Date format</div>
              <Select className="w-full" options={DATE_FORMATS.map(f => ({ label: f, value: f }))} value={dateFormat} onChange={setDateFormat} />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Description column</div>
              <Select className="w-full" placeholder="Select" options={colOptions} value={descCol} onChange={setDescCol} />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Debit / withdrawal column</div>
              <Select className="w-full" placeholder="Select" options={colOptions} value={debitCol} onChange={setDebitCol} />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Credit / deposit column (optional)</div>
              <Select
                className="w-full"
                options={[{ label: 'None — debits only', value: NONE }, ...colOptions.map(o => ({ label: o.label, value: String(o.value) }))]}
                value={creditCol}
                onChange={setCreditCol}
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Link to account (optional, no balance change)</div>
              <Select
                className="w-full" placeholder="No account" allowClear
                options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))}
                value={accountId} onChange={setAccountId}
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {parsed.length - 1} data row(s) detected · headers: {header.join(' · ')}
          </div>
          <div className="flex justify-between">
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button type="primary" loading={checking} onClick={buildPreview}>
              Next — Preview
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
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
                ),
              },
              { title: 'Date', dataIndex: 'logged_at', width: 100, render: (v: string) => dayjs(v).format('MMM D, YYYY') },
              {
                title: 'Type', dataIndex: 'kind', width: 90,
                render: (v: string, row: PreviewRow) => (
                  <div className="flex gap-1">
                    <Tag color={v === 'income' ? 'success' : 'error'}>{v}</Tag>
                    {row.duplicate && <Tag color="warning">dup</Tag>}
                  </div>
                ),
              },
              { title: 'Description', dataIndex: 'description', ellipsis: true },
              { title: 'Amount', dataIndex: 'amount', width: 100, align: 'right' as const, render: (v: number) => formatCurrency(v) },
              {
                title: 'Category', dataIndex: 'category', width: 150,
                render: (v: string | undefined, row: PreviewRow) => (
                  <Select
                    size="small" className="w-full" placeholder="Uncategorized" allowClear
                    value={v}
                    onChange={val => setRows(rs => rs.map(r => r.index === row.index ? { ...r, category: val } : r))}
                    options={[...new Set(['Food', 'Transport', 'Subscriptions', 'Shopping', 'Groceries', 'Rent', 'Utilities', 'Health', 'salary', ...(rows.map(r => r.category).filter(Boolean) as string[])])].map(c => ({ label: c, value: c }))}
                  />
                ),
              },
            ]}
          />
          <div className="flex items-center justify-between">
            <Button onClick={() => setStep(1)}>Back</Button>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">
                {includedCount} of {rows.length} selected · duplicates auto-deselected
              </span>
              <Button
                type="primary" icon={<Upload size={13} />}
                disabled={includedCount === 0} loading={commitMutation.isPending}
                onClick={() => commitMutation.mutate()}
              >
                Import {includedCount} row(s)
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
