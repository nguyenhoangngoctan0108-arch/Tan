
import React, { useMemo } from 'react';
import { Equipment, EquipmentType } from '../types';

interface EquipmentCardProps {
  equipment: Equipment;
  onSelect: (id: string) => void;
}

// Helper để lấy ảnh đại diện từ details
const getThumbnail = (details: Record<string, string>) => {
  const imageField = Object.entries(details).find(([k, v]) => 
    (k.toLowerCase().includes('ảnh') || k.toLowerCase().includes('link') || k.toLowerCase().includes('hình')) 
    && v && v.toString().startsWith('http')
  );
  
  if (imageField) {
    const url = imageField[1];
    const driveMatch = url.match(/\/(?:file\/d\/|open\?id=|id=)([\w-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/u/0/d/${driveMatch[1]}=w200`;
    }
    return url;
  }
  return null;
};

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onSelect }) => {
  const thumbnailUrl = useMemo(() => getThumbnail(equipment.details), [equipment.details]);

  const getIcon = () => {
    switch (equipment.type) {
      case EquipmentType.ML: return '❄️';
      case EquipmentType.MNU: return '💧';
      case EquipmentType.TL: return '🧊';
      default: return '⚙️';
    }
  };

  const getStatusColor = () => {
    switch (equipment.status) {
      case 'Bình thường': return 'emerald';
      case 'Cần chú ý': return 'amber';
      case 'Hỏng': return 'rose';
      default: return 'blue';
    }
  };

  const color = getStatusColor();
  
  // Hiển thị số máy thật (không tiền tố)
  const displayId = equipment.id.split('-').pop();

  return (
    <div 
      onClick={() => onSelect(equipment.id)}
      className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5 hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer active:scale-[0.97] group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center rounded-2xl group-hover:bg-blue-50 transition-colors text-3xl z-0">
              {getIcon()}
            </div>
            {thumbnailUrl && (
              <img 
                src={thumbnailUrl} 
                className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10 border border-slate-100" 
                alt="thumb" 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-black text-lg text-slate-900 leading-tight">Máy số: {displayId}</h3>
              <div className={`w-2 h-2 rounded-full bg-${color}-500 shadow-[0_0_8px] shadow-${color}-200`}></div>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{equipment.brand} • {equipment.model}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 bg-${color}-50 text-${color}-600 text-[9px] font-black rounded-lg uppercase tracking-wider`}>
          {equipment.status}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 border-t border-slate-50 pt-4">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 text-slate-300" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <div>
            <p className="text-[11px] font-black text-slate-800 leading-tight mb-0.5">{equipment.area}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">{equipment.department} • {equipment.room}</p>
          </div>
        </div>
      </div>
      
      {equipment.lastCheck && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Kiểm tra gần nhất:</p>
          <p className="text-[10px] font-black text-blue-500 uppercase">{new Date(equipment.lastCheck).toLocaleDateString('vi-VN')}</p>
        </div>
      )}
    </div>
  );
};

export default EquipmentCard;
