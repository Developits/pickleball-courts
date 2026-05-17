import { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId = null) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_id: notificationId,
          mark_all: !notificationId
        })
      });
      
      if (notificationId) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'match':
        return 'bg-blue-100 border-blue-400 text-blue-800';
      case 'team_invite':
        return 'bg-purple-100 border-purple-400 text-purple-800';
      case 'account_approved':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'check_in':
        return 'bg-teal-100 border-teal-400 text-teal-800';
      case 'queue':
        return 'bg-indigo-100 border-indigo-400 text-indigo-800';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification panel */}
          <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`mb-2 rounded-lg border-l-4 p-3 ${getNotificationColor(notification.type)} ${!notification.is_read ? 'font-medium' : ''}`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="font-semibold">{notification.title}</div>
                    <div className="text-sm">{notification.message}</div>
                    <div className="mt-1 text-xs opacity-70">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
