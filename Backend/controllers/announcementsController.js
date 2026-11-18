import * as announcements from '../services/announcements.js';
import { flushPushNotifications } from '../services/appService.js';

export const list = async (req, res) => res.json(await announcements.listAnnouncements(req));
export const post = async (req, res) => {
  const result = await announcements.saveAnnouncement(req);
  await flushPushNotifications(req.db);
  res.status(201).json(result);
};
export const edit = async (req, res) => res.json(await announcements.saveAnnouncement(req, true));
export const remove = async (req, res) => res.json(await announcements.deleteAnnouncement(req));
