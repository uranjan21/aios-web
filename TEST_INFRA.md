# E2E Test Infra: AIOS Web

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | R1: Domain Syncing for Workspace Entities | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 2 | R2: PageHeader Description Alignment | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 3 | R3: Content Page UI Consistency | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 4 | R4: Collapsible Workspace Sections | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 5 | R5: Dashboard Layout Optimization | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 6 | R6: Interactive Saved Quotes Feature | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 7 | R7: Contextual Quick Capture Button | ORIGINAL_REQUEST | 5 | 5 | ✓ |

## Test Architecture
- Test runner: pytest inside docker container (`docker compose exec backend pytest backend/tests/e2e/test_e2e.py`)
- Test case format: pytest async test cases using `httpx.AsyncClient` representing UI endpoint workflows.
- Directory layout: tests located at `backend/tests/e2e/test_e2e.py`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Content Creator Flow | R3, R7 | Medium |
| 2 | Sprint Planning Flow | R1, R2, R4 | High |
| 3 | Multi-Tenant Complete Isolation Flow | R1, R3, R4 | High |
| 4 | Saved Quotes Management Flow | R6 | Medium |
| 5 | Quick Capture Triage Flow | R7 | Medium |

## Coverage Thresholds
- Tier 1: 5 per feature (Total 35)
- Tier 2: 5 per feature (Total 35)
- Tier 3: pairwise coverage of major feature interactions (Total 7)
- Tier 4: 5 realistic application scenarios (Total 5)
- Total E2E Tests: 82
