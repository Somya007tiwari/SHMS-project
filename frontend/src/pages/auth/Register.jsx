import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '../../services/authService';
import { Eye, EyeOff, Heart, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { role: 'patient' }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = data;
      await authService.register(payload);
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (err) {
      const validationMsg = err.response?.data?.errors?.[0]?.message;
      const serverMsg = err.response?.data?.message;

      if (validationMsg) {
        toast.error(validationMsg);
      } else if (err.code === 'ECONNABORTED') {
        toast.error('Request timed out. The server is taking too long to respond.');
      } else if (err.request || err.code === 'ERR_NETWORK' || !err.response) {
        toast.error('Cannot reach server. The backend server may be waking up (please wait 15-30s and try again).');
      } else if (serverMsg) {
        toast.error(serverMsg);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Heart size={24} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">SHMS</h1>
            <p className="text-xs text-slate-400">Smart Hospital System</p>
          </div>
        </div>

        <div className="card dark:bg-gray-900 dark:border dark:border-gray-700 p-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Create your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">First Name</label>
                <input
                  className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="John"
                  {...register('firstName', { required: 'Required' })}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Last Name</label>
                <input
                  className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Doe"
                  {...register('lastName', { required: 'Required' })}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <input
                type="email"
                className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="you@example.com"
                {...register('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Phone Number</label>
              <input
                className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="+91 9876543210"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Minimum 8 characters (letters & numbers)"
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 8, message: 'Min 8 characters required' },
                    validate: {
                      hasLetter: val => /[A-Za-z]/.test(val) || 'Must contain at least one letter',
                      hasNumber: val => /\d/.test(val) || 'Must contain at least one number',
                    }
                  })}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength - 1] : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">{strengthLabels[strength - 1] || ''}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Repeat password"
                {...register('confirmPassword', {
                  required: 'Required',
                  validate: val => val === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-sm justify-center mt-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
