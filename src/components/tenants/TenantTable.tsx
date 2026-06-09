import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { formatDate } from "@/lib/utils";

interface TenantTableProps {
  tenants: TenantAdminData[];
  loading: boolean;
  onEdit: (tenant: TenantAdminData) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onDelete: (tenant: TenantAdminData) => void;
}

export function TenantTable({
  tenants,
  loading,
  onEdit,
  onToggleStatus,
  onDelete,
}: TenantTableProps) {
  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>;
  }

  if (tenants.length === 0) {
    return <EmptyState message="Nenhum tenant cadastrado no sistema." />;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Empresa / Razão Social</th>
          <th>Responsável</th>
          <th>Status</th>
          <th>Criado em</th>
          <th style={{ textAlign: "right" }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {tenants.map((t) => (
          <tr key={t.id} className="table-row">
            <td>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{t.empresa}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ID: {t.id}</div>
            </td>
            <td>{t.responsavel}</td>
            <td>
              <StatusBadge status={t.status || "ATIVO"} />
            </td>
            <td>{t.created_at ? formatDate(t.created_at) : "-"}</td>
            <td style={{ textAlign: "right" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <Button
                  variant="secondary"
                  onClick={() => onEdit(t)}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", marginRight: "0.5rem" }}
                >
                  Editar
                </Button>
                <Button
                  variant={t.status === "ATIVO" ? "danger" : "primary"}
                  onClick={() => t.id && onToggleStatus(t.id, t.status || "ATIVO")}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", marginRight: "0.5rem" }}
                >
                  {t.status === "ATIVO" ? "Bloquear" : "Ativar"}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => onDelete(t)}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                >
                  Excluir
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
