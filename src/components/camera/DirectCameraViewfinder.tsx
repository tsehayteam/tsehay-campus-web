'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface DirectCameraViewfinderProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  title?: string;
}

export default function DirectCameraViewfinder({
  isOpen,
  onClose,
  onCapture,
  title = 'ቀጥታ ካሜራ (Direct Camera)',
}: DirectCameraViewfinderProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop camera tracks helper
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Start camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    setError(null);
    stopStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('ይህ ብሮውዘር የቀጥታ ካሜራ አይደግፍም። እባክዎ Chrome ወይም Safari ይጠቀሙ።');
      return;
    }

    try {
      // Check multiple cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch (e) {}

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      // Check torch capability
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities && 'torch' in capabilities));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('የካሜራ ፍቃድ አልተሰጠም። እባክዎ በብሮውዘርዎ የካሜራ ፍቃድ ይስጡ (Allow Camera Permission)።');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('በመሳሪያዎ ላይ ካሜራ ማግኘት አልተቻለም።');
      } else {
        setError('ካሜራውን መክፈት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  // Flip Camera
  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (e) {}
    }
  };

  // Capture Frame
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    // If front camera, mirror image back to normal
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `tsehay_capture_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const previewUrl = URL.createObjectURL(blob);

        stopStream();
        onCapture(file, previewUrl);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-[#070b14] border border-[#f9b03c]/40 rounded-3xl p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.25)] flex flex-col overflow-hidden">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center text-sm border border-[#f9b03c]/40">
              <i className="fa-solid fa-camera"></i>
            </div>
            <div>
              <h3 className="text-sm font-black font-heading text-white">{title}</h3>
              <p className="text-[10px] text-slate-400">Live Device Viewfinder</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="ዝጋ (Close)"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Live Camera Viewfinder Screen */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-black border border-white/20 flex items-center justify-center shadow-inner">
          {/* Shutter Flash Overlay */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* Live Video Element */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Viewfinder Target Crosshairs */}
          {!error && (
            <div className="absolute inset-6 sm:inset-10 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
              {/* 4 Glowing Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#f9b03c] rounded-tl-lg shadow-[0_0_10px_rgba(249,176,60,0.8)]"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#f9b03c] rounded-tr-lg shadow-[0_0_10px_rgba(249,176,60,0.8)]"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#f9b03c] rounded-bl-lg shadow-[0_0_10px_rgba(249,176,60,0.8)]"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#f9b03c] rounded-br-lg shadow-[0_0_10px_rgba(249,176,60,0.8)]"></div>

              {/* Center Focusing Ring */}
              <div className="w-12 h-12 rounded-full border border-dashed border-[#f9b03c]/40 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div className="absolute inset-0 bg-black/90 p-5 flex flex-col items-center justify-center text-center space-y-3 z-20">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xl">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <p className="text-xs text-red-200 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-rotate-right text-xs"></i>
                <span>እንደገና ሞክር (Retry)</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Shutter & Controls Bar */}
        <div className="pt-4 flex items-center justify-between gap-3">
          {/* Torch / Light Toggle */}
          <div className="w-12 flex justify-start">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer active:scale-95 ${
                  isTorchOn
                    ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(249,176,60,0.6)]'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="መብራት (Flashlight)"
              >
                <i className="fa-solid fa-bolt"></i>
              </button>
            )}
          </div>

          {/* Shutter Button (Large Golden Center Target) */}
          <button
            type="button"
            onClick={handleCapturePhoto}
            disabled={Boolean(error) || !stream}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(249,176,60,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
            title="ፎቶ አንሳ (Take Photo)"
          >
            <div className="w-full h-full rounded-full border-2 border-slate-950/40 flex items-center justify-center bg-white/20 group-hover:bg-white/30 transition-colors">
              <i className="fa-solid fa-camera text-slate-950 text-xl group-hover:scale-110 transition-transform"></i>
            </div>
          </button>

          {/* Flip Camera Button */}
          <div className="w-12 flex justify-end">
            {hasMultipleCameras && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition cursor-pointer active:scale-95"
                title="ካሜራ ቀይር (Flip Camera Front/Back)"
              >
                <i className="fa-solid fa-camera-rotate"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
