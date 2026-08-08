/**
 * Search the food catalogue and turn a portion into macros.
 *
 * Before this, logging a meal meant typing calories AND all three macros by
 * hand every time — which is the friction that stops meal tracking sticking.
 * The catalogue (~50 common Indian foods, per-100g) has existed in the schema
 * since 2026-06 but was truncated by the multi-tenancy migration and had no
 * write endpoint or UI, so nothing ever read it.
 *
 * Catalogue macros are PER 100g. `serving_grams` is what makes "2 rotis"
 * meaningful: pick a food, type a quantity in servings, and the grams and
 * macros follow. A food with no known serving weight falls back to grams, so
 * the quantity box never silently means something different from what it says.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { Input } from '@ledgr/ui'
import { Search } from 'lucide-react'
import { healthApi } from '@ct/shared/api/areas'
import type { FoodDbItem as FoodItem } from '@ct/shared/types'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Results = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
`

const Result = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.muted : 'transparent')};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${({ theme }) => theme.color.muted}; }
`

const FoodName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Macro = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
`

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const QtyRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};
`

export interface ResolvedMeal {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Scale a per-100g catalogue entry to the chosen number of grams. */
export function scaleFood(food: FoodItem, grams: number): ResolvedMeal {
  const f = grams / 100
  const round1 = (n: number) => Math.round(n * 10) / 10
  return {
    food_name: food.name,
    calories: Math.round(food.calories * f),
    protein: round1(food.protein * f),
    carbs: round1(food.carbs * f),
    fat: round1(food.fat * f),
  }
}

export function FoodPicker({ onPick }: { onPick: (meal: ResolvedMeal) => void }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<FoodItem | null>(null)
  const [qty, setQty] = useState('1')

  const { data: foods, isLoading } = useQuery({
    queryKey: ['health', 'foods', q],
    queryFn: () => healthApi.foods(q || undefined),
    staleTime: 5 * 60_000,
  })

  /* Servings when the food declares a portion weight, grams otherwise —
     "1.5" has to mean the same thing as the label beside it says. */
  const perServing = picked?.serving_grams ?? null
  const grams = perServing ? (Number(qty) || 0) * perServing : (Number(qty) || 0)

  const choose = (food: FoodItem) => {
    setPicked(food)
    const g = food.serving_grams ?? 100
    setQty('1')
    onPick(scaleFood(food, g))
  }

  const changeQty = (v: string) => {
    setQty(v)
    if (!picked) return
    const g = picked.serving_grams ? (Number(v) || 0) * picked.serving_grams : (Number(v) || 0)
    onPick(scaleFood(picked, g))
  }

  return (
    <Wrap>
      <Input
        value={q}
        onChange={(e: any) => setQ(e.target.value)}
        placeholder="Search foods — roti, dal, paneer…"
        startAdornment={<Search size={14} />}
        aria-label="Search the food catalogue"
      />

      {isLoading ? (
        <Hint>Loading catalogue…</Hint>
      ) : !(foods ?? []).length ? (
        <Hint>
          {q
            ? `Nothing matching "${q}". Fill the fields below and it logs as a one-off.`
            : 'Your food catalogue is empty.'}
        </Hint>
      ) : (
        <Results>
          {(foods ?? []).map((f) => (
            <Result
              key={f.id}
              $active={picked?.id === f.id}
              onClick={() => choose(f)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(f) } }}
            >
              <FoodName>{f.name}{f.is_custom ? ' · yours' : ''}</FoodName>
              <Macro>{Math.round(f.calories)} kcal · {f.protein}g P{f.serving_desc ? ` · ${f.serving_desc}` : ''}</Macro>
            </Result>
          ))}
        </Results>
      )}

      {picked && (
        <QtyRow>
          <div>
            <Hint>{perServing ? `Servings (${picked.serving_desc ?? '1 serving'})` : 'Grams'}</Hint>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={qty}
              onChange={(e: any) => changeQty(e.target.value)}
              aria-label={perServing ? 'Number of servings' : 'Grams'}
            />
          </div>
          <div>
            <Hint>Works out as</Hint>
            <Hint>{Math.round(grams)}g · {scaleFood(picked, grams).calories} kcal</Hint>
          </div>
        </QtyRow>
      )}
    </Wrap>
  )
}
