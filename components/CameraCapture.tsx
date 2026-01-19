
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          // Giảm độ phân giải lý tưởng để tiết kiệm băng thông và bộ nhớ ngay từ luồng vào
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsReady(true);
      }
    } catch (err) {
      console.error("Lỗi mở camera:", err);
      alert("Ứng dụng cần quyền Camera để chụp ảnh thiết bị. Vui lòng cấp quyền trong cài đặt trình duyệt.");
      onClose();
    }
  }, [onClose]);

  const capturePhoto = () => {
    if (videoRef.current && isReady) {
      // Hiệu ứng nháy màn hình (shutter effect)
      setIsShutterActive(true);
      setTimeout(() => setIsShutterActive(false), 150);

      // Phản hồi rung
      if ('vibrate' in navigator) navigator.vibrate(50);
      
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Giới hạn kích thước ảnh tối đa (Max 1080px) để giảm dung lượng base64
      const MAX_DIMENSION = 1080;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Vẽ ảnh đã resize vào canvas
        ctx.drawImage(video, 0, 0, width, height);
        
        // Nén ảnh: Sử dụng JPEG với chất lượng 0.6 (giảm ~60% dung lượng so với 0.8 mà vẫn đảm bảo độ nét kiểm tra)
        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        onCapture(base64);
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
      {/* Shutter Overlay */}
      <div className={`absolute inset-0 z-[110] bg-white transition-opacity duration-150 pointer-events-none ${isShutterActive ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* Top Controls */}
      <div className="w-full flex justify-between items-center text-white z-10">
        <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl backdrop-blur-md active:bg-white/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <div className="text-[10px] font-black tracking-widest bg-white/10 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 uppercase">
          Chụp ảnh thiết bị
        </div>
        <div className="w-10"></div>
      </div>

      {/* Video Viewport */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-4">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest">Đang khởi động camera...</p>
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Android/iOS Focus Ring Mock */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/10 rounded-[3rem] shadow-[0_0_0_2000px_rgba(0,0,0,0.3)]"></div>
          <div className="absolute w-4 h-4 border-t-2 border-l-2 border-blue-500 -translate-x-32 -translate-y-32"></div>
          <div className="absolute w-4 h-4 border-t-2 border-r-2 border-blue-500 translate-x-32 -translate-y-32"></div>
          <div className="absolute w-4 h-4 border-b-2 border-l-2 border-blue-500 -translate-x-32 translate-y-32"></div>
          <div className="absolute w-4 h-4 border-b-2 border-r-2 border-blue-500 translate-x-32 translate-y-32"></div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full flex items-center justify-center gap-10 z-10 pb-8">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
        </div>
        
        <button 
          onClick={capturePhoto}
          disabled={!isReady}
          className="bg-white p-1 rounded-full shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
        >
          <div className="w-20 h-20 rounded-full border-[6px] border-slate-900 flex items-center justify-center">
             <div className="w-16 h-16 bg-white rounded-full"></div>
          </div>
        </button>

        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
