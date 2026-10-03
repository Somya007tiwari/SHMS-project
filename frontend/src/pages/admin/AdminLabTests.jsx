import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService } from '../../services/services';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { TableRowSkeleton } from '../../components/ui/SkeletonVariants';
import { useTheme } from '../../context/ThemeContext';
import { TestTube, Plus, Search, Pencil, Power, CheckCircle, AlertCircle, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Hematology',
  'Biochemistry',
  'Endocrinology',
  'Pathology',
  'Radiology',
  'Microbiology',
  'Other'
];

export default function AdminLabTests() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);

  // Status Toggle Confirm Dialog
  const [statusConfirmItem, setStatusConfirmItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Biochemistry',
    description: '',
    price: '',
    sampleType: '',
    preparationInstructions: '',
    turnaroundHours: '',
    unit: '',
    normalMin: '',
    normalMax: '',
    normalText: ''
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-lab-tests', page, search, categoryFilter],
    queryFn: async () => {
      const res = await labService.getTests({ page, limit: 10, search, category: categoryFilter, activeOnly: false });
      return res.data;
    }
  });

  const isMissingTables = error?.response?.data?.message?.includes('missing');

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingTest) {
        return labService.updateTest(editingTest.id, payload);
      } else {
        return labService.createTest(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingTest ? 'Lab test updated successfully' : 'Lab test created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      handleCloseModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save lab test');
    }
  });

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id) => labService.toggleTestStatus(id),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Test status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      setStatusConfirmItem(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update test status');
      setStatusConfirmItem(null);
    }
  });

  const handleOpenAdd = () => {
    setEditingTest(null);
    setFormData({
      name: '',
      code: '',
      category: 'Biochemistry',
      description: '',
      price: '',
      sampleType: '',
      preparationInstructions: '',
      turnaroundHours: '',
      unit: '',
      normalMin: '',
      normalMax: '',
      normalText: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (test) => {
    setEditingTest(test);
    setFormData({
      name: test.name || '',
      code: test.code || '',
      category: test.category || 'Biochemistry',
      description: test.description || '',
      price: test.price || '',
      sampleType: test.sample_type || '',
      preparationInstructions: test.preparation_instructions || '',
      turnaroundHours: test.turnaround_hours || '',
      unit: test.unit || '',
      normalMin: test.normal_min ?? '',
      normalMax: test.normal_max ?? '',
      normalText: test.normal_text || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTest(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Test name is required');
    if (!formData.category) return toast.error('Category is required');
    if (!formData.price || parseFloat(formData.price) < 0) {
      return toast.error('Please enter a valid price >= 0');
    }

    saveMutation.mutate(formData);
  };

  const columns = [
    {
      key: 'name',
      label: 'Test Name & Code',
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {row.name}
            </span>
            {row.code && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 font-semibold">
                {row.code}
              </span>
            )}
          </div>
          {row.description && (
            <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{row.description}</p>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (val) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
          {val}
        </span>
      )
    },
    {
      key: 'price',
      label: 'Price',
      render: (val) => (
        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
          ₹{parseFloat(val || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'reference_range',
      label: 'Normal Reference Range',
      render: (_, row) => (
        <div className="text-xs text-slate-600 dark:text-gray-300">
          {row.normal_min !== null && row.normal_max !== null ? (
            <span>{row.normal_min} – {row.normal_max} {row.unit || ''}</span>
          ) : row.normal_text ? (
            <span className="truncate max-w-xs block">{row.normal_text}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`badge ${val ? 'badge-approved' : 'badge-cancelled'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors"
            title="Edit Test"
            aria-label={`Edit ${row.name}`}
          >
            <Pencil size={15} />
          </button>

          <button
            onClick={() => setStatusConfirmItem(row)}
            className={`p-1.5 rounded-lg transition-colors ${
              row.is_active
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
            title={row.is_active ? 'Deactivate Test' : 'Activate Test'}
            aria-label={`Toggle active state for ${row.name}`}
          >
            <Power size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TestTube className="text-blue-600 dark:text-blue-400" />
            Lab Tests Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Manage hospital diagnostic tests, categories, prices, and reference values.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Add New Lab Test
        </button>
      </div>

      {/* Migration Warning Banner if DB not migrated */}
      {isMissingTables && (
        <ErrorState
          title="Phase 7 Database Migration Required"
          message="The lab tests database tables have not been initialized. Please run node src/scripts/runMigrationPhase7.js or execute database/migration_phase7_lab_tests_and_reports.sql in pgAdmin."
          onRetry={refetch}
        />
      )}

      {/* Search & Filter Bar */}
      <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search test name or code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-9 py-1.5 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white w-full sm:w-64"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white w-full sm:w-48"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="card dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 skeleton rounded-xl" />
            ))}
          </div>
        ) : error && !isMissingTables ? (
          <ErrorState message="Failed to load lab tests catalog" onRetry={refetch} />
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={false}
            pagination={data?.pagination}
            onPageChange={setPage}
            emptyMessage="No lab tests found in catalog"
            emptyIcon={TestTube}
          />
        )}
      </div>

      {/* Add / Edit Test Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTest ? `Edit Lab Test: ${editingTest.name}` : 'Add New Lab Test'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={handleCloseModal} className="btn-secondary py-2 px-4 text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : editingTest ? 'Save Changes' : 'Create Test'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Test Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Fasting Blood Sugar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Test Code (Unique)
              </label>
              <input
                type="text"
                placeholder="e.g. LAB-FBS"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="150.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Sample Type
              </label>
              <input
                type="text"
                placeholder="e.g. Blood, Urine, Swab"
                value={formData.sampleType}
                onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Turnaround Time (Hours)
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 12"
                value={formData.turnaroundHours}
                onChange={(e) => setFormData({ ...formData, turnaroundHours: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Unit of Measurement
              </label>
              <input
                type="text"
                placeholder="e.g. mg/dL, %, mIU/L"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Reference Ranges */}
          <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200 dark:border-gray-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
              Normal Reference Ranges (For Auto-Flag Calculation)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">
                  Numeric Normal Min
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 70.0"
                  value={formData.normalMin}
                  onChange={(e) => setFormData({ ...formData, normalMin: e.target.value })}
                  className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">
                  Numeric Normal Max
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 99.0"
                  value={formData.normalMax}
                  onChange={(e) => setFormData({ ...formData, normalMax: e.target.value })}
                  className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">
                Text Reference Description (For qualitative/non-numeric tests)
              </label>
              <input
                type="text"
                placeholder="e.g. Clear, Negative for protein, WBC 0-5/hpf"
                value={formData.normalText}
                onChange={(e) => setFormData({ ...formData, normalText: e.target.value })}
                className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Patient Preparation Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Minimum 8 hours overnight fasting required. Water allowed."
              value={formData.preparationInstructions}
              onChange={(e) => setFormData({ ...formData, preparationInstructions: e.target.value })}
              className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Test Description / Clinical Overview
            </label>
            <textarea
              rows={2}
              placeholder="Short summary of what this lab test measures..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog for Status Toggle */}
      {statusConfirmItem && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setStatusConfirmItem(null)}
          onConfirm={() => toggleMutation.mutate(statusConfirmItem.id)}
          isLoading={toggleMutation.isPending}
          title={statusConfirmItem.is_active ? 'Deactivate Lab Test?' : 'Activate Lab Test?'}
          message={`Are you sure you want to ${statusConfirmItem.is_active ? 'deactivate' : 'activate'} "${statusConfirmItem.name}"? ${statusConfirmItem.is_active ? 'Patients will not be able to book inactive tests.' : 'Patients will be able to view and book this test.'}`}
          intent={statusConfirmItem.is_active ? 'danger' : 'primary'}
          confirmText={statusConfirmItem.is_active ? 'Deactivate' : 'Activate'}
        />
      )}
    </div>
  );
}
