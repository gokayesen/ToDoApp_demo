import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as notificationService from '../services/notification.service.js';

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await notificationService.listNotifications(req.userId!);
  res.json(notifications);
});

export const markReadHandler = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.params.notificationId!, req.userId!);
  res.json(notification);
});

export const markAllReadHandler = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await notificationService.markAllAsRead(req.userId!);
  res.json(notifications);
});

export const listPreferencesHandler = asyncHandler(async (req: Request, res: Response) => {
  const preferences = await notificationService.listPreferences(req.userId!);
  res.json(preferences);
});

export const updatePreferenceHandler = asyncHandler(async (req: Request, res: Response) => {
  const preference = await notificationService.updatePreference(req.userId!, req.body);
  res.json(preference);
});
