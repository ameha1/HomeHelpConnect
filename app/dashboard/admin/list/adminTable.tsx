// components/AdminsTable.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "../../../../components/ui/data-table"
import { Shield, ShieldCheck } from "lucide-react"

export type Admin = {
  id: string
  email: string
  full_name: string
  is_super_admin: boolean
  created_at: string
}

const columns: ColumnDef<Admin>[] = [
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "full_name",
    header: "Name",
  },
  {
    accessorKey: "is_super_admin",
    header: "Role",
    cell: ({ row }) => (
      <div className="flex items-center">
        {row.getValue("is_super_admin") ? (
          <>
            <ShieldCheck className="w-4 h-4 mr-2 text-yellow-500" />
            <span>Super Admin</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2 text-blue-500" />
            <span>Admin</span>
          </>
        )}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleDateString(),
  },
]

export function AdminsTable({ data }: { data: Admin[] }) {
  return <DataTable columns={columns} data={data} />
}