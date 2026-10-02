const { Notification } = require('../models/Notification');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const notificationController = {
  async getMyNotifications(req, res) {
    const { page, limit } = getPagination(req.query);
    const unreadOnly = req.query.unread === 'true' || req.query.unreadOnly === 'true';

    const data = await Notification.getByUser(req.user.userId, { page, limit, unreadOnly });
    return sendPaginated(
      res,
      data.notifications,
      buildPaginationMeta(data.total, page, limit),
      `Notifications fetched (${data.unreadCount} unread)`
    );
  },

  async getUnreadCount(req, res) {
    const count = await Notification.getUnreadCount(req.user.userId);
    return sendSuccess(res, { unreadCount: count });
  },

  async markAsRead(req, res) {
    const notification = await Notification.markAsRead(req.params.id, req.user.userId);
    if (!notification) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, notification, 'Notification marked as read');
  },

  async markAsUnread(req, res) {
    const notification = await Notification.markAsUnread(req.params.id, req.user.userId);
    if (!notification) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, notification, 'Notification marked as unread');
  },

  async markAllAsRead(req, res) {
    await Notification.markAllAsRead(req.user.userId);
    return sendSuccess(res, null, 'All notifications marked as read');
  },

  async delete(req, res) {
    const deleted = await Notification.delete(req.params.id, req.user.userId);
    if (!deleted) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, null, 'Notification deleted');
  }
};

module.exports = notificationController;
