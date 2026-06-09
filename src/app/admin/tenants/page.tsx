"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { Button } from "@/components/ui/Button";
import { TenantTable } from "@/components/tenants/TenantTable";
import { EditTenantModal } from "@/components/tenants/EditTenantModal";
import { DeleteTenantModal } from "@/components/tenants/DeleteTenantModal";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { saasPlansSupabaseService } from "@/services/saas-plans.supabase.service";
import { SaasPlan } from "@/types";
import { useToast } from "@/context/ToastContext";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const toast = useToast();

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantAdminData | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantAdminData | null>(null);

  async function loadTenants() {
    const data = await tenantsAdminSupabaseService.getAllTenants();
    setTenants(data);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await tenantsAdminSupabaseService.getAllTenants();
      if (active) {
        setTenants(data);
        setLoading(false);
      }
    }
    async function loadPlans() {
      try {
        const allPlans = await saasPlansSupabaseService.getAll();
        if (active) {
          setPlans(allPlans.filter(p => p.ativo));
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      }
    }
    load();
    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    const ok = await tenantsAdminSupabaseService.toggleTenantStatus(id, newStatus);
    if (ok) {
      toast.success(`Tenant ${newStatus === "ATIVO" ? "ativado" : "bloqueado"} com sucesso!`);
      loadTenants();
    } else {
      toast.error("Erro ao alterar o status do tenant.");
    }
  };

  const handleEditClick = (t: TenantAdminData) => {
    setEditingTenant(t);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (t: TenantAdminData) => {
    setTenantToDelete(t);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div>
      <PageTitle
        title="Gerenciar Tenants"
        icon="🏢"
        actions={
          <Button onClick={() => window.location.href = "/admin/tenants/novo"}>
            ➕ Novo Tenant
          </Button>
        }
      />

      <TableContainer title="Todos os Tenants" count={tenants.length}>
        <TenantTable
          tenants={tenants}
          loading={loading}
          onEdit={handleEditClick}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteClick}
        />
      </TableContainer>

      <EditTenantModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tenant={editingTenant}
        plans={plans}
        onSave={loadTenants}
      />

      <DeleteTenantModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        tenant={tenantToDelete}
        onConfirm={loadTenants}
      />
    </div>
  );
}
