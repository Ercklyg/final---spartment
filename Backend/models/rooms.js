import { HttpError } from '../middleware/errors.js';
import * as validate from '../services/validation.js';

export const roomColumns = 'id,room_number,floor,status,monthly_rate,description,size_sqm,capacity,buildings(name),tenant_assignments(full_name)';

function checked(result) {
  if (result.error?.code === '23505') throw new HttpError(409, 'That room number already exists in this building.');
  if (result.error) throw new HttpError(400, result.error.message);
  return result.data;
}

async function roomDetails(db, input) {
  const body = validate.object(input);
  const buildingName = validate.text(body.building, 'building name', 160);
  const room = {
    room_number: validate.text(body.room, 'room number', 40),
    floor: validate.number(body.floor, 'floor', 1, 1000, true),
    size_sqm: validate.number(body.size, 'room size', 8, 14),
    monthly_rate: validate.amount(body.rate, 'monthly rate'),
    capacity: validate.choice(String(body.capacity), ['2', '3', '2-3'], 'capacity') + ' persons',
    description: validate.text(body.notes, 'description', 4000, true),
  };
  if (!/^\d{3,}$/.test(room.room_number)) throw new HttpError(400, 'Enter a room number with at least 3 digits.');
  let building = checked(await db.from('buildings').select('id').eq('name', buildingName).maybeSingle());
  if (!building) building = checked(await db.from('buildings').insert({ name: buildingName }).select('id').single());
  return { ...room, building_id: building.id };
}

export async function createRoom(db, input) {
  const room = await roomDetails(db, input);
  return checked(await db.from('rooms').insert({ ...room, status: 'available' }).select(roomColumns).single());
}

export async function updateRoom(db, id, input) {
  validate.uuid(id, 'room ID');
  const existing = checked(await db.from('rooms').select('id').eq('id', id).maybeSingle());
  if (!existing) throw new HttpError(404, 'Room not found. Reload the room list.');
  const room = await roomDetails(db, input);
  // Listing edits do not change occupancy or a tenant's agreed lease rent.
  const updated = checked(await db.from('rooms').update(room).eq('id', id).select(roomColumns).maybeSingle());
  if (!updated) throw new HttpError(404, 'Room not found. Reload the room list.');
  return updated;
}

export async function deleteRoom(db, id) {
  validate.uuid(id, 'room ID');
  // Foreign keys also protect references created concurrently with this delete.
  const result = await db.from('rooms').delete().eq('id', id).select('id').maybeSingle();
  if (result.error?.code === '23503') throw new HttpError(409, 'This room is linked to tenant, lease, or request records and cannot be deleted.');
  const deleted = checked(result);
  if (!deleted) throw new HttpError(404, 'Room not found. Reload the room list.');
  return { ok: true, id: deleted.id };
}
