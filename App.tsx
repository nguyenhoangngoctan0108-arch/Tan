
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Equipment, EquipmentType, HistoryRecord, User, UserRole, MachineStatus } from './types';
import { loadAllData, submitReport, fetchHistoryData } from './services/sheetService';
import EquipmentCard from './components/EquipmentCard';
import CameraCapture from './components/CameraCapture';

const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1I_BfAxXX-5UrkMTf8CWFr2Dd4gM9EKo_";

const getDirectDriveUrl = (url: string) => {
  if (!url || typeof url !== 'string') return null;
  const driveMatch = url.match(/\/(?:file\/d\/|open\?id=|id=)([\w-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/u/0/d/${driveMatch[1]}=w1600`;
  }
  return url.startsWith('http') ? url : null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ql_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [appUsers, setAppUsers] = useState<User[]>([]);
  
  const [view, setView] = useState<'LIST' | 'DETAIL' | 'FORM' | 'HISTORY' | 'PROFILE'>('LIST');
  const [formType, setFormType] = useState<'CHECKIN' | 'INCIDENT'>('CHECKIN');
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [search, setSearch] = useState('');
  
  // Lưu tab và filter vào session để khi refresh hoặc quay lại từ Form vẫn giữ được ngữ cảnh
  const [activeTab, setActiveTab] = useState<EquipmentType>(() => {
    const saved = sessionStorage.getItem('app_active_tab');
    return (saved as EquipmentType) || EquipmentType.ML;
  });
  
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'ALL'>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  
  const [localHistory, setLocalHistory] = useState<HistoryRecord[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('app_active_tab', activeTab);
  }, [activeTab]);

  const isLeader = useMemo(() => {
    if (!user) return false;
    return [UserRole.TO_TRUONG, UserRole.NHOM_TRUONG, UserRole.GIAM_SAT].includes(user.role);
  }, [user]);

  const newIncidentsCount = useMemo(() => {
    if (!isLeader) return 0;
    const recentThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return localHistory.filter(r => r.type === 'Sự cố' && new Date(r.timestamp) > recentThreshold).length;
  }, [localHistory, isLeader]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const data = await loadAllData();
        setEquipments(data.equipments);
        setAppUsers(data.users);
        setLocalHistory(data.history);
      } catch (error) {
        console.error("Lỗi tải dữ liệu ban đầu:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem('ql_user_session', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ql_user_session');
    sessionStorage.clear();
  };

  const availableAreas = useMemo(() => {
    const areas = equipments
      .filter(e => e.type === activeTab)
      .map(e => e.area.trim())
      .filter(a => a && a !== 'N/A' && a !== '');
    return Array.from(new Set(areas)).sort();
  }, [equipments, activeTab]);

  const availableDepts = useMemo(() => {
    const depts = equipments
      .filter(e => e.type === activeTab && (areaFilter === 'ALL' || e.area.trim() === areaFilter.trim()))
      .map(e => e.department.trim())
      .filter(d => d && d !== 'N/A' && d !== '');
    return Array.from(new Set(depts)).sort();
  }, [equipments, activeTab, areaFilter]);

  const handleAreaFilterChange = (val: string) => {
    setAreaFilter(val);
    setDeptFilter('ALL');
  };

  const handleDeptFilterChange = (val: string) => {
    setDeptFilter(val);
    if (val !== 'ALL') {
      const match = equipments.find(e => e.type === activeTab && e.department.trim() === val.trim());
      if (match && match.area.trim() !== areaFilter.trim()) {
        setAreaFilter(match.area.trim());
      }
    }
  };

  const filteredEq = useMemo(() => {
    // Luôn đảm bảo equipments được tải trước khi lọc
    if (!equipments.length) return [];
    
    return equipments.filter(e => {
      const matchTab = e.type === activeTab;
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const matchArea = areaFilter === 'ALL' || e.area.trim() === areaFilter.trim();
      const matchDept = deptFilter === 'ALL' || e.department.trim() === deptFilter.trim();
      
      const searchLower = search.toLowerCase().trim();
      // Loại bỏ tiền tố ID khi tìm kiếm để người dùng chỉ cần gõ số máy
      const displayId = (e.id || '').split('-').pop() || '';
      
      const matchSearch = searchLower === '' || 
                          displayId.toLowerCase().includes(searchLower) || 
                          (e.id || '').toString().toLowerCase().includes(searchLower) || 
                          (e.room || '').toString().toLowerCase().includes(searchLower) ||
                          (e.area || '').toString().toLowerCase().includes(searchLower) ||
                          (e.department || '').toString().toLowerCase().includes(searchLower);
                          
      return matchTab && matchStatus && matchArea && matchDept && matchSearch;
    });
  }, [equipments, activeTab, search, statusFilter, areaFilter, deptFilter]);

  const handleSelectEq = useCallback((uniqueId: string) => {
    // Sử dụng uniqueId để tìm chính xác máy, tránh nhầm lẫn giữa các loại
    const eq = equipments.find(e => e.id === uniqueId);
    if (eq) {
      setSelectedEq(eq);
      setView('DETAIL');
    }
  }, [equipments]);

  const handleSubmitForm = async (formData: Record<string, string>) => {
    setIsSubmitting(true);
    const now = new Date();
    
    // Khi gửi dữ liệu, sử dụng ID thô (không tiền tố) để lưu vào Sheet cho đúng định dạng
    const rawId = (selectedEq?.id || '').split('-').pop() || 'N/A';

    const payload = {
      sheet: 'NHAT_KY_THIET_BI',
      photoData: capturedPhoto,
      notifyManagers: formType === 'INCIDENT',
      data: {
        'Ngày': now.toLocaleDateString('vi-VN'),
        'Giờ': now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        'Loại báo cáo': formType === 'CHECKIN' ? 'Kiểm tra hằng ngày' : 'Báo cáo sự cố',
        'Máy số': rawId,
        'Loại máy': selectedEq?.type,
        'Khu vực': selectedEq?.area,
        'Khoa/Phòng': selectedEq?.department,
        'Phòng': selectedEq?.room,
        ...formData,
        'KTV thực hiện': user?.fullName,
        'Đơn vị KTV': user?.department,
        'Ghi chú': formData['GHI CHÚ'] || '',
        'Link Folder Drive': DRIVE_FOLDER_URL
      }
    };

    try {
      const success = await submitReport(payload);
      if (success) {
        // Sau khi gửi thành công, tải lại lịch sử nhưng GIỮ NGUYÊN bộ lọc hiện tại của danh sách
        const updatedHistory = await fetchHistoryData();
        setLocalHistory(updatedHistory);
        alert(formType === 'INCIDENT' ? "Đã gửi báo cáo sự cố thành công!" : "Gửi dữ liệu kiểm tra thành công!");
        setView('LIST');
        setCapturedPhoto(null);
      } else {
        alert("Lỗi khi gửi dữ liệu lên máy chủ.");
      }
    } catch (error) {
      alert("Đã có lỗi xảy ra khi gửi dữ liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await loadAllData();
      setEquipments(data.equipments);
      setAppUsers(data.users);
      setLocalHistory(data.history);
      // Giữ nguyên tab và filters hiện tại
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-xl font-black text-slate-800 tracking-tight">Đang tải dữ liệu...</h2>
    </div>
  );

  if (!user) return <LoginView onLogin={login} users={appUsers} />;

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-[#F8FAFC] flex flex-col relative select-none">
      {isSubmitting && (
        <div className="fixed inset-0 z-[200] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Đang gửi...</p>
        </div>
      )}

      {isLeader && newIncidentsCount > 0 && view !== 'HISTORY' && (
        <div 
          onClick={() => setView('HISTORY')}
          className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce flex items-center gap-3 border-2 border-white cursor-pointer active:scale-95"
        >
           <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
           <span className="text-[10px] font-black uppercase tracking-widest">Có {newIncidentsCount} sự cố mới!</span>
        </div>
      )}

      {view === 'LIST' && (
        <header className="sticky top-0 z-40 bg-[#F8FAFC]/80 backdrop-blur-2xl px-6 pt-8 pb-4 space-y-4 border-b border-slate-100/50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">BVCR - ĐIỆN LẠNH</p>
              <h1 className="text-2xl font-black text-slate-900 leading-none">{user.fullName}</h1>
            </div>
            <button onClick={handleRefresh} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-500 active:scale-90 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            </button>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm mã máy, vị trí, khoa..."
              className="w-full pl-12 pr-6 py-4 bg-white shadow-xl shadow-slate-200/20 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="absolute left-4 top-4 text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {Object.values(EquipmentType).map(t => (
                <button 
                  key={t}
                  onClick={() => { 
                    setActiveTab(t); 
                    setStatusFilter('ALL'); 
                    setAreaFilter('ALL'); 
                    setDeptFilter('ALL'); 
                  }}
                  className={`flex-none px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-50'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="bg-white rounded-xl border border-slate-100 px-2 py-2 flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none">Trạng thái</span>
                <select 
                  className="bg-transparent text-[10px] font-black text-slate-700 outline-none w-full appearance-none truncate"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value={MachineStatus.NORMAL}>Bình thường</option>
                  <option value={MachineStatus.WARNING}>Chú ý</option>
                  <option value={MachineStatus.BROKEN}>Hỏng</option>
                </select>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 px-2 py-2 flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none">Khu vực</span>
                <select 
                  className="bg-transparent text-[10px] font-black text-slate-700 outline-none w-full appearance-none truncate"
                  value={areaFilter}
                  onChange={e => handleAreaFilterChange(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  {availableAreas.map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 px-2 py-2 flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none">Khoa/Phòng</span>
                <select 
                  className="bg-transparent text-[10px] font-black text-slate-700 outline-none w-full appearance-none truncate"
                  value={deptFilter}
                  onChange={e => handleDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  {availableDepts.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-between px-1">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                 {search || statusFilter !== 'ALL' || areaFilter !== 'ALL' || deptFilter !== 'ALL' ? 'Kết quả tìm kiếm' : 'Tổng thiết bị'}
               </span>
               <div className="px-2 py-0.5 bg-blue-50 rounded-md">
                 <span className="text-[10px] font-black text-blue-600 uppercase">
                    {filteredEq.length} máy
                 </span>
               </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {view === 'LIST' && (
          <div className="px-6 space-y-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredEq.length > 0 ? (
              filteredEq.map(e => <EquipmentCard key={e.id} equipment={e} onSelect={handleSelectEq} />)
            ) : (
              <EmptyState message={`Không tìm thấy thiết bị.`} />
            )}
          </div>
        )}

        {view === 'DETAIL' && selectedEq && (
          <DetailView 
            eq={selectedEq} 
            onBack={() => setView('LIST')} 
            onCheckin={() => { setFormType('CHECKIN'); setView('FORM'); }}
            onIncident={() => { setFormType('INCIDENT'); setView('FORM'); }}
            role={user.role}
          />
        )}

        {view === 'FORM' && selectedEq && (
          <FormView 
            type={formType}
            eq={selectedEq}
            onBack={() => setView('DETAIL')}
            onSubmit={handleSubmitForm}
            photo={capturedPhoto}
            setPhoto={setCapturedPhoto}
            openCamera={() => setIsCameraOpen(true)}
          />
        )}

        {view === 'HISTORY' && <HistoryView records={localHistory} onRefresh={handleRefresh} isLeader={isLeader} />}
        {view === 'PROFILE' && <ProfileView user={user} onLogout={logout} />}
      </main>

      {(view === 'LIST' || view === 'HISTORY' || view === 'PROFILE') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-10 pt-4 pb-8 flex justify-between items-center z-50">
          <button onClick={() => setView('LIST')} className={`flex flex-col items-center gap-1 transition-all ${view === 'LIST' ? 'text-blue-600' : 'text-slate-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={view === 'LIST' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">DANH SÁCH</span>
          </button>
          <button onClick={() => setView('HISTORY')} className={`flex flex-col items-center gap-1 relative transition-all ${view === 'HISTORY' ? 'text-blue-600' : 'text-slate-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">HOẠT ĐỘNG</span>
            {isLeader && newIncidentsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                {newIncidentsCount}
              </span>
            )}
          </button>
          <button onClick={() => setView('PROFILE')} className={`flex flex-col items-center gap-1 transition-all ${view === 'PROFILE' ? 'text-blue-600' : 'text-slate-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">CÁ NHÂN</span>
          </button>
        </nav>
      )}

      {isCameraOpen && <CameraCapture onCapture={(b64) => { setCapturedPhoto(b64); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

const LoginView = ({ onLogin, users }: { onLogin: (u: User) => void, users: User[] }) => {
  const [form, setForm] = useState({ u: '', p: '' });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username === form.u && u.password === form.p);
    if (foundUser) onLogin(foundUser); else alert("Sai tài khoản hoặc mật khẩu!");
  };
  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-8">
      <div className="w-full max-sm bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-500">
        <h1 className="text-2xl font-black text-slate-900 text-center mb-1">Đăng Nhập</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Tài khoản" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-700" value={form.u} onChange={e => setForm({...form, u: e.target.value})} />
          <input type="password" placeholder="Mật khẩu" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-700" value={form.p} onChange={e => setForm({...form, p: e.target.value})} />
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl mt-6 uppercase tracking-widest">Đăng Nhập</button>
        </form>
      </div>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-10 text-center text-slate-400 font-bold text-sm">
    <p>{message}</p>
  </div>
);

const HistoryView = ({ records, onRefresh, isLeader }: { records: HistoryRecord[], onRefresh: () => void, isLeader: boolean }) => {
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  if (selectedRecord) {
    const directPhotoUrl = selectedRecord.photoUrl ? getDirectDriveUrl(selectedRecord.photoUrl) : null;

    return (
      <div className="min-h-screen bg-white animate-in slide-in-from-right duration-500 pb-20 overflow-y-auto no-scrollbar">
        <div className="bg-slate-900 p-8 pt-16 pb-20 text-white">
          <button onClick={() => setSelectedRecord(null)} className="p-3 bg-white/10 rounded-xl mb-6 active:scale-90 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className="text-3xl font-black leading-tight">Máy: {selectedRecord.machineId}</h2>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${selectedRecord.type === 'Sự cố' ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedRecord.status}</p>
        </div>

        <div className="px-6 -mt-10 relative z-10 space-y-6 pb-20">
          {directPhotoUrl && (
            <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
               <img src={directPhotoUrl} className="w-full h-full object-cover" alt="Check photo" />
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chi tiết</p>
              <div className="grid grid-cols-2 gap-4">
                {selectedRecord.details && Object.entries(selectedRecord.details).map(([k, v]) => {
                  if (['Link Ảnh Thực Tế', 'Link Folder Drive', 'Link Anh Thuc Te'].includes(k)) return null;
                  if (!v || v.toString().trim() === '') return null;
                  return (
                    <div key={k} className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{k}</p>
                      <p className="text-sm font-black text-slate-800">{v}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Người thực hiện</p>
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-sm uppercase">
                     {selectedRecord.performer?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{selectedRecord.performer}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{selectedRecord.notes || 'Không ghi chú'}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-10 space-y-6 pb-24">
      <div className="flex justify-between items-end mb-4">
        <h1 className="text-3xl font-black text-slate-900 leading-none">Hoạt Động</h1>
        <button onClick={onRefresh} className="p-2 text-blue-600 active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        </button>
      </div>
      
      <div className="space-y-4">
        {records.length > 0 ? records.map((r) => (
          <div key={r.id} onClick={() => setSelectedRecord(r)} className={`bg-white p-5 rounded-[2rem] shadow-sm border ${r.type === 'Sự cố' ? 'border-rose-100 bg-rose-50/20' : 'border-slate-50'} flex items-center gap-5 cursor-pointer relative active:scale-[0.98] transition-all`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${r.type === 'Sự cố' ? 'bg-rose-100/50' : 'bg-emerald-50'}`}>
               {r.type === 'Sự cố' ? '⚠️' : '✅'}
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-black text-slate-800 text-sm">Máy: {r.machineId}</h4>
              <p className={`text-[10px] ${r.type === 'Sự cố' ? 'text-rose-600' : 'text-slate-400'} font-black uppercase truncate`}>{r.status}</p>
              <p className="text-[9px] text-slate-300 font-bold mt-1 uppercase">{new Date(r.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
            </div>
            {isLeader && r.type === 'Sự cố' && (
              <div className="absolute top-4 right-4">
                 <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span>
              </div>
            )}
          </div>
        )) : <EmptyState message="Không có dữ liệu hoạt động." />}
      </div>
    </div>
  );
};

const ProfileView = ({ user, onLogout }: { user: User, onLogout: () => void }) => (
  <div className="p-10 text-center pt-24 animate-in zoom-in duration-300">
    <div className="w-32 h-32 bg-blue-600 text-white rounded-[3rem] flex items-center justify-center text-5xl mx-auto mb-8 font-black border-4 border-white shadow-2xl relative uppercase">
      {user.fullName.charAt(0)}
    </div>
    <h2 className="text-2xl font-black text-slate-900 mb-1">{user.fullName}</h2>
    <div className="flex flex-col gap-1">
      <p className="text-blue-600 font-black uppercase text-[10px] tracking-widest">{user.role}</p>
      <p className="text-slate-400 font-bold text-xs">{user.department}</p>
    </div>
    <button onClick={onLogout} className="w-full bg-rose-50 text-rose-600 py-6 rounded-2xl font-black mt-16 uppercase border-2 border-rose-100 active:scale-95 transition-all shadow-sm">Đăng Xuất</button>
  </div>
);

const DetailView = ({ eq, onBack, onCheckin, onIncident, role }: { eq: Equipment, onBack: () => void, onCheckin: () => void, onIncident: () => void, role: UserRole }) => {
  const [zoomImg, setZoomImg] = useState<{url: string, label: string} | null>(null);

  const imageLinks = useMemo(() => {
    return Object.entries(eq.details)
      .filter(([k, v]) => (k.toLowerCase().includes('ảnh') || k.toLowerCase().includes('link') || k.toLowerCase().includes('hình')) && v && v.toString().startsWith('http'))
      .map(([k, v]) => ({ label: k, url: getDirectDriveUrl(v.toString()) }))
      .filter(item => item.url !== null);
  }, [eq.details]);

  // Hiển thị số máy thật (không tiền tố)
  const displayId = eq.id.split('-').pop();

  return (
    <div className="bg-white min-h-screen pb-20 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
      {zoomImg && <ImageLightbox url={zoomImg.url} label={zoomImg.label} onClose={() => setZoomImg(null)} />}

      <div className="bg-blue-600 p-6 pt-16 pb-24 text-white relative">
        <button onClick={onBack} className="p-3 bg-white/20 rounded-xl mb-8 active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg></button>
        <div className="flex items-center gap-6">
          <div className="text-4xl bg-white/20 w-20 h-20 flex items-center justify-center rounded-3xl backdrop-blur-md border border-white/10">
            {eq.type === EquipmentType.ML ? '❄️' : eq.type === EquipmentType.MNU ? '💧' : '🧊'}
          </div>
          <div>
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-0.5">{eq.brand}</p>
            <h2 className="text-2xl font-black leading-tight">Máy: {displayId}</h2>
            <p className="text-white/60 font-bold text-xs uppercase tracking-wider">{eq.model}</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-12 relative z-10 space-y-8">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-50 space-y-8">
          {imageLinks.length > 0 && (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
              {imageLinks.map((img, idx) => (
                <div key={idx} onClick={() => setZoomImg({url: img.url!, label: img.label})} className="flex-none w-64 aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 shadow-sm active:scale-95 transition-transform snap-center relative">
                   <img src={img.url!} className="w-full h-full object-cover" alt={img.label} loading="lazy" />
                   <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm p-3">
                      <p className="text-white text-[9px] font-black uppercase truncate">{img.label}</p>
                   </div>
                </div>
              ))}
            </div>
          )}

          <section className="bg-slate-50 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-2"><span className="text-slate-400 font-bold uppercase shrink-0">Khu vực:</span><span className="font-black text-slate-800 text-right">{eq.area}</span></div>
            <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-2"><span className="text-slate-400 font-bold uppercase shrink-0">Khoa/Phòng:</span><span className="font-black text-slate-800 text-right">{eq.department}</span></div>
            <div className="flex justify-between items-start text-xs pb-1"><span className="text-slate-400 font-bold uppercase shrink-0">Phòng:</span><span className="font-black text-slate-800 text-right">{eq.room}</span></div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            {Object.entries(eq.details).map(([k, v]) => {
                const lowerK = k.toLowerCase().trim();
                if (['khu vực', 'phòng', 'khoa', 'khoa/phòng', 'đơn vị', 'máy số', 'mts', 'stt', 'ql', 'khu vuc', 'khoa/phong'].includes(lowerK)) return null;
                if (lowerK.includes('ảnh') || lowerK.includes('link') || lowerK.includes('hình')) return null;
                if (!v || v.toString().trim() === '') return null;
                return (
                  <div key={k} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] text-slate-300 font-black uppercase mb-1 leading-none">{k}</p>
                    <p className="text-xs font-black text-slate-800 truncate" title={v.toString()}>{v.toString()}</p>
                  </div>
                );
            })}
          </section>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={onCheckin} className="bg-emerald-600 text-white p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span className="font-black text-[10px] tracking-widest uppercase">Kiểm Tra</span>
            </button>
            <button onClick={onIncident} className="bg-rose-600 text-white p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-rose-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span className="font-black text-[10px] tracking-widest uppercase">Báo Sự Cố</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormView = ({ type, eq, onBack, onSubmit, photo, setPhoto, openCamera }: any) => {
  const [data, setData] = useState<Record<string, string>>({});
  const color = type === 'CHECKIN' ? 'emerald' : 'rose';
  
  // Hiển thị số máy thật (không tiền tố)
  const displayId = eq.id.split('-').pop();

  const updateField = (key: string, val: string) => setData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="bg-white min-h-screen p-6 pb-24 overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-3 bg-slate-50 rounded-xl active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg></button>
        <div className="text-right">
          <h2 className={`text-xl font-black text-${color}-600 uppercase`}>{type === 'CHECKIN' ? 'Kiểm Tra' : 'Báo Cáo Sự Cố'}</h2>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Hệ thống BVCR</p>
        </div>
      </div>
      
      <div className="space-y-8">
        <div className="w-full bg-slate-100 p-5 rounded-3xl font-black text-slate-800 text-xl border border-slate-200 shadow-inner">
           <span className="text-[8px] text-slate-400 block uppercase mb-1">Máy số:</span>
           {displayId}
        </div>
        
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hình ảnh (Bắt buộc)</p>
          {photo ? (
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              <img src={photo} className="w-full h-full object-cover" alt="Captured" />
              <button onClick={() => setPhoto(null)} className="absolute top-4 right-4 bg-rose-500 text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ) : (
            <button onClick={openCamera} className="w-full py-20 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-4 text-slate-300 active:bg-slate-50 transition-colors">
              <div className="p-5 bg-slate-50 rounded-3xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">Mở camera</span>
            </button>
          )}
        </div>

        {type === 'CHECKIN' ? (
          <div className="space-y-8">
             <div className="bg-slate-50 p-6 rounded-[2rem] space-y-5 border border-slate-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-2">Nhiệt Độ (°C)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Cài đặt</p>
                    <input type="number" step="0.1" className="w-full bg-white p-4 rounded-2xl outline-none font-black text-slate-700 shadow-sm border border-slate-100" placeholder="00.0" onChange={e => updateField('NHIỆT ĐỘ (°C) Cài đặt', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Phòng</p>
                    <input type="number" step="0.1" className="w-full bg-white p-4 rounded-2xl outline-none font-black text-slate-700 shadow-sm border border-slate-100" placeholder="00.0" onChange={e => updateField('NHIỆT ĐỘ (°C) Phòng', e.target.value)} />
                  </div>
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-[2rem] space-y-5 border border-slate-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-2">Độ Ẩm (%)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Cài đặt</p>
                    <input type="number" step="1" className="w-full bg-white p-4 rounded-2xl outline-none font-black text-slate-700 shadow-sm border border-slate-100" placeholder="00" onChange={e => updateField('ĐỘ ẨM (%) Cài đặt', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Phòng</p>
                    <input type="number" step="1" className="w-full bg-white p-4 rounded-2xl outline-none font-black text-slate-700 shadow-sm border border-slate-100" placeholder="00" onChange={e => updateField('ĐỘ ẨM (%) Phòng', e.target.value)} />
                  </div>
                </div>
             </div>

             <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thông số khác</p>
                <input type="text" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-slate-700 border border-slate-100" placeholder="Dòng A, Áp Pa..." onChange={e => updateField('Thông số kỹ thuật', e.target.value)} />
             </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên sự cố</p>
            <input type="text" placeholder="Máy hỏng, kêu to..." className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-black text-slate-800 border-2 border-rose-100" onChange={e => updateField('Tên sự cố', e.target.value)} />
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả / Ghi chú</p>
          <textarea placeholder="Nhập thêm ghi chú..." className="w-full bg-slate-50 p-5 rounded-[2rem] min-h-[160px] outline-none font-black text-slate-700 border border-slate-100 shadow-inner" onChange={e => updateField('GHI CHÚ', e.target.value)}></textarea>
        </div>
        
        <button 
          onClick={() => onSubmit(data)} 
          disabled={!photo}
          className={`w-full bg-${color}-600 text-white py-7 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-[0.97] transition-all disabled:opacity-40 disabled:grayscale`}
        >
          {type === 'INCIDENT' ? 'Báo cáo khẩn' : 'Hoàn tất'}
        </button>
      </div>
    </div>
  );
};

const ImageLightbox = ({ url, label, onClose }: { url: string, label: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[250] bg-black/98 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
    <button onClick={onClose} className="absolute top-10 right-10 text-white w-14 h-14 bg-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <img src={url} className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10" alt={label} />
    <p className="mt-8 text-white font-black uppercase tracking-[0.2em] text-sm">{label}</p>
  </div>
);

export default App;
