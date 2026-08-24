# SALMONERIA

TLDR: salmon order allocation dashboard — matches sub orders to warehouse stock by priority, credit, and price, with manual override.

Live: https://salmoneria.motionbi.work/

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test            # unit tests (vitest)
npm run typecheck
```

## Project structure

```
app/          Next.js pages (dashboard shell, layout)
components/   Dialogs, table, credit card, shared ui/ primitives
lib/engine/   Allocation/pricing engine (core logic)
lib/mock/     Deterministic mock data generation
lib/          Types, constants, money & formatting helpers
store/        Zustand store wiring the engine to the UI
tests/        Vitest unit tests, one file per engine concern
```

## Design & credit

Design, architecture, and the allocation/pricing/manual-assign engine (`lib/engine`), state store, and data model are designed and implemented by me. Claude (Anthropic) was used as a coding assistant for cosmetic polish and small utilities (formatting helpers, UI primitive tweaks, this README) — a deliberate demo of AI-assisted prompting, not core logic.

## Data model

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ SUB_ORDER : contains
    CUSTOMER ||--o{ SUB_ORDER : "denormalised on"
    SALMON ||--o{ SUB_ORDER : requests
    SALMON ||--o{ STOCK : "held as"
    WAREHOUSE ||--o{ STOCK : stores
    SUPPLIER ||--o{ STOCK : supplies
    SALMON ||--o{ PRICE : "priced per"
    SUPPLIER ||--o{ PRICE : sets
    SUB_ORDER ||--o{ ALLOCATION : "fulfilled by"
    STOCK ||--o{ ALLOCATION : "drawn from"

    CUSTOMER {
        string id PK
        string name
        number creditLimit
        number creditUsed
    }
    ORDER {
        string id PK
        string customerId FK
    }
    SUB_ORDER {
        string id PK
        string orderId FK
        string customerId FK
        string salmonId FK
        string warehouseId FK
        string supplierId FK
        number requestQty
        number allocatedQty
        number totalAmount
        string priorityType
        string fillStatus
    }
    SALMON {
        string id PK
        string name
    }
    WAREHOUSE {
        string id PK
        string name
    }
    SUPPLIER {
        string id PK
        string name
    }
    STOCK {
        string id PK
        string salmonId FK
        string warehouseId FK
        string supplierId FK
        number qty
    }
    PRICE {
        string id PK
        string salmonId FK
        string supplierId FK
        number price
    }
    ALLOCATION {
        string id PK
        string subOrderId FK
        string salmonId FK
        string warehouseId FK
        string supplierId FK
        number qty
        number unitPrice
        number amount
        string operation
    }
```
