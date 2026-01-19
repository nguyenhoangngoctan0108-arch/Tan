
export enum EquipmentType {
  ML = 'Máy Lạnh',
  MNU = 'Máy Nước Uống',
  TL = 'Tủ Lạnh'
}

export enum UserRole {
  TO_TRUONG = 'Tổ trưởng',
  NHOM_TRUONG = 'Nhóm trưởng',
  GIAM_SAT = 'Giám sát',
  NHAN_VIEN = 'Nhân viên'
}

export enum MachineStatus {
  NORMAL = 'Bình thường',
  WARNING = 'Cần chú ý',
  BROKEN = 'Hỏng'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  department: string;
}

export type RecordType = 'Kiểm tra' | 'Sự cố';

export interface HistoryRecord {
  id: string;
  machineId: string;
  type: RecordType;
  timestamp: string;
  status: string;
  notes: string;
  performer: string;
  photoUrl?: string;
  details?: Record<string, string>;
  isReadByLeader?: boolean;
}

export interface Equipment {
  id: string;
  type: EquipmentType;
  area: string;
  department: string;
  room: string;
  model: string;
  brand: string;
  status: MachineStatus;
  lastCheck?: string;
  details: Record<string, string>;
  images?: string[];
}
