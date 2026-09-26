import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '../../services/authService';
import { Heart, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Heart size={24} className="text-white" />
          </div>
        </div>

        <div className="card dark:bg-gray-900 dark:border dark:border-gray-700 p-8 text-center">
          {sent ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Check your email</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                We sent a password reset link to <strong>{getValues('email')}</strong>
              </p>
              <Link to="/login" className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2 mt-4">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Forgot Password?</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="you@example.com"
                    {...register('email', { required: 'Email is required' })}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-sm justify-center">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
                </button>
              </form>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mt-4">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
