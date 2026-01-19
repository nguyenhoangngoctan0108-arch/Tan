
import { Equipment, EquipmentType, HistoryRecord, User, UserRole, MachineStatus } from '../types';

// Dữ liệu từ tab "tk" (tk, mk, phan quyen)
export const mockUsers: User[] = [
  { id: '1', username: 'admin', password: '123', fullName: 'Quản trị viên', role: UserRole.TO_TRUONG, department: 'Phòng Hành chính' },
  { id: '2', username: 'totruong', password: '123', fullName: 'Nguyễn Văn Tổ', role: UserRole.TO_TRUONG, department: 'Tổ Điện Lạnh' },
  { id: '3', username: 'nhomtruong', password: '123', fullName: 'Trần Văn Nhóm', role: UserRole.NHOM_TRUONG, department: 'Tổ Cơ Điện' },
  { id: '4', username: 'nhanvien', password: '123', fullName: 'Phạm Nhân Viên', role: UserRole.NHAN_VIEN, department: 'Đội Bảo Trì' },
  { id: '5', username: 'giamsat', password: '123', fullName: 'Lê Giám Sát', role: UserRole.GIAM_SAT, department: 'Ban Giám Đốc' }
];

export const mockEquipments: Equipment[] = [
  // Dữ liệu mẫu từ tab ML (Máy Lạnh)
  {
    id: "1",
    type: EquipmentType.ML,
    area: "KHU B LẦU 10B1",
    department: "Khoa Nội tổng quát (10B1)",
    room: "Phòng Số 1",
    brand: "Reetech",
    model: "DT9-DE-A",
    // Fix: Use MachineStatus enum instead of string literal
    status: MachineStatus.NORMAL,
    lastCheck: "2025-05-19T08:00:00Z",
    details: {
      "QL": "K",
      "Lắp Đặt Năm": "2019",
      "Ngày lắp": "1/1/2019",
      "MTS 2025": "DC42818/19.0009",
      "Serial dàn lạnh": "150101119318040252",
      "Serial dàn nóng": "150101521718040109",
      "Công suất (HP)": "1,0",
      "Môi chất lạnh": "R410a",
      "Loại máy": "Treo tường",
      "Tình trạng": "Máy cũ"
    }
  },
  {
    id: "2",
    type: EquipmentType.ML,
    area: "KHU B LẦU 10B1",
    department: "Khoa Nội tổng quát (10B1)",
    room: "Phòng Số 2",
    brand: "Reetech",
    model: "RT9-TB-BT",
    // Fix: Use MachineStatus enum instead of string literal
    status: MachineStatus.WARNING,
    lastCheck: "2025-05-20T09:30:00Z",
    details: {
      "QL": "K",
      "Lắp Đặt Năm": "2024",
      "Ngày lắp": "6/2/2025",
      "MTS 2025": "DC42818/25.0008",
      "Serial dàn lạnh": "120109282924054519",
      "Serial dàn nóng": "120109587924053716",
      "Công suất (HP)": "1,0",
      "Môi chất lạnh": "R32",
      "Loại máy": "Treo tường",
      "Tình trạng": "Máy mới"
    }
  },
  // Dữ liệu mẫu từ tab MNU (Máy Nước Uống)
  {
    id: "NU138",
    type: EquipmentType.MNU,
    area: "KHU E TRỆT",
    department: "Hòa trị trong ngày - Khoa Xạ trị",
    room: "Sảnh chờ",
    brand: "NAM PHÁT",
    model: "NP02UV",
    // Fix: Use MachineStatus enum instead of string literal
    status: MachineStatus.NORMAL,
    lastCheck: "2025-05-18T14:00:00Z",
    details: {
      "TSQT": "1",
      "MTS QT 2025": "DC408/21.0002",
      "Số lượng vòi": "1",
      "GAS": "R134a",
      "Kiểu máy": "Máy nước uống nóng lạnh",
      "Số lượng lọc": "1",
      "Lọc": "Lọc 3 cấp"
    }
  },
  // Dữ liệu mẫu từ tab TL (Tủ Lạnh)
  {
    id: "TL351",
    type: EquipmentType.TL,
    area: "KHU D LẦU 8",
    department: "Khoa Nội thận",
    room: "Phòng điều dưỡng nữ",
    brand: "TOSHIBA",
    model: "GR-A28VM",
    // Fix: Use MachineStatus enum instead of string literal
    status: MachineStatus.NORMAL,
    lastCheck: "2025-05-15T10:00:00Z",
    details: {
      "TSQT": "1",
      "MTS QT 2025": "416/18N.0009",
      "Srial máy": "B9000Q00100TZKA2210",
      "Dung tích": "180L",
      "Công suất (W)": "85",
      "Loại Gas": "R600a",
      "Kiểu Máy": "Tủ Lạnh",
      "Năm sản xuất": "2021"
    }
  }
];

export const mockHistory: HistoryRecord[] = [
  {
    id: "H1",
    machineId: "1",
    type: "Kiểm tra",
    timestamp: "2025-05-21T08:30:00Z",
    status: "Bình thường",
    notes: "Vệ sinh lưới lọc, nhiệt độ ổn định.",
    performer: "Phạm Nhân Viên",
    details: {
      "Nhiệt độ phòng": "24°C",
      "Dòng (A)": "3.8",
      "Rò nước": "Không"
    }
  }
];