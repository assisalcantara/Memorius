/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { usuariosSupabaseService } from "@/services/usuarios.supabase.service";
import { Profile } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import {
  UsersRound,
  UserCheck,
  User,
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Tag,
} from "@/components/icons/AdminIcons";

export default function UsuariosPage() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ id: string; nome: string; descricao: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("TODOS");
  const [selectedStatus, setSelectedStatus] = useState("TODOS");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState<Profile | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ current: 0, limit: 2, planName: "Essencial" });

  // Form States (Criação)
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");

  // Form States (Edição)
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
      toast.error("Erro ao carregar dados dos colaboradores.");
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

  // Resetar página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedStatus]);

  // Compute filtered users dinamicamente
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

  // KPIs de Resumo Executivo
  const kpis = useMemo(() => {
    const totalUsuarios = users.length;
    const ativos = users.filter((u) => u.status === "ATIVO" || u.ativo === true).length;
    const administradores = users.filter((u) => (u.role_name || u.role) === "ADMIN").length;
    const operadores = users.filter((u) => (u.role_name || u.role) === "OPERADOR").length;

    return {
      totalUsuarios,
      ativos,
      administradores,
      operadores,
    };
  }, [users]);

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedRole !== "TODOS" || selectedStatus !== "TODOS"
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedRole("TODOS");
    setSelectedStatus("TODOS");
  };

  // Verificação e Abertura de Modal de Convite/Novo Usuário
  const handleOpenInvite = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/dashboard/plan-limits?check=USUARIOS", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const check = await res.json();
          if (check && !check.allowed) {
            setLimitInfo({
              current: check.currentCount,
              limit: check.limit,
              planName: check.planName,
            });
            setIsUpgradeModalOpen(true);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Could not pre-check user limit:", err);
    }

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

  // Submit Novo Usuário
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteNome || !inviteRoleId || !invitePassword || !inviteStatus) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmittingAction(true);
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
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) return;

    setSubmittingAction(true);
    try {
      await usuariosSupabaseService.updateProfile(editingUser.id, {
        nome: editNome,
        role_id: editRoleId,
        status: editStatus,
      });

      const activeState = editStatus === "ATIVO";
      if (editingUser.ativo !== activeState) {
        await usuariosSupabaseService.toggleStatus(editingUser.id, activeState);
      }

      toast.success("Usuário atualizado com sucesso!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar usuário.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmUser || !statusConfirmUser.id) return;
    const newActiveState = !statusConfirmUser.ativo;

    try {
      await usuariosSupabaseService.toggleStatus(statusConfirmUser.id, newActiveState);
      toast.success(`Usuário ${newActiveState ? "ativado" : "desativado"} com sucesso!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do usuário.");
    } finally {
      setStatusConfirmUser(null);
    }
  };

  const handleResetPassword = async (user: Profile) => {
    if (!user.email) return;
    try {
      await usuariosSupabaseService.resetPasswordByEmail(user.email);
      toast.success("E-mail com instruções de redefinição de senha enviado com sucesso!");
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
      toast.success("Usuário excluído permanentemente com sucesso!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6" style={{ background: "#F7F9FC", minHeight: "100%", paddingBottom: "2.5rem" }}>
      {/* CABEÇALHO INSTITUCIONAL MEMORIUS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 rounded-full bg-[#F5BD22] shrink-0" />
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F0] flex items-center justify-center text-[#008C66] shrink-0 shadow-sm">
            <UsersRound size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Gestão de Usuários e Acessos
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Controle de colaboradores, concessão de perfis e gestão de credenciais do tenant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenInvite}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-98 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
            }}
          >
            <PlusCircle size={17} strokeWidth={2.2} />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* KPIS DE RESUMO EXECUTIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 - Total Usuários */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total de Colaboradores
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {loading ? "..." : kpis.totalUsuarios}
            </h3>
            <span className="text-xs text-slate-500 mt-1 block">
              Cadastrados no tenant
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E6F4F0] text-[#008C66] flex items-center justify-center">
            <UsersRound size={24} />
          </div>
        </div>

        {/* KPI 2 - Usuários Ativos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Usuários Ativos
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">
              {loading ? "..." : kpis.ativos}
            </h3>
            <span className="text-xs text-emerald-600 font-medium mt-1 block">
              Com acesso habilitado
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck size={24} />
          </div>
        </div>

        {/* KPI 3 - Administradores */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Administradores
            </p>
            <h3 className="text-2xl font-bold text-blue-700 mt-1">
              {loading ? "..." : kpis.administradores}
            </h3>
            <span className="text-xs text-blue-600 font-medium mt-1 block">
              Perfil ADMIN
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* KPI 4 - Operadores */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Operadores
            </p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">
              {loading ? "..." : kpis.operadores}
            </h3>
            <span className="text-xs text-amber-600 font-medium mt-1 block">
              Perfil OPERADOR
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Tag size={24} />
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#008C66]" />
            <h3 className="text-sm font-bold text-slate-800">
              Filtros e Localização
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredUsers.length} colaborador(es)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#008C66] hover:text-[#006D50] font-semibold flex items-center gap-1 transition-colors self-start md:self-auto cursor-pointer"
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Campo de Busca Rápida */}
          <div className="sm:col-span-2 relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Buscar Colaborador
            </label>
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Pesquise por nome ou e-mail de acesso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] transition-all"
              />
            </div>
          </div>

          {/* Filtro Perfil / Função */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Perfil / Função
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full text-xs md:text-sm py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
            >
              <option value="TODOS">Todos os perfis</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status de Acesso
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs md:text-sm py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
              <option value="CONVIDADO">CONVIDADO</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA INSTITUCIONAL DE USUÁRIOS */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Colaboradores Registrados
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              ({filteredUsers.length} total)
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Exibindo página {currentPage} de {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="space-y-1">
                    <div className="h-4 bg-slate-200 rounded w-36" />
                    <div className="h-3 bg-slate-200 rounded w-48" />
                  </div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-4 bg-slate-200 rounded w-16" />
                <div className="h-8 bg-slate-200 rounded w-32" />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <UsersRound size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Nenhum colaborador encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {users.length === 0
                ? "Nenhum usuário cadastrado até o momento. Comece adicionando os membros da sua equipe."
                : "Não encontramos colaboradores que coincidam com os filtros de busca aplicados."}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <X size={14} />
                Limpar filtros de busca
              </button>
            ) : (
              <button
                onClick={handleOpenInvite}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs hover:brightness-105 transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
                }}
              >
                <PlusCircle size={15} />
                Cadastrar Primeiro Usuário
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Colaborador / E-mail</th>
                  <th className="py-3 px-4">Perfil de Acesso</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedUsers.map((user) => {
                  const initials = (user.nome || user.email || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const roleTitle = user.role_name || user.role || "N/A";
                  const isAdminRole = roleTitle === "ADMIN" || roleTitle === "SUPER_ADMIN";
                  const isUserActive = user.ativo && user.status === "ATIVO";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Nome e E-mail com Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                            style={{
                              backgroundColor: isUserActive ? "#E6F4F0" : "#F1F5F9",
                              color: isUserActive ? "#008C66" : "#64748B",
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">
                              {user.nome || "Nome não informado"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Perfil de Acesso */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                          style={{
                            backgroundColor: isAdminRole ? "#EFF6FF" : "#F8FAFC",
                            color: isAdminRole ? "#1D4ED8" : "#475569",
                            borderColor: isAdminRole ? "#DBEAFE" : "#E2E8F0",
                          }}
                        >
                          <ShieldCheck size={13} className={isAdminRole ? "text-blue-600" : "text-slate-500"} />
                          {roleTitle}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isUserActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ativo
                          </span>
                        ) : user.status === "CONVIDADO" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Convite Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#008C66] transition-colors cursor-pointer"
                            title="Editar informações do usuário"
                          >
                            <Edit size={13} />
                            Editar
                          </button>

                          {/* Reset Senha */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Enviar link de redefinição de senha"
                          >
                            <KeyRound size={13} />
                            Resetar Senha
                          </button>

                          {/* Alternar Ativação */}
                          <button
                            type="button"
                            onClick={() => setStatusConfirmUser(user)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              user.ativo
                                ? "bg-amber-50/60 border-amber-200 text-amber-700 hover:bg-amber-100/70"
                                : "bg-emerald-50/60 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70"
                            }`}
                            title={user.ativo ? "Desativar acesso" : "Habilitar acesso"}
                          >
                            {user.ativo ? (
                              <>
                                <AlertCircle size={13} />
                                Inativar
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                Ativar
                              </>
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id!)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                            title="Excluir usuário permanentemente"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINAÇÃO INSTITUCIONAL */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de{" "}
              {filteredUsers.length} colaboradores
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#008C66] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return (
                    <span key={pageNum} className="text-slate-400 text-xs px-1">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL INSTITUCIONAL: NOVO USUÁRIO */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Cadastrar Novo Colaborador"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={inviteNome}
              onChange={(e) => setInviteNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              E-mail Corporativo de Acesso *
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Ex: joao@suaempresa.com.br"
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Senha Provisória de Acesso *
            </label>
            <input
              type="password"
              required
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres..."
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Perfil / Função *
              </label>
              <select
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                className="w-full text-xs md:text-sm py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} — {r.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Inicial *
              </label>
              <select
                value={inviteStatus}
                onChange={(e) => setInviteStatus(e.target.value as any)}
                className="w-full text-xs md:text-sm py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
              >
                <option value="ATIVO">ATIVO (Liberado)</option>
                <option value="INATIVO">INATIVO (Bloqueado)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              {submittingAction ? "Cadastrando..." : "Cadastrar Colaborador"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL INSTITUCIONAL: EDITAR USUÁRIO */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Informações do Colaborador"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Perfil de Acesso *
              </label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full text-xs md:text-sm py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} — {r.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Situação do Acesso *
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full text-xs md:text-sm py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              {submittingAction ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMAÇÃO DE ATIVAÇÃO / INATIVAÇÃO */}
      <ModalConfirm
        isOpen={!!statusConfirmUser}
        onClose={() => setStatusConfirmUser(null)}
        onConfirm={handleConfirmToggleStatus}
        title={statusConfirmUser?.ativo ? "Inativar Usuário" : "Ativar Usuário"}
        message={`Deseja realmente ${
          statusConfirmUser?.ativo ? "inativar o acesso de" : "ativar o acesso de"
        } ${statusConfirmUser?.nome || statusConfirmUser?.email}?`}
        variant={statusConfirmUser?.ativo ? "danger" : "primary"}
        confirmText={statusConfirmUser?.ativo ? "Sim, Inativar" : "Sim, Ativar"}
        cancelText="Voltar"
      />

      {/* CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA */}
      <ModalConfirm
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Excluir Colaborador Permanentemente"
        message="Tem certeza que deseja remover este colaborador de forma definitiva? Esta ação revogará todo o acesso ao sistema e não poderá ser desfeita."
        variant="danger"
        confirmText="Excluir Definitivamente"
        cancelText="Cancelar"
      />

      {/* MODAL DE UPGRADE POR LIMITE DO PLANO SAAS */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        resource="USUARIOS"
        currentCount={limitInfo.current}
        limit={limitInfo.limit}
        planName={limitInfo.planName}
      />
    </div>
  );
}
