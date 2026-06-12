/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { usuariosSupabaseService } from "@/services/usuarios.supabase.service";
import { Profile } from "@/types";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function UsuariosPage() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ id: string; nome: string; descricao: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("TODOS");
  const [selectedStatus, setSelectedStatus] = useState("TODOS");

  // Modals State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");

  const [editNome, setEditNome] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesResponse] = await Promise.all([
        usuariosSupabaseService.getAll(),
        (supabase.from("roles") as any).select("*").order("nome", { ascending: true })
      ]);

      setUsers(usersData);
      
      const filteredRoles = (rolesResponse.data || []).filter(
        (r: any) => r.nome === "ADMIN" || r.nome === "OPERADOR"
      );
      setRoles(filteredRoles);
      
      if (filteredRoles.length > 0) {
        setInviteRoleId(filteredRoles[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados dos usuários.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Compute filtered users dynamically
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        (u.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        selectedRole === "TODOS" ||
        u.role_id === selectedRole ||
        u.role_name === selectedRole;

      const matchesStatus =
        selectedStatus === "TODOS" ||
        u.status === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  // Open Actions
  const handleOpenInvite = () => {
    setInviteEmail("");
    setInviteNome("");
    setInvitePassword("");
    setInviteStatus("ATIVO");
    if (roles.length > 0) {
      setInviteRoleId(roles[0].id);
    }
    setIsInviteModalOpen(true);
  };

  const handleOpenEdit = (user: Profile) => {
    setEditingUser(user);
    setEditNome(user.nome || "");
    setEditRoleId(user.role_id || "");
    setEditStatus(user.status === "CONVIDADO" ? "ATIVO" : (user.status as "ATIVO" | "INATIVO"));
    setIsEditModalOpen(true);
  };

  // Submit New User Directly
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteNome || !inviteRoleId || !invitePassword || !inviteStatus) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    try {
      const selectedRoleObj = roles.find((r) => r.id === inviteRoleId);
      if (!selectedRoleObj) {
        toast.error("Perfil inválido selecionado.");
        return;
      }

      await usuariosSupabaseService.createUserDirectly(
        inviteEmail,
        inviteNome,
        invitePassword,
        selectedRoleObj.nome,
        inviteStatus
      );
      
      toast.success(`Usuário ${inviteNome} cadastrado com sucesso!`);
      setIsInviteModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar novo usuário.");
    }
  };

  // Submit Edits
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) return;

    try {
      await usuariosSupabaseService.updateProfile(editingUser.id, {
        nome: editNome,
        role_id: editRoleId,
        status: editStatus,
      });

      // Synchronize toggle status as well if changed
      const activeState = editStatus === "ATIVO";
      if (editingUser.ativo !== activeState) {
        await usuariosSupabaseService.toggleStatus(editingUser.id, activeState);
      }

      toast.success("Usuário atualizado com sucesso!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar usuário.");
    }
  };

  const handleToggleStatus = async (user: Profile) => {
    if (!user.id) return;
    const newActiveState = !user.ativo;
    try {
      await usuariosSupabaseService.toggleStatus(user.id, newActiveState);
      toast.success(`Usuário ${newActiveState ? "ativado" : "desativado"} com sucesso!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do usuário.");
    }
  };

  const handleResetPassword = async (user: Profile) => {
    if (!user.email) return;
    try {
      await usuariosSupabaseService.resetPasswordByEmail(user.email);
      toast.success("E-mail de redefinição de senha enviado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar redefinição de senha.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await usuariosSupabaseService.deleteUserDirectly(deleteConfirmId);
      toast.success("Usuário excluído com sucesso!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div>
      <PageTitle
        title="Gestão de Usuários"
        icon="👥"
        actions={
          <Button onClick={handleOpenInvite}>
            ➕ Novo Usuário
          </Button>
        }
      />

      {/* Filters Section */}
      <div className="dashboard-card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Buscar Usuário
            </label>
            <input
              type="text"
              placeholder="Nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              Perfil / Função
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="TODOS">Todos os perfis</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold" }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <TableContainer title="Usuários Registrados" count={0}>
          <SkeletonTable cols={5} rows={6} />
        </TableContainer>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          message="Nenhum usuário cadastrado ou correspondente aos filtros de busca."
          description="Cadastre novos colaboradores para que eles possam acessar o Memorius."
          actionLabel="Novo Usuário"
          onAction={handleOpenInvite}
        />
      ) : (
        <TableContainer title="Usuários Registrados" count={filteredUsers.length}>
          <table className="list-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Nome</th>
                <th style={{ padding: "0.75rem 1rem" }}>E-mail</th>
                <th style={{ padding: "0.75rem 1rem" }}>Perfil / Role</th>
                <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="table-row"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem", fontWeight: "bold" }}>{user.nome || "Pendente"}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{user.email}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        backgroundColor: "#f1f3f4",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        color: "#333",
                        fontWeight: "bold",
                      }}
                    >
                      {user.role_name || user.role || "N/A"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <StatusBadge status={user.status} />
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <Button variant="secondary" onClick={() => handleOpenEdit(user)} style={{ padding: "2px 8px", fontSize: "0.8rem" }}>
                        ✏️ Editar
                      </Button>
                      
                      <Button variant="secondary" onClick={() => handleResetPassword(user)} style={{ padding: "2px 8px", fontSize: "0.8rem" }}>
                        🔑 Resetar Senha
                      </Button>

                      <Button
                        variant={user.ativo ? "danger" : "primary"}
                        onClick={() => handleToggleStatus(user)}
                        style={{ padding: "2px 8px", fontSize: "0.8rem" }}
                      >
                        {user.ativo ? "🚫 Inativar" : "✅ Ativar"}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => handleDeleteUser(user.id!)}
                        style={{ padding: "2px 8px", fontSize: "0.8rem" }}
                      >
                        🗑️ Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* New User Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Novo Usuário">
        <form onSubmit={handleInviteSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={inviteNome}
              onChange={(e) => setInviteNome(e.target.value)}
              placeholder="Ex: João Silva"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              E-mail de Acesso
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Ex: joao@funeraria.com"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="Ex: Senha123!"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Função / Perfil de Acesso
            </label>
            <select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} - {r.descricao}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Status do Usuário
            </label>
            <select
              value={inviteStatus}
              onChange={(e) => setInviteStatus(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Button type="button" variant="cancel" onClick={() => setIsInviteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Usuário">
        <form onSubmit={handleEditSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Função / Perfil de Acesso
            </label>
            <select
              value={editRoleId}
              onChange={(e) => setEditRoleId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} - {r.descricao}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", fontWeight: "bold" }}>
              Status do Usuário
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
              }}
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Button type="button" variant="cancel" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      <ModalConfirm
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este usuário permanentemente? Esta ação não poderá ser desfeita e removerá o acesso ao sistema."
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
}
