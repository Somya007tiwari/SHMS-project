import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/services';
import { Bell, CheckCheck, Clock, Check, EyeOff, Trash2, ChevronRight, Inbox } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const Notifications = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [tab, setTab] = useState('all'); // 'all' | 'unread'
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { page, tab }],
    queryFn: () =>
      notificationService
        .getMyNotifications({
          page,
          limit,
          unread: tab === 'unread' ? true : undefined,
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const invalidateAllNotifs = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    qc.invalidateQueries({ queryKey: ['notifications-latest'] });
  };

  const markAll = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      invalidateAllNotifs();
    },
  });

  const markRead = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => invalidateAllNotifs(),
  });

  const markUnread = useMutation({
    mutationFn: notificationService.markAsUnread,
    onSuccess: () => invalidateAllNotifs(),
  });

  const deleteNotif = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      toast.success('Notification deleted');
      invalidateAllNotifs();
    },
  });

  const notifications = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const handleItemClick = (n, e) => {
    e.stopPropagation();
    if (!n.is_read) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Notification Center
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Stay updated with your appointments, schedules, and hospital alerts
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors self-start sm:self-auto"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => { setTab('all'); setPage(1); }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'all'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => { setTab('unread'); setPage(1); }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'unread'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className={`card p-12 text-center rounded-2xl ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white'}`}>
          <Inbox size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {tab === 'unread' ? 'No unread notifications' : 'No notifications found'}
          </h3>
          <p className={`text-sm mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            When you receive updates about your appointments or account, they will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={(e) => handleItemClick(n, e)}
              className={`group relative card p-4 sm:p-5 rounded-2xl flex items-start gap-4 cursor-pointer transition-all hover:shadow-md border ${
                !n.is_read
                  ? isDark
                    ? 'border-l-4 border-l-blue-500 bg-blue-950/20 border-slate-700'
                    : 'border-l-4 border-l-blue-500 bg-blue-50/40 border-slate-200'
                  : isDark
                  ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  !n.is_read
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <Bell size={20} />
              </div>

              <div className="flex-1 min-w-0 pr-16">
                <div className="flex items-center gap-2">
                  <h4 className={`font-semibold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {n.title}
                  </h4>
                  {!n.is_read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </div>

                <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {n.message}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={13} />
                    <span>{dayjs(n.created_at).fromNow()}</span>
                  </div>
                  {n.link && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                      View details <ChevronRight size={14} />
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons (Read/Unread toggle & Delete) */}
              <div
                className="absolute top-4 right-4 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {n.is_read ? (
                  <button
                    type="button"
                    title="Mark as unread"
                    onClick={() => markUnread.mutate(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <EyeOff size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Mark as read"
                    onClick={() => markRead.mutate(n.id)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Check size={16} />
                  </button>
                )}

                <button
                  type="button"
                  title="Delete notification"
                  onClick={() => deleteNotif.mutate(n.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Page {page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
