import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import { Search, Users } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import dayjs from 'dayjs';

const AdminPatients = () => {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => patientService.getAll({ page, limit: 10, search }).then(r => r.data)
  });

  const columns = [
    {
      key: 'first_name',
      label: 'Patient',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {row.first_name?.[0]}{row.last_name?.[0]}
          </div>
          <div>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', label: 'Phone' },
    { key: 'blood_group', label: 'Blood Group', render: (val) => val || '-' },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      render: (val) => val ? dayjs(val).format('MMM D, YYYY') : '-'
    },
    {
      key: 'total_appointments',
      label: 'Appointments',
      render: (val) => <span className="font-semibold">{val || 0}</span>
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`badge ${val ? 'badge-approved' : 'badge-cancelled'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-10 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          emptyMessage="No patients found"
          emptyIcon={Users}
        />
      </div>
    </div>
  );
};

export default AdminPatients;
