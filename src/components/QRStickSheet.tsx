import React, { useState } from "react";
import { QrCode, ClipboardCheck, Link as LinkIcon, Download, Sparkles } from "lucide-react";

interface QRStickSheetProps {
  surveyId: string;
}

export default function QRStickSheet({ surveyId }: QRStickSheetProps) {
  const [copied, setCopied] = useState(false);

  // Generate target participation URL
  const targetUrl = `${window.location.origin}/?surveyId=${surveyId}`;
  
  // Clean, high-availability QR code server API
  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(targetUrl)}&margin=10`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="hidden md:block fixed top-24 right-6 w-52 bg-white rounded-xl shadow-xs border border-slate-200 z-30 overflow-hidden"
      style={{ minHeight: "260px" }}
      id="sticky-qr-component"
    >
      <div className="bg-slate-50 border-b border-slate-100 px-3.5 py-2.5 text-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold flex items-center gap-1.5 font-sans">
          <QrCode className="w-3.5 h-3.5 text-indigo-600" />
          실시간 참여 QR
        </span>
        <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] uppercase font-black bg-indigo-100 text-indigo-700 font-mono">
          Live URL
        </span>
      </div>

      <div className="p-4 flex flex-col items-center justify-center text-center">
        {/* QR Code Canvas Frame */}
        <div className="relative group bg-slate-50 p-2 rounded-xl mb-3 border border-slate-100 transition-all hover:scale-105 hover:shadow-md">
          <img 
            src={qrCodeImgUrl} 
            alt="Survey QR Code" 
            className="w-36 h-36 rounded-lg object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
        </div>

        {/* Action Link & Copy */}
        <p className="text-[10px] text-slate-500 mb-2 font-mono break-all max-w-full px-1 truncate bg-slate-50 py-1 rounded w-full border border-slate-100">
          {targetUrl}
        </p>

        <button
          onClick={copyToClipboard}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1 border ${
            copied 
              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
              : "bg-slate-800 border-slate-900 text-white hover:bg-slate-900 shadow-xs"
          }`}
        >
          {copied ? (
            <>
              <ClipboardCheck className="w-3.5 h-3.5 animate-bounce text-indigo-600" />
              링크 복사 완료
            </>
          ) : (
            <>
              <LinkIcon className="w-3.5 h-3.5" />
              참여 URL 복사하기
            </>
          )}
        </button>

        <div className="mt-3 text-[10px] text-slate-400 font-sans flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
          스마트폰 카메라로 촬영하면 바로 진입
        </div>
      </div>
    </div>
  );
}
