"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  GroupingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Plus, Search, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onNewMessage: () => void
  isLoading?: boolean
}

export function MessagesDataTable<TData, TValue>({
  columns,
  data,
  onNewMessage,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "scheduledFor", desc: false }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [grouping, setGrouping] = React.useState<GroupingState>([])
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [groupByFilter, setGroupByFilter] = React.useState<string>("none")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Apply status filter
  React.useEffect(() => {
    if (statusFilter === "all") {
      table.getColumn("status")?.setFilterValue(undefined)
    } else {
      table.getColumn("status")?.setFilterValue(statusFilter)
    }
  }, [statusFilter, table])


  // Apply grouping filter
  React.useEffect(() => {
    switch (groupByFilter) {
      case "groups":
        setGrouping(["groupName"]) // group by new Group column
        break
      default:
        setGrouping([])
    }
  }, [groupByFilter])


  const pendingCount = data.filter((item: any) => item.status === "pending").length
  const sentCount = data.filter((item: any) => item.status === "sent").length
  const failedCount = data.filter((item: any) => item.status === "failed").length

  return (
    <div className="w-full space-y-4">
      {/* Header with title and new message button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scheduled Messages</h2>
          <div className="flex gap-4 mt-2">
            <Badge variant="outline" className="bg-yellow-50">
              {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              {sentCount} Sent
            </Badge>
            {failedCount > 0 && (
              <Badge variant="outline" className="bg-red-50">
                {failedCount} Failed
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={onNewMessage} className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Message
        </Button>
      </div>

      {/* Filters and search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search messages..."
            value={(table.getColumn("message")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("message")?.setFilterValue(event.target.value)
            }
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>


        <Select value={groupByFilter} onValueChange={setGroupByFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="groups">Groups</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Columns <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                if (row.getIsGrouped()) {
                  // Group header row
                  return (
                    <TableRow key={row.id} className="bg-gradient-to-r from-slate-50 to-gray-50 border-y border-slate-200/60 font-medium shadow-sm">
                      <TableCell colSpan={columns.length} className="py-3">
                        <button
                          onClick={() => row.getToggleExpandedHandler()()}
                          className="flex items-center gap-3 text-left hover:text-blue-600 transition-colors group w-full"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all duration-150">
                            <ChevronRight 
                              className={`h-3.5 w-3.5 transition-transform duration-200 text-slate-600 group-hover:text-blue-600 ${
                                row.getIsExpanded() ? 'rotate-90' : ''
                              }`} 
                            />
                          </div>
                          <span className="capitalize text-slate-700 font-semibold text-sm tracking-wide">
                            {String(row.getGroupingValue(row.groupingColumnId!))} 
                            <span className="ml-1.5 text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                              {row.subRows.length}
                            </span>
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                }
                
                // Regular data row
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No scheduled messages found.</p>
                    <Button variant="outline" onClick={onNewMessage} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Schedule your first message
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}