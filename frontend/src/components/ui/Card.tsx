/**
 * Canonical Card surface for the whole app.
 *
 * Single source of truth = @ledgr/ui's Card system. Every area page should import
 * its card surface from here (or from @ledgr/ui directly) and must NOT roll its
 * own `styled.div` card container — that is what caused the cross-area visual
 * drift in padding / radius / border / header treatment.
 *
 * Usage:
 *   import { Card } from '@/components/ui/Card'
 *   <Card title="Recurring Bills" action={<Button.../>}>…</Card>
 *
 *   // or compose manually:
 *   <Card noPadding>
 *     <CardHeader><CardTitle>…</CardTitle></CardHeader>
 *     <CardContent>…</CardContent>
 *   </Card>
 */
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@ledgr/ui'
export type { CardProps, CardVariant } from '@ledgr/ui'
