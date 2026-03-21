import {
  Layout,
  Menu,
  theme,
  Table,
  Button,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Space,
  message,
  Modal,
  Popconfirm,
  Card,
  Row,
  Col,
} from 'antd'
import type { MenuProps } from 'antd'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import './App.css'
import { ClientsPage } from './ClientsPage'

const { Header, Sider, Content } = Layout

const queryClient = new QueryClient()

type MenuItem = Required<MenuProps>['items'][number]

function getItem(label: React.ReactNode, key: React.Key, children?: MenuItem[]): MenuItem {
  return {
    key,
    children,
    label,
  } as MenuItem
}

const items: MenuItem[] = [
  getItem(<Link to="/">Dashboard</Link>, 'dashboard'),
  getItem(<Link to="/business-profile">Business profile</Link>, 'business-profile'),
  getItem(<Link to="/clients">Clients</Link>, 'clients'),
  getItem(<Link to="/invoices">Invoices</Link>, 'invoices'),
  getItem(<Link to="/expenses">Expenses</Link>, 'expenses'),
  getItem(<Link to="/business-income">Business Income</Link>, 'business-income'),
]

type Invoice = {
  id?: number
  invoiceNumber?: string
  clientId?: number
  client?: Client
  customerName: string
  customerEmail?: string
  issueDate: string
  dueDate?: string
  currency: string
  amount: number
  status: string
  lines?: InvoiceLine[]
}

type InvoiceLine = {
  id?: number
  lineNumber?: number
  description: string
  quantity: number
  unitPrice: number
  lineTotal?: number
}

type Client = {
  id: number
  name: string
  address?: string
  pointOfContact?: string
  email?: string
  contactNumber?: string
}

type CompanyProfile = {
  id?: number
  name: string
  address?: string
  pointOfContact?: string
  email?: string
  contactNumber?: string
  logoDataUrl?: string
  logoFileName?: string
}

function BusinessProfilePage() {
  const API_BASE = 'http://localhost:8080'
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // We upload the logo as an actual file to the backend (multipart upload).
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API_BASE}/api/company-profile`)
      if (res.ok) {
        const p: CompanyProfile = await res.json()
        if (p.logoFileName) {
          setLogoPreview(`${API_BASE}/api/company-profile/logo?ts=${Date.now()}`)
        } else if (p.logoDataUrl) {
          // Backward compatibility for older data-url based logos.
          setLogoPreview(p.logoDataUrl)
        } else {
          setLogoPreview(null)
        }

        form.setFieldsValue({
          name: p.name || '',
          address: p.address || '',
          pointOfContact: p.pointOfContact || '',
          email: p.email || '',
          contactNumber: p.contactNumber || '',
        })
      }
      setPendingLogoFile(null)
      setLogoRemoved(false)
      setLoading(false)
    }
    load()
  }, [form])

  const onPickLogo = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('Please upload an image file')
      return
    }
    const MAX_LOGO_BYTES = 1_500_000 // ~1.5MB
    if (file.size > MAX_LOGO_BYTES) {
      message.error('Logo too large (max ~1.5MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl === 'string') {
        setLogoPreview(dataUrl)
        setPendingLogoFile(file)
        setLogoRemoved(false)
      }
    }
    reader.onerror = () => message.error('Failed to read the image file')
    reader.readAsDataURL(file)
  }

  const onRemoveLogo = () => {
    setPendingLogoFile(null)
    setLogoRemoved(true)
    setLogoPreview(null)
  }

  const onFinish = async (values: any) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/company-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name || '',
          address: values.address || undefined,
          pointOfContact: values.pointOfContact || undefined,
          email: values.email || undefined,
          contactNumber: values.contactNumber || undefined,
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to save business profile')
      }

      if (logoRemoved) {
        const delRes = await fetch(`${API_BASE}/api/company-profile/logo`, { method: 'DELETE' })
        if (!delRes.ok) {
          throw new Error('Failed to remove logo')
        }
        setLogoPreview(null)
      } else if (pendingLogoFile) {
        const fd = new FormData()
        fd.append('file', pendingLogoFile)
        const uploadRes = await fetch(`${API_BASE}/api/company-profile/logo`, {
          method: 'POST',
          body: fd,
        })
        if (!uploadRes.ok) {
          throw new Error('Failed to upload logo')
        }
        setLogoPreview(`${API_BASE}/api/company-profile/logo?ts=${Date.now()}`)
      }

      setPendingLogoFile(null)
      setLogoRemoved(false)
      message.success('Business profile saved')
    } catch (e: any) {
      message.error(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Business profile (invoice “From”)</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>
        These details appear on printed invoices as the sender. Name is required.
      </p>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Business / owner name" rules={[{ required: true, message: 'Name required' }]}>
          <Input placeholder="e.g. Your Pte Ltd" />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input.TextArea rows={3} placeholder="Registered / mailing address" />
        </Form.Item>
        <Form.Item name="pointOfContact" label="Point of contact">
          <Input placeholder="Contact person name" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input type="email" placeholder="billing@example.com" />
        </Form.Item>
        <Form.Item name="contactNumber" label="Contact number">
          <Input placeholder="+65 …" />
        </Form.Item>
        <Form.Item label="Company logo (shown on invoices)">
          <div style={{ marginBottom: 12 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickLogo(e.target.files?.[0])}
              disabled={saving}
            />
          </div>
          {logoPreview ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={logoPreview}
                alt="Company logo preview"
                style={{ width: 140, height: 'auto', maxHeight: 80, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{ color: '#888', marginBottom: 12 }}>No logo uploaded.</div>
          )}
          <Button
            onClick={() => {
              onRemoveLogo()
            }}
            disabled={saving || !logoPreview}
          >
            Remove logo
          </Button>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

function Dashboard() {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any | null>(null)

  const formatSgd = (v: any) => {
    const n = typeof v === 'number' ? v : v != null ? Number(v) : NaN
    if (Number.isNaN(n)) return v ?? ''
    return `S$ ${n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`http://localhost:8080/api/dashboard/overview?year=${year}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    load()
  }, [year])

  const monthly: Array<any> = data?.monthly || []
  const series = {
    revenue: monthly.map((m) => Number(m.revenue || 0)),
    cost: monthly.map((m) => Number(m.costOfSales || 0)),
    expenses: monthly.map((m) => Number(m.expenses || 0)),
    profit: monthly.map((m) => Number(m.adjustedProfit || 0)),
  }
  const maxY = Math.max(
    1,
    ...series.revenue.map((v) => Math.abs(v)),
    ...series.cost.map((v) => Math.abs(v)),
    ...series.expenses.map((v) => Math.abs(v)),
    ...series.profit.map((v) => Math.abs(v)),
  )

  const renderLinePath = (values: number[], w: number, h: number, pad: number) => {
    const innerW = w - pad * 2
    const innerH = h - pad * 2
    const n = Math.max(values.length, 1)
    return values
      .map((v, i) => {
        const x = pad + (innerW * i) / Math.max(n - 1, 1)
        const y = pad + innerH * (1 - (v + maxY) / (maxY * 2))
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }

  const overdueRows = (data?.overdue?.invoices || []).map((r: any) => ({
    ...r,
    key: r.id,
  }))

  const topClientRows = (data?.topClients || []).map((r: any, idx: number) => ({
    ...r,
    key: r.clientId ?? `name-${idx}`,
  }))

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <div style={{ color: '#666' }}>Accrual basis • Year {year}</div>
        </div>
        <InputNumber min={2000} max={2100} value={year} onChange={(v) => v && setYear(v)} />
      </Space>

      {loading && <p>Loading…</p>}
      {!loading && data && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card title="Revenue">
                <div style={{ fontSize: 22, fontWeight: 700 }}>{formatSgd(data.kpis?.revenueYtd)}</div>
                <div style={{ color: '#666', marginTop: 6 }}>MTD: {formatSgd(data.kpis?.revenueMtd)}</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card title="Cost of sales">
                <div style={{ fontSize: 22, fontWeight: 700 }}>{formatSgd(data.kpis?.costYtd)}</div>
                <div style={{ color: '#666', marginTop: 6 }}>MTD: {formatSgd(data.kpis?.costMtd)}</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card title="Expenses">
                <div style={{ fontSize: 22, fontWeight: 700 }}>{formatSgd(data.kpis?.expensesYtd)}</div>
                <div style={{ color: '#666', marginTop: 6 }}>MTD: {formatSgd(data.kpis?.expensesMtd)}</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card title="Adjusted profit">
                <div style={{ fontSize: 22, fontWeight: 700 }}>{formatSgd(data.kpis?.profitYtd)}</div>
                <div style={{ color: '#666', marginTop: 6 }}>MTD: {formatSgd(data.kpis?.profitMtd)}</div>
              </Card>
            </Col>
          </Row>

          <Card
            title="Trends (by month)"
            extra={<span style={{ color: '#666' }}>Revenue • Cost • Expenses • Profit</span>}
          >
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg width={900} height={240} viewBox="0 0 900 240" style={{ display: 'block' }}>
                <rect x="0" y="0" width="900" height="240" fill="transparent" />
                <g opacity="0.25">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1={40}
                      x2={860}
                      y1={30 + (160 * i) / 4}
                      y2={30 + (160 * i) / 4}
                      stroke="#999"
                      strokeWidth={1}
                    />
                  ))}
                </g>
                <path d={renderLinePath(series.revenue, 900, 240, 40)} stroke="#1677ff" strokeWidth={2} fill="none" />
                <path d={renderLinePath(series.cost, 900, 240, 40)} stroke="#ff4d4f" strokeWidth={2} fill="none" />
                <path d={renderLinePath(series.expenses, 900, 240, 40)} stroke="#faad14" strokeWidth={2} fill="none" />
                <path d={renderLinePath(series.profit, 900, 240, 40)} stroke="#52c41a" strokeWidth={2} fill="none" />
                <g fontSize="12" fill="#666">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <text key={i} x={40 + ((860 - 40) * i) / 11} y={225} textAnchor="middle">
                      {i + 1}
                    </text>
                  ))}
                </g>
              </svg>
            </div>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card
                title="Overdue invoices"
                extra={<span style={{ color: '#666' }}>Total: {formatSgd(data.overdue?.totalAmount)}</span>}
              >
                <Table
                  size="small"
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
                    { title: 'Client', dataIndex: 'customerName', key: 'customerName' },
                    { title: 'Due', dataIndex: 'dueDate', key: 'dueDate' },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      align: 'right' as const,
                      render: (v: any) => formatSgd(v),
                    },
                    { title: 'Status', dataIndex: 'status', key: 'status' },
                  ]}
                  dataSource={overdueRows}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Top clients (by revenue)">
                <Table
                  size="small"
                  rowKey="key"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
                    {
                      title: 'Revenue',
                      dataIndex: 'totalRevenue',
                      key: 'totalRevenue',
                      align: 'right' as const,
                      render: (v: any) => formatSgd(v),
                    },
                  ]}
                  dataSource={topClientRows}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Space>
  )
}

function InvoiceListPage() {
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('http://localhost:8080/api/invoices')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Invoice) => (
        <Space>
          <Link to={`/invoices/${record.id}/edit`}>Edit</Link>
          <Button
            type="link"
            onClick={() => window.open(`/print-invoices/${record.id}`, '_blank')}
          >
            Print
          </Button>
          <Button
            type="link"
            danger
            onClick={async () => {
              await fetch(`http://localhost:8080/api/invoices/${record.id}`, {
                method: 'DELETE',
              })
              load()
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <h2 style={{ margin: 0 }}>Invoices</h2>
        <Button type="primary">
          <Link to="/invoices/new">New Invoice</Link>
        </Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />
    </Space>
  )
}

function InvoiceEditPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const { id } = useParams()

  useEffect(() => {
    const load = async () => {
      const [invRes, costsRes, clientsRes] = await Promise.all([
        fetch(`http://localhost:8080/api/invoices/${id}`),
        fetch(`http://localhost:8080/api/invoices/${id}/costs`),
        fetch('http://localhost:8080/api/clients'),
      ])
      if (!invRes.ok) {
        message.error('Failed to load invoice')
        setLoading(false)
        return
      }
      const invoice: Invoice = await invRes.json()
      const costsList: Array<{ costDate: string; description: string; category: string; amount: number }> = costsRes.ok ? await costsRes.json() : []
      const clientsList: Client[] = clientsRes.ok ? await clientsRes.json() : []
      setClients(clientsList)
      form.setFieldsValue({
        clientId: invoice.clientId ?? invoice.client?.id,
        issueDate: dayjs(invoice.issueDate),
        dueDate: invoice.dueDate ? dayjs(invoice.dueDate) : undefined,
        currency: invoice.currency,
        lines: (invoice.lines || []).map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        costs: costsList.map((c) => ({
          costDate: dayjs(c.costDate),
          description: c.description,
          category: c.category,
          amount: c.amount,
        })),
      })
      setLoading(false)
    }
    load()
  }, [id, form])

  const onFinish = async (values: any) => {
    setSubmitting(true)

    const lines: InvoiceLine[] = (values.lines || []).map((line: any, index: number) => {
      const quantity = Number(line.quantity || 0)
      const unitPrice = Number(line.unitPrice || 0)
      const lineTotal = quantity * unitPrice
      return {
        lineNumber: index + 1,
        description: line.description,
        quantity,
        unitPrice,
        lineTotal,
      }
    })

    const amount = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0)

    const putBody: any = {
      issueDate: values.issueDate.format('YYYY-MM-DD'),
      dueDate: values.dueDate?.format('YYYY-MM-DD'),
      currency: values.currency,
      amount,
      status: 'DRAFT',
      lines,
    }
    if (values.clientId) {
      putBody.client = { id: values.clientId }
    }
    const res = await fetch(`http://localhost:8080/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    })

    if (res.ok) {
      const costs = (values.costs || []).map((c: any) => ({
        costDate: c.costDate.format('YYYY-MM-DD'),
        description: c.description,
        category: c.category,
        amount: c.amount,
      }))
      await fetch(`http://localhost:8080/api/invoices/${id}/costs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costs),
      })
      message.success('Invoice updated')
    } else {
      message.error('Failed to update invoice')
    }
    setSubmitting(false)
  }

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <h2>Edit Invoice</h2>
      <Form form={form} layout="vertical" style={{ maxWidth: 600 }} onFinish={onFinish}>
        <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Select a client' }]}>
          <Select
            placeholder="Select client"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="issueDate" label="Issue Date" rules={[{ required: true }]}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="dueDate" label="Due Date">
          <DatePicker />
        </Form.Item>
        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'SGD', label: 'SGD' },
              { value: 'USD', label: 'USD' },
            ]}
          />
        </Form.Item>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Line Items</h3>
                <Button onClick={() => add()} type="dashed">
                  Add line
                </Button>
              </Space>
              {fields.map((field) => (
                <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'description']}
                    rules={[{ required: true, message: 'Description required' }]}
                  >
                    <Input placeholder="Description" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'quantity']}
                    rules={[{ required: true, message: 'Qty' }]}
                  >
                    <InputNumber min={0} placeholder="Qty" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'unitPrice']}
                    rules={[{ required: true, message: 'Price' }]}
                  >
                    <InputNumber min={0} placeholder="Unit Price" />
                  </Form.Item>
                  <Button danger onClick={() => remove(field.name)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </div>
          )}
        </Form.List>

        <Form.List name="costs">
          {(fields, { add, remove }) => (
            <div style={{ marginTop: 24 }}>
              <Space style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Cost Items (optional)</h3>
                <Button onClick={() => add()} type="dashed">
                  Add cost
                </Button>
              </Space>
              {fields.map((field) => (
                <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'costDate']}
                    rules={[{ required: true, message: 'Date' }]}
                  >
                    <DatePicker />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'description']}
                    rules={[{ required: true, message: 'Description' }]}
                  >
                    <Input placeholder="Description" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'category']}
                    rules={[{ required: true, message: 'Category' }]}
                  >
                    <Select
                      style={{ width: 140 }}
                      options={[
                        { value: 'Materials', label: 'Materials' },
                        { value: 'Subcontractor', label: 'Subcontractor' },
                        { value: 'Travel', label: 'Travel' },
                        { value: 'Others', label: 'Others' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'amount']}
                    rules={[{ required: true, message: 'Amount' }]}
                  >
                    <InputNumber min={0} placeholder="Cost" />
                  </Form.Item>
                  <Button danger onClick={() => remove(field.name)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </div>
          )}
        </Form.List>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

function InvoiceCreatePage() {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    const loadClients = async () => {
      const res = await fetch('http://localhost:8080/api/clients')
      if (!res.ok) return
      const json = await res.json()
      setClients(json)
    }
    loadClients()
  }, [])

  const onFinish = async (values: any) => {
    setSubmitting(true)
    const lines: InvoiceLine[] = (values.lines || []).map((line: any, index: number) => {
      const quantity = Number(line.quantity || 0)
      const unitPrice = Number(line.unitPrice || 0)
      const lineTotal = quantity * unitPrice
      return {
        lineNumber: index + 1,
        description: line.description,
        quantity,
        unitPrice,
        lineTotal,
      }
    })

    const amount = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0)

    const payload: any = {
      issueDate: values.issueDate?.format('YYYY-MM-DD'),
      dueDate: values.dueDate?.format('YYYY-MM-DD'),
      currency: values.currency,
      amount,
      status: 'DRAFT',
      lines,
    }
    if (values.clientId) {
      payload.client = { id: values.clientId }
    }
    const res = await fetch('http://localhost:8080/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      message.success('Invoice created')
      form.resetFields()
    } else {
      message.error('Failed to create invoice')
    }
    setSubmitting(false)
  }

  return (
    <div>
      <h2>Create Invoice</h2>
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600 }}
        onFinish={onFinish}
        initialValues={{
          currency: 'SGD',
        }}
      >
        <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Select a client' }]}>
          <Select
            placeholder="Select client"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="issueDate" label="Issue Date" rules={[{ required: true }]}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="dueDate" label="Due Date">
          <DatePicker />
        </Form.Item>
        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'SGD', label: 'SGD' },
              { value: 'USD', label: 'USD' },
            ]}
          />
        </Form.Item>
        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Line Items</h3>
                <Button onClick={() => add()} type="dashed">
                  Add line
                </Button>
              </Space>
              {fields.map((field) => (
                <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'description']}
                    rules={[{ required: true, message: 'Description required' }]}
                  >
                    <Input placeholder="Description" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'quantity']}
                    rules={[{ required: true, message: 'Qty' }]}
                  >
                    <InputNumber min={0} placeholder="Qty" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'unitPrice']}
                    rules={[{ required: true, message: 'Price' }]}
                  >
                    <InputNumber min={0} placeholder="Unit Price" />
                  </Form.Item>
                  <Button danger onClick={() => remove(field.name)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </div>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

const expenseCategoryOptions = [
  { value: 'Transport', label: 'Transport' },
  { value: 'Rental', label: 'Rental' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Professional fees', label: 'Professional fees' },
  { value: 'Others', label: 'Others' },
]

function ExpensesPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('http://localhost:8080/api/expenses')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const onFinish = async (values: any) => {
    const payload = {
      date: values.date.format('YYYY-MM-DD'),
      description: values.description,
      category: values.category,
      amount: values.amount,
    }
    const res = await fetch('http://localhost:8080/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      message.success('Expense created')
      form.resetFields()
      load()
    } else {
      message.error('Failed to create expense')
    }
  }

  const openEdit = async (record: any) => {
    setEditingId(record.id)
    const res = await fetch(`http://localhost:8080/api/expenses/${record.id}`)
    if (!res.ok) {
      message.error('Failed to load expense')
      return
    }
    const expense = await res.json()
    editForm.setFieldsValue({
      date: dayjs(expense.date),
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
    })
    setEditModalOpen(true)
  }

  const onEditFinish = async (values: any) => {
    if (editingId == null) return
    const payload = {
      date: values.date.format('YYYY-MM-DD'),
      description: values.description,
      category: values.category,
      amount: values.amount,
    }
    const res = await fetch(`http://localhost:8080/api/expenses/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      message.success('Expense updated')
      setEditModalOpen(false)
      setEditingId(null)
      editForm.resetFields()
      load()
    } else {
      message.error('Failed to update expense')
    }
  }

  const onDelete = async (id: number) => {
    const res = await fetch(`http://localhost:8080/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      message.success('Expense deleted')
      load()
    } else {
      message.error('Failed to delete expense')
    }
  }

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: any) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this expense?"
            onConfirm={() => onDelete(record.id)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <h2>Expenses</h2>
      <Form
        form={form}
        layout="inline"
        onFinish={onFinish}
        initialValues={{ category: 'Others' }}
      >
        <Form.Item name="date" rules={[{ required: true }]}>
          <DatePicker placeholder="Date" />
        </Form.Item>
        <Form.Item name="description" rules={[{ required: true }]}>
          <Input placeholder="Description" />
        </Form.Item>
        <Form.Item name="category" rules={[{ required: true }]}>
          <Select style={{ width: 150 }} options={expenseCategoryOptions} />
        </Form.Item>
        <Form.Item name="amount" rules={[{ required: true }]}>
          <InputNumber min={0} placeholder="Amount" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add
          </Button>
        </Form.Item>
      </Form>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />
      <Modal
        title="Edit expense"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingId(null); editForm.resetFields() }}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={onEditFinish}>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={expenseCategoryOptions} />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
              <Button onClick={() => { setEditModalOpen(false); setEditingId(null); editForm.resetFields() }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

function BusinessIncomePage() {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any | null>(null)

  const formatSgd = (v: any) => {
    const n = typeof v === 'number' ? v : v != null ? Number(v) : NaN
    if (Number.isNaN(n)) return v ?? ''
    return `S$ ${n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const load = async (y: number) => {
    setLoading(true)
    const res = await fetch(`http://localhost:8080/api/reports/business-income?year=${y}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    load(year)
  }, [year])

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <h2 style={{ margin: 0 }}>Business Income Summary (YA {year})</h2>
        <InputNumber min={2000} max={2100} value={year} onChange={(v) => v && setYear(v)} />
      </Space>

      {loading && <p>Loading…</p>}
      {!loading && data && (
        <div style={{ maxWidth: 520 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0' }}>Revenue</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatSgd(data.revenue)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0' }}>Cost of sales</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatSgd(data.costOfSales)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0' }}>
                  <strong>Gross profit / (loss)</strong>
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                  <strong>{formatSgd(data.grossProfit)}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0' }}>Allowable expenses</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatSgd(data.allowableExpenses)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', borderTop: '1px solid #eee' }}>
                  <strong>Adjusted profit / (loss)</strong>
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right', borderTop: '1px solid #eee' }}>
                  <strong>{formatSgd(data.adjustedProfit)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Space>
  )
}

function InvoicePrintPage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [owner, setOwner] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [invRes, ownerRes] = await Promise.all([
        fetch(`http://localhost:8080/api/invoices/${id}`),
        fetch('http://localhost:8080/api/company-profile'),
      ])
      if (ownerRes.ok) {
        setOwner(await ownerRes.json())
      }
      if (!invRes.ok) {
        setLoading(false)
        return
      }
      const data: Invoice = await invRes.json()
      setInvoice(data)
      if (data.invoiceNumber) {
        document.title = data.invoiceNumber
      }
      const cid = data.clientId ?? data.client?.id
      if (cid) {
        const cRes = await fetch(`http://localhost:8080/api/clients/${cid}`)
        if (cRes.ok) {
          setClient(await cRes.json())
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading || !invoice) return <p>Loading…</p>

  const lines = invoice.lines || []

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 32,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <h1 style={{ textAlign: 'right' }}>INVOICE</h1>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 24,
        }}
      >
        <div style={{ lineHeight: 1.5, maxWidth: '52%', textAlign: 'left' }}>
          <h3>From</h3>
          {owner &&
          (owner.name ||
            owner.address ||
            owner.pointOfContact ||
            owner.email ||
            owner.contactNumber ||
            owner.logoFileName ||
            owner.logoDataUrl) ? (
            <>
              {/* Header row: logo + company name only (keeps vertical alignment predictable). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
                {owner.logoFileName ? (
                  <img
                    src="http://localhost:8080/api/company-profile/logo"
                    alt="Company logo"
                    style={{
                      width: 24,
                      height: 24,
                      display: 'block',
                      objectFit: 'contain',
                      flexShrink: 0,
                    }}
                  />
                ) : owner.logoDataUrl ? (
                  <img
                    src={owner.logoDataUrl}
                    alt="Company logo"
                    style={{
                      width: 24,
                      height: 24,
                      display: 'block',
                      objectFit: 'contain',
                      flexShrink: 0,
                    }}
                  />
                ) : null}

                {owner.name && (
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 20,
                      lineHeight: '24px',
                      textAlign: 'left',
                    }}
                  >
                    {owner.name}
                  </div>
                )}
              </div>

              {/* Body lines: align to the left edge of company name (logo width + gap). */}
              <div style={{ marginLeft: 0, textAlign: 'left' }}>
                {owner.address && (
                  <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{owner.address}</div>
                )}
                {owner.pointOfContact && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Point of contact:</strong> {owner.pointOfContact}
                  </div>
                )}
                {owner.email && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Email:</strong> {owner.email}
                  </div>
                )}
                {owner.contactNumber && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Contact number:</strong> {owner.contactNumber}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: '#888' }}>
              Set your business details under <strong>Business profile</strong> in the app.
            </div>
          )}

          <div style={{ marginTop: 28, textAlign: 'left' }}>
            <h3>Bill To</h3>
            {client ? (
              <div style={{ lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600 }}>{client.name}</div>
                {client.address && (
                  <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{client.address}</div>
                )}
                {client.pointOfContact && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Point of contact:</strong> {client.pointOfContact}
                  </div>
                )}
                {client.email && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Email:</strong> {client.email}
                  </div>
                )}
                {client.contactNumber && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Contact number:</strong> {client.contactNumber}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>{invoice.customerName}</div>
                {invoice.customerEmail && <div>{invoice.customerEmail}</div>}
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <h3>Invoice Details</h3>
          <div>
            <strong>Invoice #:</strong> {invoice.invoiceNumber}
          </div>
          <div>
            <strong>Date:</strong> {invoice.issueDate}
          </div>
          {invoice.dueDate && (
            <div>
              <strong>Due Date:</strong> {invoice.dueDate}
            </div>
          )}
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: 24,
        }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 }}>
              Description
            </th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>Qty</th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>
              Unit Price
            </th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>
              Line Total
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx}>
              <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{line.description}</td>
              <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, textAlign: 'right' }}>
                {line.quantity}
              </td>
              <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, textAlign: 'right' }}>
                {line.unitPrice}
              </td>
              <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, textAlign: 'right' }}>
                {line.lineTotal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: 'right', marginBottom: 32 }}>
        <div>
          <strong>Total ({invoice.currency}):</strong> {invoice.amount}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#888' }}>Thank you for your business.</div>
    </div>
  )
}

function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null)
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/company-profile')
        if (!res.ok) return
        const p: any = await res.json()
        if (cancelled) return
        if (p.logoFileName) {
          setBrandLogoUrl('http://localhost:8080/api/company-profile/logo')
        } else if (p.logoDataUrl) {
          setBrandLogoUrl(p.logoDataUrl)
        } else {
          setBrandLogoUrl(null)
        }
      } catch {
        // ignore; sidebar will just show text
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {brandLogoUrl && (
            <img
              src={brandLogoUrl}
              alt="Company logo"
              style={{
                height: 20,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
          <span style={{ fontWeight: 800, fontSize: 18, lineHeight: '20px' }}>Service Accounting</span>
        </div>
        <Menu theme="dark" mode="inline" items={items} />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
            <Route path="/business-profile" element={<BusinessProfilePage />} />
            <Route path="/clients" element={<ClientsPage />} />
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/invoices/new" element={<InvoiceCreatePage />} />
              <Route path="/invoices/:id/edit" element={<InvoiceEditPage />} />
              <Route path="/print-invoices/:id" element={<InvoicePrintPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/business-income" element={<BusinessIncomePage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
