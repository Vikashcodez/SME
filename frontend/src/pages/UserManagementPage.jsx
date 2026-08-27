import { useState, useEffect } from "react";
import { masterService } from "../services/masterService";
import { Users, Plus, Shield, UserCheck, UserX, X } from "lucide-react";
import { toast } from "react-hot-toast";

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    company_code: "CO-0001",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await masterService.listUsers();
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Are you sure you want to deactivate this user account?")) return;
    try {
      const res = await masterService.deactivateUser(userId);
      if (res.data?.success) {
        toast.success(res.data.message || "User deactivated successfully");
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate user");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await masterService.createUser(formData);
      if (res.data?.success) {
        toast.success("User created successfully!");
        setIsModalOpen(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          role: "user",
          company_code: "CO-0001",
        });
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-gradient-to-r from-ink-950 via-slate-900 to-ink-900 rounded-2xl p-6 text-white shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-1">
              <Users className="h-4 w-4" />
              <span>Administration & Security</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">User and Access Management</h1>
            <p className="text-sm text-slate-300 mt-1">
              Manage enterprise user accounts, roles, access permissions, and tenant company associations.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-xs font-semibold text-slate-500">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 w-36">Role</th>
                  <th className="py-3 px-4 w-36">Company Code</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <p className="font-semibold text-slate-600">No users found</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Add User" to create a new account.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSuperAdmin = u.role === "super_admin";
                    const isAdmin = u.role === "admin";
                    const roleBadgeClass = isSuperAdmin
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : isAdmin
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <tr key={u.user_id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadgeClass}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-xs text-emerald-800">
                          {u.company_code || "CO-0001"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                              <UserCheck className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                              <UserX className="h-3 w-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.is_active && !isSuperAdmin ? (
                            <button
                              onClick={() => handleDeactivate(u.user_id)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Add New User Account</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Company Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="CO-0001"
                    value={formData.company_code}
                    onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;
