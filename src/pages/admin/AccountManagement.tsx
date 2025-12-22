import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import AppLayout from '../../app/AppLayout'
import AgentSidebar from '../../app/AgentSidebar'

interface User {
  _id: string
  username: string
  role: string
  isActive: boolean
  createdAt: string
}

interface Role {
  _id: string
  code: string
  name: string
  description: string
  permissions: string[]
  menus: string[]
  isActive: boolean
}

export default function AccountManagement() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts')

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="p-6 bg-white rounded-2xl shadow-soft min-h-[80vh]">
        <div className="text-2xl font-bold mb-6 text-gray-900">Account management and permissions</div>

        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 px-1 transition-colors ${
              activeTab === 'accounts'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Account Management
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 px-1 transition-colors ${
              activeTab === 'permissions'
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Permissions
          </button>
        </div>

        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'permissions' && <PermissionsTab />}
      </div>
    </AppLayout>
  )
}

function AccountsTab() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: '' })
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/roles')
      ])
      if (uRes.ok) setUsers(await uRes.json())
      if (rRes.ok) setRoles(await rRes.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to create user')
        return
      }
      setShowCreate(false)
      setNewUser({ username: '', password: '', role: '' })
      loadData()
    } catch {
      setError('Error creating user')
    }
  }

  const toggleStatus = async (user: User) => {
    try {
      await apiFetch(`/api/admin/users/${user._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Users List</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Create New Account
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
          <h4 className="font-medium mb-3">New Account</h4>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <input
                required
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input
                required
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                required
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select Role</option>
                {roles.map(r => (
                  <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 w-full"
              >
                Save
              </button>
            </div>
          </form>
          {error && <div className="text-xs text-rose-600 mt-2">{error}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-medium">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">Username</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 border border-gray-100">
            {users.map(u => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-rose-500'}`} />
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleStatus(u)}
                    className={`text-xs px-3 py-1.5 rounded border transition ${
                      u.isActive 
                        ? 'border-rose-200 text-rose-600 hover:bg-rose-50' 
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PermissionsTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [editingRole, setEditingRole] = useState<Role | null>(null) // null means create mode if showForm is true
  const [showForm, setShowForm] = useState(false)
  
  // Available permissions hardcoded for now or fetchable
  const availablePermissions = [
    "HELPER_VOC_VIEW",
    "REPORT_GENERATOR_VIEW",
    "SUMMARY_REPORT_VIEW",
    "TEST_AUTOMATION_AGENT_VIEW",
    "*"
  ]

  // Available menus matching sidebar IDs
  const availableMenus = [
    "daily", "ta", "bug", "report", "notes"
  ]

  const [formData, setFormData] = useState<Partial<Role>>({
    code: '', name: '', description: '', permissions: [], menus: [], isActive: true
  })
  const [error, setError] = useState<string | null>(null)

  const loadRoles = async () => {
    try {
      const res = await apiFetch('/api/admin/roles')
      if (res.ok) setRoles(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadRoles()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  const openCreate = () => {
    setEditingRole(null)
    setFormData({ code: '', name: '', description: '', permissions: [], menus: [], isActive: true })
    setShowForm(true)
    setError(null)
  }

  const openEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({ ...role })
    setShowForm(true)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const isEdit = !!editingRole
      const url = isEdit ? `/api/admin/roles/${editingRole._id}` : '/api/admin/roles'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Operation failed')
        return
      }
      
      setShowForm(false)
      loadRoles()
    } catch {
      setError('Operation failed')
    }
  }

  const togglePermission = (p: string) => {
    const current = formData.permissions || []
    if (current.includes(p)) {
      setFormData({ ...formData, permissions: current.filter(x => x !== p) })
    } else {
      setFormData({ ...formData, permissions: [...current, p] })
    }
  }

  const toggleMenu = (m: string) => {
    const current = formData.menus || []
    if (current.includes(m)) {
      setFormData({ ...formData, menus: current.filter(x => x !== m) })
    } else {
      setFormData({ ...formData, menus: [...current, m] })
    }
  }

  const toggleRoleStatus = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to ${role.isActive ? 'deactivate' : 'activate'} this role?`)) return
    try {
      await apiFetch(`/api/admin/roles/${role._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !role.isActive }),
      })
      loadRoles()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Roles List</h3>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Create New Role
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h4 className="text-xl font-bold mb-4">{editingRole ? 'Edit Role' : 'New Role'}</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    required
                    disabled={!!editingRole}
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                    placeholder="e.g. MANAGER"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {availablePermissions.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePermission(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        formData.permissions?.includes(p)
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visible Menus</label>
                <div className="flex flex-wrap gap-2">
                  {availableMenus.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMenu(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        formData.menus?.includes(m)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm text-rose-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {roles.map(r => (
          <div key={r._id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{r.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{r.code}</span>
                  {!r.isActive && <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">Inactive</span>}
                </div>
                <div className="text-sm text-gray-500 mt-1">{r.description}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Edit
                </button>
                {r.code !== 'ADMIN' && (
                  <button
                    onClick={() => toggleRoleStatus(r)}
                    className={`text-sm font-medium ${r.isActive ? 'text-rose-600 hover:text-rose-800' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {r.isActive ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <span className="text-xs font-medium text-gray-500 mt-1">Perms:</span>
                <div className="flex flex-wrap gap-1">
                  {r.permissions?.map(p => (
                    <span key={p} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                      {p}
                    </span>
                  ))}
                  {(!r.permissions || r.permissions.length === 0) && <span className="text-xs text-gray-400 italic">None</span>}
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-xs font-medium text-gray-500 mt-1">Menus:</span>
                <div className="flex flex-wrap gap-1">
                  {r.menus?.map(m => (
                    <span key={m} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                      {m}
                    </span>
                  ))}
                  {(!r.menus || r.menus.length === 0) && <span className="text-xs text-gray-400 italic">None</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
