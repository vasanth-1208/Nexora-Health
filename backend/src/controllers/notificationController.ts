import { Request, Response } from 'express';
import { Notification } from '../models';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params; // Can be patientId, employeeId, or role name
    
    // Find notifications matching targetId or the user's role
    const filter = {
      $or: [
        { recipientId: targetId },
        { recipientId: (req as any).user?.role }
      ]
    };

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json(notifications);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const caller = (req as any).user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // IDOR check: caller must be recipient, match recipient role, or be ADMIN
    const isOwner =
      notification.recipientId === caller.userId?.toString() ||
      notification.recipientId === caller.username ||
      notification.recipientId === caller.role ||
      caller.role === 'ADMIN';

    if (!isOwner) {
      return res.status(403).json({ message: 'Access denied: You cannot mark another user\'s notification as read.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    
    // Always derive recipient target from authenticated session, do not trust client body
    const allowedRecipients = [caller.userId?.toString(), caller.username, caller.role].filter(Boolean);

    const filter = {
      recipientId: { $in: allowedRecipients },
      isRead: false,
    };

    await Notification.updateMany(filter, { isRead: true });
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
