
import { Equipment, EquipmentType, MachineStatus, User, UserRole, HistoryRecord, RecordType } from '../types';

const SHEET_ID = '1XgFRd4_EZmSEFdtLhAWx3Doim4C3PPMRBWLBHjf8g2E';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzoMz0zYPaFEqRogNl6BX5ut_DpBDEX00ZLLOGJ1c-GRIxG4djHLyGMzqaQHGaczJY/exec'; 

/**
 * Robust CSV Parser
 * Handles quoted fields, escaped quotes, and newlines within fields.
 */
const parseCSV = (csvText: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; 
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      
      currentRow.push(currentField.trim());
      if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];
  
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i].toString().trim() : '';
    });
    return obj;
  });
};

/**
 * Finds a value in a record based on multiple possible key names.
 * Case-insensitive and whitespace-insensitive.
 */
const getValue = (obj: Record<string, string>, possibleKeys: string[]) => {
  const keys = Object.keys(obj);
  for (const pk of possibleKeys) {
    const foundKey = keys.find(k => k.trim().toLowerCase() === pk.trim().toLowerCase());
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
      const val = obj[foundKey].toString().trim();
      if (val !== '') return val;
    }
  }
  return '';
};

export const fetchSheetData = async (sheetName: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
};

export const fetchHistoryData = async (): Promise<HistoryRecord[]> => {
  const data = await fetchSheetData('NHAT_KY_THIET_BI');
  return data.map((item, index) => {
    const ngay = getValue(item, ['Ngày', 'Ngay']);
    const gio = getValue(item, ['Giờ', 'Gio', 'Time']);
    const loaiBC = getValue(item, ['Loại báo cáo', 'Loai bao cao', 'Loại BC']);
    const maySo = getValue(item, ['Máy số', 'May so', 'MTS', 'MTS 2025', 'MTS QT 2025', 'STT']);
    const photo = getValue(item, ['Link Ảnh Thực Tế', 'Link Anh Thuc Te', 'Ảnh', 'Photo']);

    let timestamp = new Date().toISOString();
    try {
      if (ngay) {
        const parts = ngay.split('/');
        const dateStr = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : ngay;
        const timeStr = gio || '00:00';
        timestamp = new Date(`${dateStr}T${timeStr}`).toISOString();
      }
    } catch (e) {
      console.warn("Lỗi định dạng ngày tháng:", ngay);
    }

    return {
      id: `SHEET-${index}-${Date.now()}`,
      machineId: maySo || 'N/A',
      type: (loaiBC.toLowerCase().includes('sự cố') ? 'Sự cố' : 'Kiểm tra') as RecordType,
      timestamp: timestamp,
      status: loaiBC || 'Đã kiểm tra',
      notes: getValue(item, ['GHI CHÚ', 'Ghi chú', 'Note']),
      performer: getValue(item, ['KTV thực hiện', 'KTV']),
      photoUrl: photo || undefined,
      details: { ...item }
    };
  }).reverse();
};

export const loadAllData = async (): Promise<{ equipments: Equipment[], users: User[], history: HistoryRecord[] }> => {
  try {
    const [mlData, mnuData, tlData, userData, historyData] = await Promise.all([
      fetchSheetData('ML'),
      fetchSheetData('MNU'),
      fetchSheetData('TL'),
      fetchSheetData('tk'),
      fetchHistoryData()
    ]);

    const mapToEquipment = (item: Record<string, string>, type: EquipmentType): Equipment => {
      // Ưu tiên Máy số, sau đó đến các MTS, cuối cùng là STT làm định danh hiển thị
      const rawId = getValue(item, ['Máy số', 'MTS 2025', 'MTS QT 2025', 'MTS', 'ID', 'STT']) || 'N/A';
      
      // Tạo ID duy nhất bằng cách kết hợp loại và ID thô (ví dụ: ML-1, MNU-138)
      // Điều này ngăn chặn việc tìm nhầm thiết bị khi có cùng số máy ở các sheet khác nhau
      const typeCode = type === EquipmentType.ML ? 'ML' : type === EquipmentType.MNU ? 'MNU' : 'TL';
      const uniqueId = `${typeCode}-${rawId}`;

      const area = getValue(item, ['Khu vực', 'Vị trí', 'Khu Vực', 'Khu vuc']);
      const department = getValue(item, ['Khoa/Phòng', 'Khoa', 'Đơn vị', 'Bộ phận', 'Khoa/Phong']);
      const room = getValue(item, ['Phòng', 'Số phòng', 'Phong']);

      return {
        id: uniqueId,
        type,
        area: area || 'N/A',
        department: department || 'N/A',
        room: room || 'N/A',
        brand: getValue(item, ['Hiệu', 'Brand', 'Hieu', 'Hieu may']) || 'N/A',
        model: getValue(item, ['Model', 'Model may']) || 'N/A',
        status: (getValue(item, ['Tình trạng', 'Tinh trang']).toLowerCase().includes('hỏng') ? MachineStatus.BROKEN : 
                 getValue(item, ['Tình trạng', 'Tinh trang']).toLowerCase().includes('chú ý') ? MachineStatus.WARNING : 
                 MachineStatus.NORMAL),
        details: { ...item }
      };
    };

    const equipments: Equipment[] = [
      ...mlData
        .filter(i => getValue(i, ['Máy số', 'MTS 2025', 'MTS', 'STT']) !== '')
        .map(i => mapToEquipment(i, EquipmentType.ML)),
      ...mnuData
        .filter(i => getValue(i, ['Máy số', 'MTS QT 2025', 'MTS', 'STT']) !== '')
        .map(i => mapToEquipment(i, EquipmentType.MNU)),
      ...tlData
        .filter(i => getValue(i, ['Máy số', 'MTS QT 2025', 'MTS', 'STT']) !== '')
        .map(i => mapToEquipment(i, EquipmentType.TL))
    ];

    const users: User[] = userData.map(u => ({
      id: u['tk'] || Math.random().toString(),
      username: u['tk'] || '',
      password: u['mk'] || '123',
      fullName: u['Ten'] || 'Người dùng',
      role: (u['role'] as UserRole) || UserRole.NHAN_VIEN,
      department: u['donvi'] || 'N/A'
    }));

    return { equipments, users, history: historyData };
  } catch (err) {
    console.error("Lỗi đồng bộ dữ liệu:", err);
    return { equipments: [], users: [], history: [] };
  }
};

export const submitReport = async (payload: any) => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (error) {
    console.error("Lỗi gửi dữ liệu:", error);
    return false; 
  }
};
