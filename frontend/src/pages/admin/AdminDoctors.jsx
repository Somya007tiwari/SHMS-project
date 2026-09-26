import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorService, departmentService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Plus, Stethoscope, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const AdminDoctors = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', page, search],
    queryFn: () => doctorService.getAll({ page, limit: 10, search }).then(r => r.data)
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll().then(r => r.data.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => doctorService.create(data),
    onSuccess: () => {
      toast.success('Doctor account created!');
      qc.invalidateQueries(['doctors']);
      setShowModal(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create doctor')
  });

  const columns = [
    {
      key: 'first_name',
      label: 'Doctor',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {row.first_name?.[0]}{row.last_name?.[0]}
          </div>
          <div>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Dr. {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'specialization', label: 'Specialization' },
    { key: 'department_name', label: 'Department' },
    {
      key: 'consultation_fee',
      label: 'Fee',
      render: (val) => `₹${val || 0}`
    },
    {
      key: 'is_available',
      label: 'Status',
      render: (val) => (
        <span className={`badge ${val ? 'badge-approved' : 'badge-cancelled'}`}>
          {val ? 'Available' : 'Unavailable'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-10 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowModal(true)}
          className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          emptyMessage="No doctors found"
          emptyIcon={Stethoscope}
        />
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Doctor"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary px-5 py-2 text-sm">Cancel</button>
            <button onClick={handleSubmit(createMutation.mutate)}
              disabled={createMutation.isPending}
              className="btn-primary px-5 py-2 text-sm">
              {createMutation.isPending ? 'Creating...' : 'Create Doctor'}
            </button>
          </>
        }>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'firstName', label: 'First Name', placeholder: 'Dr. First' },
            { name: 'lastName', label: 'Last Name', placeholder: 'Last Name' },
            { name: 'email', label: 'Email', placeholder: 'doctor@shms.com', type: 'email' },
            { name: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
          ].map(f => (
            <div key={f.name}>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{f.label}</label>
              <input type={f.type || 'text'} placeholder={f.placeholder}
                className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...register(f.name, { required: `${f.label} is required` })} />
              {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name].message}</p>}
            </div>
          ))}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Department</label>
            <select className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              {...register('departmentId', { required: 'Required' })}>
              <option value="">Select Department</option>
              {(departments || []).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Specialization</label>
            <input placeholder="e.g., Cardiologist"
              className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              {...register('specialization', { required: 'Required' })} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Consultation Fee (₹)</label>
            <input type="number" placeholder="500"
              className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              {...register('consultationFee')} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Experience (years)</label>
            <input type="number" placeholder="5"
              className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              {...register('experienceYears')} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDoctors;
