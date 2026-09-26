const { Notification } = require('../models/Notification');
const { sendSuccess, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const notificationController = {
  async getMyNotifications(req, res) {
    const { page, limit } = getPagination(req.query);
    const unreadOnly = req.query.unreadOnly === 'true';

    const data = await Notification.getByUser(req.user.userId, { page, limit, unreadOnly });
    return sendPaginated(
      res,
      data.notifications,
      buildPaginationMeta(data.total, page, limit),
      `Notifications fetched (${data.unreadCount} unread)`
    );
  },

  async markAsRead(req, res) {
    const notification = await Notification.markAsRead(req.params.id, req.user.userId);
    return sendSuccess(res, notification, 'Notification marked as read');
  },

  async markAllAsRead(req, res) {
    await Notification.markAllAsRead(req.user.userId);
    return sendSuccess(res, null, 'All notifications marked as read');
  }
};

module.exports = notificationController;
