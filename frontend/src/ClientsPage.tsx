import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd'

type Client = {
  id: number
  name: string
  address?: string
  pointOfContact?: string
  email?: string
  contactNumber?: string
}

export function ClientsPage() {
  const [data, setData] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('http://localhost:8080/api/clients')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async (values: any) => {
    const res = await fetch('http://localhost:8080/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('Client created')
      form.resetFields()
      load()
    } else {
      message.error('Failed to create client')
    }
  }

  const openEdit = (record: Client) => {
    setEditingId(record.id)
    editForm.setFieldsValue({
      name: record.name,
      address: record.address,
      pointOfContact: record.pointOfContact,
      email: record.email,
      contactNumber: record.contactNumber,
    })
    setEditOpen(true)
  }

  const onEdit = async (values: any) => {
    if (editingId == null) return
    const res = await fetch(`http://localhost:8080/api/clients/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('Client updated')
      setEditOpen(false)
      setEditingId(null)
      editForm.resetFields()
      load()
    } else {
      message.error('Failed to update client')
    }
  }

  const onDelete = async (id: number) => {
    const res = await fetch(`http://localhost:8080/api/clients/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      message.success('Client deleted')
      load()
    } else {
      message.error('Failed to delete client')
    }
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Address', dataIndex: 'address', key: 'address' },
    { title: 'Point of contact', dataIndex: 'pointOfContact', key: 'pointOfContact' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Contact number', dataIndex: 'contactNumber', key: 'contactNumber' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Client) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this client?" onConfirm={() => onDelete(record.id)}>
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
      <h2>Clients</h2>
      <Form form={form} layout="inline" onFinish={onCreate}>
        <Form.Item name="name" rules={[{ required: true, message: 'Name required' }]}>
          <Input placeholder="Client name" />
        </Form.Item>
        <Form.Item name="address">
          <Input placeholder="Address" />
        </Form.Item>
        <Form.Item name="pointOfContact">
          <Input placeholder="Point of contact" />
        </Form.Item>
        <Form.Item name="email">
          <Input placeholder="Email (optional)" />
        </Form.Item>
        <Form.Item name="contactNumber">
          <Input placeholder="Contact number" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add
          </Button>
        </Form.Item>
      </Form>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />

      <Modal
        title="Edit client"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          setEditingId(null)
          editForm.resetFields()
        }}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="pointOfContact" label="Point of contact">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="contactNumber" label="Contact number">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditOpen(false)
                  setEditingId(null)
                  editForm.resetFields()
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

