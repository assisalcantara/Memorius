"use client";

import { useEffect, useState, useMemo } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { auditLogSupabaseService } from "@/services/audit-log.supabase.service";
import { AuditLog } from "@/types";

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedModulo, setSelectedModulo] = useState("");
  const [selectedAcao, setSelectedAcao] = useState("");

  // Unique lists for filters
  const [users, setUsers] = useState<string[]>([]);
  const [modulos, setModulos] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogSupabaseService.getLogs();
      setLogs(data);

      // Extract unique values for filters
      const uniqueUsers = Array.from(
        new Set(data.map((log) => log.user_name || "N/A").filter(Boolean))
      );
      const uniqueModulos = Array.from(
        new Set(data.map((log) => log.modulo).filter(Boolean))
      );

      setUsers(uniqueUsers);
      setModulos(uniqueModulos);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Compute filtered logs dynamically
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by Date Start
    if (dateStart) {
      const start = new Date(dateStart + "T00:00:00");
      result = result.filter((log) => {
        if (!log.created_at) return false;
        return new Date(log.created_at) >= start;
      });
    }

    // Filter by Date End
    if (dateEnd) {
      const end = new Date(dateEnd + "T23:59:59");
      result = result.filter((log) => {
        if (!log.created_at) return false;
        return new Date(log.created_at) <= end;
      });
    }

    // Filter by User
    if (selectedUser) {
      result = result.filter((log) => (log.user_name || "N/A") === selectedUser);
    }

    // Filter by Module
    if (selectedModulo) {
      result = result.filter((log) => log.modulo === selectedModulo);
    }

    // Filter by Action
    if (selectedAcao) {
      result = result.filter((log) => log.acao === selectedAcao);
    }

    return result;
  }, [logs, dateStart, dateEnd, selectedUser, selectedModulo, selectedAcao]);

  const handleResetFilters = () => {
    setDateStart("");
    setDateEnd("");
    setSelectedUser("");
    setSelectedModulo("");
    setSelectedAcao("");
  };

  const getActionBadgeColor = (acao: string) => {
    switch (acao) {
      case "CREATE":
        return { bg: "#e6f4ea", color: "#137333" }; // light green
      case "UPDATE":
        return { bg: "#e8f0fe", color: "#1a73e8" }; // light blue
      case "DELETE":
        return { bg: "#fce8e6", color: "#c5221f" }; // light red
      case "CANCELAR":
        return { bg: "#fef7e0", color: "#b06000" }; // light orange/yellow
      case "RECEBER":
        return { bg: "#f3e8fd", color: "#7627cd" }; // light purple
      case "FINALIZAR":
        return { bg: "#e2fbf4", color: "#008a63" }; // light teal
      case "ALTERAR_STATUS":
        return { bg: "#e1f5fe", color: "#0288d1" }; // light sky-blue
      default:
        return { bg: "#f1f3f4", color: "#5f6368" }; // grey
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <PageTitle title="Log de Auditoria" icon="🛡️" />

      {/* Filters Section */}
      <div className="dashboard-card" style={{ padding: "1.25rem" }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Filtros de Busca</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Início do Período
            </label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Fim do Período
            </label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Usuário / Operador
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="">Todos os usuários</option>
              {users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Módulo
            </label>
            <select
              value={selectedModulo}
              onChange={(e) => setSelectedModulo(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="">Todos os módulos</option>
              {modulos.map((modulo) => (
                <option key={modulo} value={modulo}>
                  {modulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Ação
            </label>
            <select
              value={selectedAcao}
              onChange={(e) => setSelectedAcao(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="">Todas as ações</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="CANCELAR">CANCELAR</option>
              <option value="RECEBER">RECEBER</option>
              <option value="FINALIZAR">FINALIZAR</option>
              <option value="ALTERAR_STATUS">ALTERAR_STATUS</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleResetFilters}
              style={{
                width: "100%",
                padding: "0.55rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#f5f5f5",
                color: "#333",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <TableContainer title="Atividades Registradas" count={0}>
          <SkeletonTable cols={6} rows={6} />
        </TableContainer>
      ) : filteredLogs.length === 0 ? (
        <EmptyState message={logs.length === 0 ? "Nenhum log de auditoria registrado no sistema." : "Nenhum registro corresponde aos filtros selecionados."} />
      ) : (
        <TableContainer title="Atividades Registradas" count={filteredLogs.length}>
          <table className="list-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Data/Hora</th>
                <th style={{ padding: "0.75rem 1rem" }}>Usuário</th>
                <th style={{ padding: "0.75rem 1rem" }}>Perfil</th>
                <th style={{ padding: "0.75rem 1rem" }}>Módulo</th>
                <th style={{ padding: "0.75rem 1rem" }}>Ação</th>
                <th style={{ padding: "0.75rem 1rem" }}>Registro Ref</th>
                <th style={{ padding: "0.75rem 1rem" }}>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const badge = getActionBadgeColor(log.acao);
                return (
                  <tr
                    key={log.id}
                    className="table-row"
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: "bold" }}>
                      {log.user_name || "Sistema"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          backgroundColor: "#f1f3f4",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          color: "#333",
                        }}
                      >
                        {log.role_name || "N/A"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>{log.modulo}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {log.acao}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#666" }}>
                      {log.registro_id || "-"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>{log.descricao}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableContainer>
      )}
    </div>
  );
}
