"use client";

import React, { useEffect } from "react";
import { Button } from "./Button";

interface ModalConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
  closeOnOverlayClick?: boolean;
}

export function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary",
  closeOnOverlayClick = false,
}: ModalConfirmProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnOverlayClick) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, closeOnOverlayClick]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          width: "90%",
          maxWidth: "450px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-color)",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 1rem 0", color: variant === "danger" ? "var(--danger)" : "var(--primary)" }}>
          {title}
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <Button variant="cancel" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
