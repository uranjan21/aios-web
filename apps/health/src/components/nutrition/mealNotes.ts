export interface ParsedMeal {
  food_name: string
  protein: number
  carbs: number
  fat: number
  meal_type: string
}

export function parseMealNotes(notes: string | null): ParsedMeal {
  if (!notes) return { food_name: 'Meal', protein: 0, carbs: 0, fat: 0, meal_type: 'snack' }
  try {
    return JSON.parse(notes) as ParsedMeal
  } catch {
    return { food_name: notes, protein: 0, carbs: 0, fat: 0, meal_type: 'snack' }
  }
}
