export type PriorityType = "EMERGENCY" | "OVER_DUE" | "DAILY";

export type FillStatus = "FULL" | "PARTIAL" | "NONE";

export type Operation = "AUTO" | "MANUAL";

export interface Customer {
  id: string; // PK

  name: string;
  creditLimit: number;
  creditUsed: number;
}

export interface Warehouse {
  id: string; //PK

  name: string;
}

export interface Supplier {
  id: string; //PK
  name: string;
}

export interface Salmon {
  id: string; //PK

  name: string;
}

export interface Stock {
  id: string; // PK
  salmonId: string; //FK
  warehouseId: string; //FK
  supplierId: string; //FK

  qty: number; // whole units integer
}

// price is depended on per supplier
export interface Price {
  id: string; //PK
  salmonId: string; // FK
  supplierId: string; //FK
  price: number;
}

// just a group of "SubOrder"
export interface Order {
  id: string; // PK
  customerId: string; // FK
}

// actual line of order
export interface SubOrder {
  id: string; //PK
  orderId: string; //FK
  customerId: string; // FK denormalised from "Order"
  salmonId: string; // FK
  warehouseId: string; //FK WH-000 means any
  supplierId: string; //FK SP-000 means any

  requestQty: number; // whole units integer
  allocatedQty: number; //sum of allocation qty, whole units integer
  totalAmount: number; //sum of allocation amount
  priorityType: PriorityType; // "EMERGENCY" | "OVER_DUE" | "DAILY";
  fillStatus: FillStatus; // "FULL" | "PARTIAL" | "NONE";
  remark?: string;

  createdAt: string; //ISO for FIFO ordering
}

export interface Allocation {
  id: string; //PK
  subOrderId: string; //FK
  salmonId: string; //FK
  warehouseId: string; //FK
  supplierId: string; // FK

  qty: number; // whole units integer
  unitPrice: number;
  amount: number;
  operation: Operation; // "AUTO" | "MANUAL"
}
