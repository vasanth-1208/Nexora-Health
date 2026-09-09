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
    
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.status(200).json(notification);
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const { targetId } = req.body;
    
    const filter = {
      $or: [
        { recipientId: targetId },
        { recipientId: (req as any).user?.role }
      ],
      isRead: false
    };

    await Notification.updateMany(filter, { isRead: true });
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
