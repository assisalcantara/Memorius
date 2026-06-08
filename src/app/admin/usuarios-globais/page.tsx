/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase/client";

export default function AdminGlobalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, roles(nome), tenants(empresa)")
        .order("created_at", { ascending: false });

      if (active) {
        if (error) {
          console.warn("[usuarios-globais] Error fetching profiles:", error.message);
        } else {
          setUsers(data || []);
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageTitle title="Usuários Globais" icon="👥" />

      <TableContainer title="Todos os Usuários do SaaS" count={users.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>
        ) : users.length === 0 ? (
          <EmptyState message="Nenhum usuário cadastrado no sistema." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tenant / Funerária</th>
                <th>Perfil / Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="table-row">
                  <td style={{ fontWeight: 700 }}>{u.nome || "Convidado"}</td>
                  <td>{u.email}</td>
                  <td>{u.tenants?.empresa || "Sem Tenant (Global)"}</td>
                  <td>
                    <span style={{
                      fontSize: "0.8rem",
                      backgroundColor: "#f1f5f9",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: 600,
                      color: "#475569"
                    }}>
                      {u.roles?.nome || u.role || "CONSULTA"}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: u.ativo ? "#16a34a" : "#dc2626"
                    }}>
                      {u.status || (u.ativo ? "ATIVO" : "INATIVO")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>
    </div>
  );
}
