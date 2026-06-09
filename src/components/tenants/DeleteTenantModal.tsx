import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TenantAdminData, tenantsAdminSupabaseService } from "@/services/tenants-admin.supabase.service";
import { useToast } from "@/context/ToastContext";

interface DeleteTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantAdminData | null;
  onConfirm: () => void;
}

export function DeleteTenantModal({
  isOpen,
  onClose,
  tenant,
  onConfirm,
}: DeleteTenantModalProps) {
  const toast = useToast();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tenant?.id) return;
    if (deleteConfirmText !== "EXCLUIR") {
      toast.error("Texto de confirmação incorreto.");
      return;
    }

    setDeleting(true);
    const ok = await tenantsAdminSupabaseService.removeTenant(tenant.id);
    setDeleting(false);

    if (ok) {
      toast.success("Tenant excluído com sucesso!");
      setDeleteConfirmText("");
      onConfirm();
      onClose();
    } else {
      toast.error("Erro ao excluir o tenant.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Exclusão de Tenant">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "#b91c1c", fontWeight: 600 }}>
          ⚠️ Atenção: Esta ação é irreversível!
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          A exclusão removerá dados vinculados conforme regras do banco.
        </p>
        <p style={{ fontSize: "0.9rem" }}>
          Para confirmar a exclusão do tenant <strong>{tenant?.empresa}</strong>, digite <strong>EXCLUIR</strong> abaixo:
        </p>
        <Input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="Digite EXCLUIR"
          disabled={deleting}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
          <Button type="button" variant="cancel" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteConfirmText !== "EXCLUIR" || deleting}
          >
            {deleting ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
