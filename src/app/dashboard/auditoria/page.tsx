/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { auditLogSupabaseService } from "@/services/audit-log.supabase.service";
import { AuditLog } from "@/types";
import { Modal } from "@/components/ui/Modal";
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UsersRound,
  User,
  Tag,
  AlertCircle,
  Copy,
  ExternalLink,
} from "@/components/icons/AdminIcons";
import { useToast } from "@/context/ToastContext";

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedModulo, setSelectedModulo] = useState("");
  const [selectedAcao, setSelectedAcao] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal de Detalhes
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Listas únicas para filtros
  const [users, setUsers] = useState<string[]>([]);
  const [modulos, setModulos] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogSupabaseService.getLogs();
      setLogs(data);

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

  // Resetar para primeira página sempre que os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateStart, dateEnd, selectedUser, selectedModulo, selectedAcao]);

  // Filtro Dinâmico
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Busca textual geral (descrição, registro_id, usuário, módulo, ação)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (log) =>
          (log.descricao && log.descricao.toLowerCase().includes(term)) ||
          (log.registro_id && String(log.registro_id).toLowerCase().includes(term)) ||
          (log.user_name && log.user_name.toLowerCase().includes(term)) ||
          (log.modulo && log.modulo.toLowerCase().includes(term)) ||
          (log.acao && log.acao.toLowerCase().includes(term))
      );
    }

    // Início do período
    if (dateStart) {
      const start = new Date(dateStart + "T00:00:00");
      result = result.filter((log) => {
        if (!log.created_at) return false;
        return new Date(log.created_at) >= start;
      });
    }

    // Fim do período
    if (dateEnd) {
      const end = new Date(dateEnd + "T23:59:59");
      result = result.filter((log) => {
        if (!log.created_at) return false;
        return new Date(log.created_at) <= end;
      });
    }

    // Usuário
    if (selectedUser) {
      result = result.filter((log) => (log.user_name || "N/A") === selectedUser);
    }

    // Módulo
    if (selectedModulo) {
      result = result.filter((log) => log.modulo === selectedModulo);
    }

    // Ação
    if (selectedAcao) {
      result = result.filter((log) => log.acao === selectedAcao);
    }

    return result;
  }, [logs, searchTerm, dateStart, dateEnd, selectedUser, selectedModulo, selectedAcao]);

  // KPIs
  const kpis = useMemo(() => {
    const totalEventos = logs.length;
    const totalCriacoes = logs.filter((l) => l.acao === "CREATE").length;
    const totalAtualizacoes = logs.filter(
      (l) => l.acao === "UPDATE" || l.acao === "ALTERAR_STATUS"
    ).length;
    const totalRemocoes = logs.filter(
      (l) => l.acao === "DELETE" || l.acao === "CANCELAR"
    ).length;

    return {
      totalEventos,
      totalCriacoes,
      totalAtualizacoes,
      totalRemocoes,
    };
  }, [logs]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDateStart("");
    setDateEnd("");
    setSelectedUser("");
    setSelectedModulo("");
    setSelectedAcao("");
  };

  const hasActiveFilters = Boolean(
    searchTerm || dateStart || dateEnd || selectedUser || selectedModulo || selectedAcao
  );

  const getActionBadge = (acao: string) => {
    switch (acao) {
      case "CREATE":
        return {
          bg: "#E6F4EA",
          color: "#137333",
          border: "#CEEAD6",
          label: "Criação",
        };
      case "UPDATE":
        return {
          bg: "#E8F0FE",
          color: "#1A73E8",
          border: "#D2E3FC",
          label: "Edição",
        };
      case "DELETE":
        return {
          bg: "#FCE8E6",
          color: "#C5221F",
          border: "#FAD2CF",
          label: "Exclusão",
        };
      case "CANCELAR":
        return {
          bg: "#FEF7E0",
          color: "#B06000",
          border: "#FEEFC3",
          label: "Cancelamento",
        };
      case "RECEBER":
        return {
          bg: "#E6F4F0",
          color: "#008C66",
          border: "#C2E7DE",
          label: "Recebimento",
        };
      case "FINALIZAR":
        return {
          bg: "#E2FBF4",
          color: "#008A63",
          border: "#B2EFE0",
          label: "Finalização",
        };
      case "ALTERAR_STATUS":
        return {
          bg: "#E1F5FE",
          color: "#0288D1",
          border: "#B3E5FC",
          label: "Status",
        };
      default:
        return {
          bg: "#F1F5F9",
          color: "#475569",
          border: "#E2E8F0",
          label: acao || "Ação",
        };
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return { date: "—", time: "—" };
    try {
      const date = new Date(dateStr);
      const d = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const t = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return { date: d, time: t };
    } catch {
      return { date: dateStr, time: "—" };
    }
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado com sucesso!`);
  };

  const openLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6" style={{ background: "#F7F9FC", minHeight: "100%", paddingBottom: "2.5rem" }}>
      {/* CABEÇALHO INSTITUCIONAL MEMORIUS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 rounded-full bg-[#F5BD22] shrink-0" />
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F0] flex items-center justify-center text-[#008C66] shrink-0 shadow-sm">
            <ShieldCheck size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Log de Auditoria e Rastreabilidade
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Histórico oficial e imutável de eventos operacionais, alterações cadastrais e acessos do sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Somente Leitura (Imutável)
          </span>
        </div>
      </div>

      {/* KPIS DE RESUMO EXECUTIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 - Total de Eventos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total de Eventos
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {loading ? "..." : kpis.totalEventos}
            </h3>
            <span className="text-xs text-slate-500 mt-1 block">
              Registros no banco
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E6F4F0] text-[#008C66] flex items-center justify-center">
            <FileText size={24} />
          </div>
        </div>

        {/* KPI 2 - Cadastros / Criações */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Novas Inclusões
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">
              {loading ? "..." : kpis.totalCriacoes}
            </h3>
            <span className="text-xs text-emerald-600 font-medium mt-1 block">
              Ações CREATE
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* KPI 3 - Atualizações & Status */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Modificações
            </p>
            <h3 className="text-2xl font-bold text-blue-700 mt-1">
              {loading ? "..." : kpis.totalAtualizacoes}
            </h3>
            <span className="text-xs text-blue-600 font-medium mt-1 block">
              Edições e Status
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        {/* KPI 4 - Cancelamentos & Exclusões */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Exclusões / Cancelados
            </p>
            <h3 className="text-2xl font-bold text-rose-700 mt-1">
              {loading ? "..." : kpis.totalRemocoes}
            </h3>
            <span className="text-xs text-rose-600 font-medium mt-1 block">
              Ações Críticas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS INSTITUCIONAL */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#008C66]" />
            <h3 className="text-sm font-bold text-slate-800">
              Filtros de Pesquisa e Rastreio
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredLogs.length} resultado(s)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#008C66] hover:text-[#006D50] font-semibold flex items-center gap-1 transition-colors self-start md:self-auto cursor-pointer"
            >
              <X size={14} />
              Limpar todos os filtros
            </button>
          )}
        </div>

        {/* Campo de Busca Rápida Geral */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Pesquise por descrição, ID do registro, operador, módulo ou ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] transition-all"
          />
        </div>

        {/* Linha com Filtros Específicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Data Início */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Data Início
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Data Fim
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
              />
            </div>
          </div>

          {/* Usuário / Operador */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Operador
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
            >
              <option value="">Todos os operadores</option>
              {users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Módulo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Módulo
            </label>
            <select
              value={selectedModulo}
              onChange={(e) => setSelectedModulo(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
            >
              <option value="">Todos os módulos</option>
              {modulos.map((modulo) => (
                <option key={modulo} value={modulo}>
                  {modulo}
                </option>
              ))}
            </select>
          </div>

          {/* Ação */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tipo de Ação
            </label>
            <select
              value={selectedAcao}
              onChange={(e) => setSelectedAcao(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700"
            >
              <option value="">Todas as ações</option>
              <option value="CREATE">CREATE (Criação)</option>
              <option value="UPDATE">UPDATE (Edição)</option>
              <option value="DELETE">DELETE (Exclusão)</option>
              <option value="CANCELAR">CANCELAR (Cancelamento)</option>
              <option value="RECEBER">RECEBER (Baixa/Recebimento)</option>
              <option value="FINALIZAR">FINALIZAR (Atendimento)</option>
              <option value="ALTERAR_STATUS">ALTERAR_STATUS (Situação)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE EVENTOS DE AUDITORIA */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Eventos Registrados
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              ({filteredLogs.length} total)
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Exibindo página {currentPage} de {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-3 border-b border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-4 bg-slate-200 rounded w-36" />
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-4 bg-slate-200 rounded w-16" />
                <div className="h-4 bg-slate-200 rounded w-48" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Nenhum evento de auditoria encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {logs.length === 0
                ? "Ainda não existem logs de auditoria gravados no banco de dados para este tenant."
                : "Não encontramos nenhum evento que coincida com os filtros selecionados."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <X size={14} />
                Limpar filtros de busca
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">ID Ref</th>
                  <th className="py-3 px-4">Descrição do Evento</th>
                  <th className="py-3 px-4 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.acao);
                  const dt = formatDateTime(log.created_at);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => openLogDetails(log)}
                    >
                      {/* Data / Hora */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{dt.date}</div>
                        <div className="text-[11px] text-slate-400">{dt.time}</div>
                      </td>

                      {/* Operador */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {(log.user_name || "S").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {log.user_name || "Sistema"}
                          </span>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {log.role_name || "N/A"}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                          {log.modulo}
                        </span>
                      </td>

                      {/* Ação com Badge Oficial */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            borderColor: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* ID Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.registro_id ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            #{log.registro_id}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="py-3.5 px-4 max-w-xs md:max-w-md truncate text-slate-600">
                        <span title={log.descricao || ""}>
                          {log.descricao || "—"}
                        </span>
                      </td>

                      {/* Ação Visualizar */}
                      <td
                        className="py-3.5 px-4 text-center whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogDetails(log);
                        }}
                      >
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#008C66] hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Visualizar detalhes do log"
                        >
                          <ExternalLink size={16} />
                        </button>
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
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)} de{" "}
              {filteredLogs.length} eventos
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
                // Exibe no máximo 5 botões próximos da página ativa
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

      {/* MODAL INSTITUCIONAL DE DETALHES DO EVENTO DE AUDITORIA */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Detalhes do Evento de Auditoria"
      >
        {selectedLog && (
          <div className="space-y-5">
            {/* Header com Status e ID */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#008C66] flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Ação Registrada
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {selectedLog.acao} • {selectedLog.modulo}
                  </div>
                </div>
              </div>
              {selectedLog.registro_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                    ID #{selectedLog.registro_id}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(String(selectedLog.registro_id), "ID do registro")
                    }
                    className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copiar ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Grid com Informações do Registro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <span className="text-slate-400 block mb-0.5">Data e Horário</span>
                <span className="font-semibold text-slate-800">
                  {formatDateTime(selectedLog.created_at).date} às{" "}
                  {formatDateTime(selectedLog.created_at).time}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <span className="text-slate-400 block mb-0.5">Operador Responsável</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.user_name || "Sistema Automático"}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <span className="text-slate-400 block mb-0.5">Perfil de Acesso (Cargo)</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.role_name || "N/A"}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <span className="text-slate-400 block mb-0.5">Módulo Afetado</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.modulo}
                </span>
              </div>

              {selectedLog.user_id && (
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 col-span-1 md:col-span-2">
                  <span className="text-slate-400 block mb-0.5">UUID do Usuário</span>
                  <span className="font-mono text-slate-700 break-all">
                    {selectedLog.user_id}
                  </span>
                </div>
              )}

              {selectedLog.ip && (
                <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block mb-0.5">Endereço IP</span>
                  <span className="font-mono text-slate-700">{selectedLog.ip}</span>
                </div>
              )}

              {selectedLog.tenant_id && (
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 col-span-1 md:col-span-2">
                  <span className="text-slate-400 block mb-0.5">Tenant ID (Isolamento)</span>
                  <span className="font-mono text-slate-700 break-all">
                    {selectedLog.tenant_id}
                  </span>
                </div>
              )}
            </div>

            {/* Descrição Completa do Evento */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Descrição Completa da Atividade
              </span>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedLog.descricao || "Nenhum detalhe adicional registrado."}
              </p>
            </div>

            {/* Rodapé com Fechamento */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
