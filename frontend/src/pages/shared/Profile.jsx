import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { User, Shield, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile().then(r => r.data.data)
  });

  const { register: reg1, handleSubmit: handle1, formState: { errors: e1 } } = useForm({
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone }
  });

  const { register: reg2, handleSubmit: handle2, watch, formState: { errors: e2 } } = useForm();
  const newPwd = watch('newPassword');

  const profileMutation = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: (res) => {
      toast.success('Profile updated');
      updateUser({ firstName: res.data.data.first_name, lastName: res.data.data.last_name });
    },
    onError: () => toast.error('Update failed')
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => toast.success('Password changed successfully'),
    onError: (err) => toast.error(err.response?.data?.message || 'Password change failed')
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Card */}
      <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-gray-700 rounded-full border-2 border-slate-200 dark:border-gray-600 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all">
              <Camera size={12} className={isDark ? 'text-gray-400' : 'text-slate-600'} />
            </button>
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {user?.role === 'doctor' ? 'Dr. ' : ''}{user?.firstName} {user?.lastName}
            </h2>
            <p className="text-slate-400 text-sm">{profile?.email}</p>
            <span className={`badge mt-2 capitalize
              ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                user?.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`card p-2 flex gap-1 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>Personal Information</h3>
          <form onSubmit={handle1((data) => profileMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>First Name</label>
                <input className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  {...reg1('firstName', { required: 'Required' })} />
                {e1.firstName && <p className="text-red-500 text-xs mt-1">{e1.firstName.message}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Last Name</label>
                <input className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  {...reg1('lastName', { required: 'Required' })} />
                {e1.lastName && <p className="text-red-500 text-xs mt-1">{e1.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Email</label>
              <input className="input-field opacity-60 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={profile?.email || ''} disabled />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Phone</label>
              <input className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="+91 9876543210"
                {...reg1('phone')} />
            </div>
            <button type="submit" disabled={profileMutation.isPending}
              className="btn-primary px-6 py-2.5 text-sm">
              {profileMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className={`card p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>Change Password</h3>
          <form onSubmit={handle2((data) => passwordMutation.mutate(data))} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Current Password</label>
              <input type="password" className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...reg2('currentPassword', { required: 'Required' })} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>New Password</label>
              <input type="password" className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...reg2('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
              {e2.newPassword && <p className="text-red-500 text-xs mt-1">{e2.newPassword.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Confirm New Password</label>
              <input type="password" className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...reg2('confirmPassword', {
                  required: 'Required',
                  validate: v => v === newPwd || 'Passwords do not match'
                })} />
              {e2.confirmPassword && <p className="text-red-500 text-xs mt-1">{e2.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={passwordMutation.isPending}
              className="btn-primary px-6 py-2.5 text-sm">
              {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
