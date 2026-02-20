"use client";

import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-xl",
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl border border-[#e8e6dc] w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#e8e6dc] bg-white rounded-t-2xl">
          <h2 className="heading font-semibold text-[#141413]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#b0aea5] hover:text-[#141413] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
