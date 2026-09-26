import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/services';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const Notifications = () => {
  const { isDark } = useTheme();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getMyNotifications({ limit: 50 }).then(r => r.data)
  });

  const markAll = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => { toast.success('All notifications read'); qc.invalidateQueries(['notifications']); }
  });

  const markOne = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications'])
  });

  const notifications = data?.data || [];
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Notifications</h2>
          {unread > 0 && <p className="text-sm text-blue-600 mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={() => markAll.mutate()}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className={`card p-12 text-center ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
          <Bell size={40} className="mx-auto text-slate-300 mb-3" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markOne.mutate(n.id)}
              className={`card p-4 flex items-start gap-4 cursor-pointer transition-all hover:shadow-md
                ${!n.is_read ? isDark ? 'border-l-4 border-l-blue-500 bg-blue-900/10' : 'border-l-4 border-l-blue-500 bg-blue-50' : ''}
                ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`}>
                <Bell size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{n.title}</p>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{n.message}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Clock size={12} className="text-slate-400" />
                  <p className="text-xs text-slate-400">{dayjs(n.created_at).fromNow()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
