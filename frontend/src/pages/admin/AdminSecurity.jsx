import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/services';

const AdminSecurity = () => {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'login'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');

  // Login History state
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginPage, setLoginPage] = useState(1);
  const [loginTotalPages, setLoginTotalPages] = useState(1);
  const [loginSearch, setLoginSearch] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else {
      fetchLoginHistory();
    }
  }, [activeTab, auditPage, auditAction, loginPage, loginSuccess]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    setTableMissing(false);
    try {
      const res = await adminService.getAuditLogs({
        page: auditPage,
        limit: 10,
        search: auditSearch,
        action: auditAction
      });
      if (res.data?.success) {
        setAuditLogs(res.data.data.logs || []);
        setAuditTotalPages(res.data.data.pagination?.totalPages || 1);
        setTableMissing(!!res.data.data.tableMissing);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    setLoading(true);
    setError('');
    setTableMissing(false);
    try {
      const res = await adminService.getLoginHistory({
        page: loginPage,
        limit: 10,
        search: loginSearch,
        success: loginSuccess
      });
      if (res.data?.success) {
        setLoginHistory(res.data.data.history || []);
        setLoginTotalPages(res.data.data.pagination?.totalPages || 1);
        setTableMissing(!!res.data.data.tableMissing);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load login history');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (type) => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
    const token = localStorage.getItem('accessToken');
    const endpoint = type === 'audit'
      ? `${baseURL}/admin/audit-logs?export=csv`
      : `${baseURL}/admin/login-history?export=csv`;

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'audit' ? 'audit_logs.csv' : 'login_history.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download CSV'));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security & Audit Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor authentication activity, login attempts, and system audit logs.
          </p>
        </div>
        <button
          onClick={() => handleExportCSV(activeTab)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          Export {activeTab === 'audit' ? 'Audit Logs' : 'Login History'} (CSV)
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex space-x-6">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('login')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'login'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Login History
        </button>
      </div>

      {/* Database Table Missing Alert */}
      {tableMissing && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
          ⚠️ <strong>Database Migration Pending:</strong> The {activeTab === 'audit' ? 'audit_logs' : 'login_history'} database table has not been created yet. Please execute the Phase 11 migration SQL script in pgAdmin to begin recording live security logs.
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Audit Logs View */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by description or user email..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
            />
            <select
              value={auditAction}
              onChange={(e) => setAuditAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
            <button
              onClick={fetchAuditLogs}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm"
            >
              Search
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {log.user_email || 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entity_type || '-'}</td>
                      <td className="px-4 py-3">{log.description || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.ip_address || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              disabled={auditPage <= 1}
              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {auditPage} of {auditTotalPages}</span>
            <button
              disabled={auditPage >= auditTotalPages}
              onClick={() => setAuditPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Login History View */}
      {activeTab === 'login' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by email or IP..."
              value={loginSearch}
              onChange={(e) => setLoginSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLoginHistory()}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
            />
            <select
              value={loginSuccess}
              onChange={(e) => setLoginSuccess(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
            <button
              onClick={fetchLoginHistory}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm"
            >
              Search
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading login history...</div>
          ) : loginHistory.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">No login history records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loginHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            item.success
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {item.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.reason || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.ip_address || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              disabled={loginPage <= 1}
              onClick={() => setLoginPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {loginPage} of {loginTotalPages}</span>
            <button
              disabled={loginPage >= loginTotalPages}
              onClick={() => setLoginPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurity;
