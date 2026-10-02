import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Heart, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data);
      toast.success(`Welcome back, ${user.firstName}!`);
      
      // Redirect based on role
      const redirectMap = {
        admin: '/admin/dashboard',
        doctor: '/doctor/dashboard',
        patient: '/patient/dashboard'
      };
      navigate(redirectMap[user.role] || '/');
    } catch (err) {
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.request || err.code === 'ERR_NETWORK' || !err.response) {
        toast.error('Cannot reach the server. Please check your backend connection.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}
              className="absolute rounded-full border-2 border-white"
              style={{
                width: `${(i + 1) * 100}px`, height: `${(i + 1) * 100}px`,
                left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.3 - i * 0.04
              }}
            />
          ))}
        </div>
        <div className="relative text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Heart size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Smart Hospital</h1>
          <p className="text-xl opacity-90 mb-2">Management System</p>
          <p className="text-sm opacity-70 max-w-sm mx-auto mt-6 leading-relaxed">
            Comprehensive healthcare management for doctors, patients, and administrators.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: 'Patients', value: '10K+' },
              { label: 'Doctors', value: '200+' },
              { label: 'Departments', value: '15+' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs opacity-70 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">SHMS</p>
              <p className="text-xs text-slate-400">Smart Hospital System</p>
            </div>
          </div>

          <div className="card dark:bg-gray-900 dark:border dark:border-gray-700 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome back</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="you@example.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-12 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Enter your password"
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm justify-center"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-slate-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Create account
              </Link>
            </p>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-blue-600 dark:text-blue-300">
                <p>🔑 Admin: <span className="font-mono">admin@shms.com</span> / <span className="font-mono">Admin@123456</span></p>
                <p>🩺 Doctor: <span className="font-mono">dr.sharma@shms.com</span> / <span className="font-mono">Doctor@123456</span></p>
                <p>👤 Patient: <span className="font-mono">john.doe@example.com</span> / <span className="font-mono">Patient@123456</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
