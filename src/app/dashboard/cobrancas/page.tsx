/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { Cobranca, Cliente, Mensalidade } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  QrCode,
  FileText,
  Clock,
  AlertTriangle,
  DollarSign,
  Trash2,
} from "@/components/icons/AdminIcons";

export default function CobrancasPage() {
  const { data: cobrancas, loading: loadingCobrancas, refresh: reloadCobrancas } = useStorage<Cobranca>(
    cobrancasSupabaseService as any
  );
  const { data: clientes, loading: loadingClientes } = useStorage<Cliente>(
    clientesSupabaseService as any
  );
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(
    mensalidadesSupabaseService as any
  );
  const toast = useToast();

  const loading = loadingCobrancas || loadingClientes || loadingMensalidades;

  // Estados dos Modais
  const [selectedCobranca, setSelectedCobranca] = useState<Cobranca | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | number | null>(null);

  // Estados de Filtro e Busca
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [metodoFilter, setMetodoFilter] = useState("TODOS");
  const [competenciaFilter, setCompetenciaFilter] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper map para localizar nomes dos clientes
  const clientMap = useMemo(() => {
    return new Map(clientes.map((c) => [String(c.id), c.nomeCompleto]));
  }, [clientes]);

  // Helper map para localizar dados da mensalidade correspondente
  const mensalidadeMap = useMemo(() => {
    return new Map(
      mensalidades.map((m) => [
        String(m.id),
        { competencia: m.competencia, numeroContrato: m.numeroContrato },
      ])
    );
  }, [mensalidades]);

  const getClientName = (clienteId: string | number) => {
    return clientMap.get(String(clienteId)) || `Cliente #${clienteId}`;
  };

  const getMensalidadeInfo = (mId: string | number | undefined) => {
    if (!mId) return "N/D";
    const info = mensalidadeMap.get(String(mId));
    return info
      ? `Ref: ${info.competencia} (Contrato: ${info.numeroContrato || "S/N"})`
      : `Mensalidade #${mId}`;
  };

  const getCompetenciaText = (mId: string | number | undefined) => {
    if (!mId) return "";
    const info = mensalidadeMap.get(String(mId));
    return info ? info.competencia : "";
  };

  // Cancelamento de Cobrança
  const handleCancelClick = (id: string | number) => {
    setConfirmCancelId(id);
  };

  const handleConfirmCancel = async () => {
    if (confirmCancelId !== null) {
      try {
        await cobrancasSupabaseService.cancel(confirmCancelId);
        toast.success("Cobrança cancelada com sucesso!");
        await reloadCobrancas();
        setConfirmCancelId(null);
      } catch (err: any) {
        toast.error(err.message || "Erro ao cancelar cobrança.");
      }
    }
  };

  const handleCopyPix = (pixPayload: string) => {
    navigator.clipboard.writeText(pixPayload);
    toast.success("Código PIX copiado com sucesso!");
  };

  // KPIs Gerais (Antes dos filtros aplicados pelo usuário)
  const totalCobrancasQtd = cobrancas.length;

  const totalPagoQtd = useMemo(() => {
    return cobrancas.filter(
      (c) => c.gatewayStatus === "RECEIVED" || c.gatewayStatus === "CONFIRMED"
    ).length;
  }, [cobrancas]);

  const totalPendenteQtd = useMemo(() => {
    return cobrancas.filter(
      (c) =>
        c.gatewayStatus === "PENDING" ||
        c.gatewayStatus === "PIX_GERADO" ||
        c.gatewayStatus === "AWAITING_PAYMENT"
    ).length;
  }, [cobrancas]);

  const totalVencidoQtd = useMemo(() => {
    return cobrancas.filter(
      (c) =>
        c.gatewayStatus === "OVERDUE" ||
        ((c.gatewayStatus === "PENDING" || c.gatewayStatus === "PIX_GERADO") &&
          c.vencimento < todayStr)
    ).length;
  }, [cobrancas, todayStr]);

  // Filtragem da Lista de Cobranças
  const filteredCobrancas = useMemo(() => {
    return cobrancas.filter((c) => {
      const clientName = getClientName(c.clienteId).toLowerCase();
      const q = clienteFilter.toLowerCase().trim();
      const matchesClient = !q || clientName.includes(q);

      const comp = getCompetenciaText(c.mensalidadeId).toLowerCase();
      const compQ = competenciaFilter.toLowerCase().trim();
      const matchesCompetencia = !compQ || comp.includes(compQ);

      const matchesStatus =
        statusFilter === "TODOS" ||
        c.gatewayStatus === statusFilter ||
        (statusFilter === "PAGO" &&
          (c.gatewayStatus === "RECEIVED" || c.gatewayStatus === "CONFIRMED")) ||
        (statusFilter === "OVERDUE" &&
          (c.gatewayStatus === "OVERDUE" ||
            ((c.gatewayStatus === "PENDING" || c.gatewayStatus === "PIX_GERADO") &&
              c.vencimento < todayStr)));

      const matchesMetodo = metodoFilter === "TODOS" || c.gatewayMethod === metodoFilter;

      return matchesClient && matchesCompetencia && matchesStatus && matchesMetodo;
    });
  }, [cobrancas, clienteFilter, competenciaFilter, statusFilter, metodoFilter, clientMap, mensalidadeMap, todayStr]);

  // Ordenação: mais recentes primeiro (por vencimento ou id)
  const sortedCobrancas = useMemo(() => {
    return [...filteredCobrancas].sort((a, b) => (b.vencimento || "").localeCompare(a.vencimento || ""));
  }, [filteredCobrancas]);

  // Paginação
  const totalPages = Math.ceil(sortedCobrancas.length / itemsPerPage) || 1;
  const paginatedCobrancas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCobrancas.slice(start, start + itemsPerPage);
  }, [sortedCobrancas, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleClearFilters = () => {
    setClienteFilter("");
    setCompetenciaFilter("");
    setStatusFilter("TODOS");
    setMetodoFilter("TODOS");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho Institucional do Módulo com Barra Dourada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#F5BD22] rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <CreditCard className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Central de Cobranças
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Gestão de cobranças emitidas, integração ASAAS, links de pagamento, boletos e conciliação de faturas
            </p>
          </div>
        </div>

        {/* Badge Informativo de Gateway */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[#006D50] text-xs font-semibold self-start sm:self-auto">
          <CheckCircle2 size={15} />
          <span>Gateway ASAAS Conectado</span>
        </div>
      </div>

      {/* Faixa de KPIs (4 Cards em Grid Responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Geral */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total de Cobranças
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <CreditCard size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">{totalCobrancasQtd}</div>
            <p className="text-xs text-[#94A3B8] mt-1">Histórico completo emitido</p>
          </div>
        </div>

        {/* KPI 2: Pagas / Liquidadas */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Cobradas & Pagas
            </span>
            <div className="p-2 bg-green-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#008C66]">{totalPagoQtd}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {totalCobrancasQtd > 0 ? `${Math.round((totalPagoQtd / totalCobrancasQtd) * 100)}%` : "0%"} da base liquidada
            </p>
          </div>
        </div>

        {/* KPI 3: Pendentes / A Vencer */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Aguardando Pagamento
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">{totalPendenteQtd}</div>
            <p className="text-xs text-[#94A3B8] mt-1">Dentro do prazo de vencimento</p>
          </div>
        </div>

        {/* KPI 4: Vencidas */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Cobranças Vencidas
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">{totalVencidoQtd}</div>
            <p className="text-xs text-rose-600 font-medium mt-1">Exigem cobrança ativa / régua</p>
          </div>
        </div>
      </div>

      {/* Card Principal: Filtros + Tabela de Cobranças */}
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 md:p-5 border-b border-[#E5EAF0] bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            {/* Input de Busca de Cliente */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Cliente ou Contrato
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  value={clienteFilter}
                  onChange={(e) => {
                    setClienteFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>
            </div>

            {/* Input de Competência */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Competência
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Competência (ex: 06/2026)..."
                  value={competenciaFilter}
                  onChange={(e) => {
                    setCompetenciaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>
            </div>

            {/* Seletor de Status */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Status da Cobrança
              </label>
              <div className="relative">
                <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="PAGO">Pagas / Recebidas</option>
                  <option value="OVERDUE">Vencidas</option>
                  <option value="CANCELLED">Canceladas</option>
                  <option value="REFUNDED">Estornadas</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Seletor de Método de Cobrança */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Forma de Pagamento
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={metodoFilter}
                  onChange={(e) => {
                    setMetodoFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
                >
                  <option value="TODOS">Todos os Métodos</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Limpar Filtros */}
          {(clienteFilter || competenciaFilter || statusFilter !== "TODOS" || metodoFilter !== "TODOS") && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={15} />
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabela de Cobranças */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedCobrancas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-[#64748B] mb-3">
                <CreditCard size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Nenhuma cobrança encontrada</h3>
              <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
                As cobranças geradas pelo motor financeiro ou pelo gateway ASAAS aparecerão nesta listagem.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente (Titular)</th>
                  <th className="py-3 px-4">Vínculo Mensalidade</th>
                  <th className="py-3 px-4 text-center">Método</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Pago Em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-sm text-[#1E293B]">
                {paginatedCobrancas.map((c) => {
                  const isPaid = c.gatewayStatus === "RECEIVED" || c.gatewayStatus === "CONFIRMED";
                  const isOverdue =
                    c.gatewayStatus === "OVERDUE" ||
                    ((c.gatewayStatus === "PENDING" || c.gatewayStatus === "PIX_GERADO") &&
                      c.vencimento < todayStr);
                  const isCancelled = c.gatewayStatus === "CANCELLED" || c.gatewayStatus === "CANCELED";
                  const isPix = c.gatewayMethod === "PIX";

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#008C66] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {getClientName(c.clienteId).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold block truncate max-w-[180px]">
                              {getClientName(c.clienteId)}
                            </span>
                            <span className="text-[11px] text-[#64748B] font-mono">
                              ID #{c.clienteId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Vínculo Mensalidade */}
                      <td className="py-3.5 px-4 text-xs text-[#475569]">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
                          {getMensalidadeInfo(c.mensalidadeId)}
                        </span>
                      </td>

                      {/* Método */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isPix
                              ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {c.gatewayMethod || "N/A"}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 font-bold text-xs text-[#0F172A]">
                        {formatCurrency(c.valor)}
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        {formatDate(c.vencimento)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPaid
                              ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isCancelled
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaid
                                ? "bg-[#008C66]"
                                : isOverdue
                                ? "bg-rose-500"
                                : isCancelled
                                ? "bg-slate-400"
                                : "bg-amber-500"
                            }`}
                          />
                          {isPaid
                            ? "Pago"
                            : isOverdue
                            ? "Vencido"
                            : isCancelled
                            ? "Cancelado"
                            : "Pendente"}
                        </span>
                      </td>

                      {/* Pago Em */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {c.paidAt ? formatDate(c.paidAt) : "—"}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Ver Detalhes */}
                          <button
                            onClick={() => {
                              setSelectedCobranca(c);
                              setIsViewModalOpen(true);
                            }}
                            title="Ver detalhes da cobrança"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <FileText size={14} />
                            <span>Ver</span>
                          </button>

                          {/* Copiar PIX se pendente */}
                          {c.pixCopyPaste && !isPaid && (
                            <button
                              onClick={() => handleCopyPix(c.pixCopyPaste || "")}
                              title="Copiar código PIX Copia e Cola"
                              className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                            >
                              <Copy size={15} />
                            </button>
                          )}

                          {/* Abrir Link do ASAAS */}
                          {c.invoiceUrl && (
                            <button
                              onClick={() => window.open(c.invoiceUrl || "", "_blank")}
                              title="Abrir fatura oficial no ASAAS"
                              className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <ExternalLink size={15} />
                            </button>
                          )}

                          {/* Cancelar Cobrança */}
                          {!isPaid && !isCancelled && (
                            <button
                              onClick={() => handleCancelClick(c.id!)}
                              title="Cancelar cobrança"
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé da Tabela: Paginação */}
        {sortedCobrancas.length > 0 && (
          <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedCobrancas.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedCobrancas.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{sortedCobrancas.length}</span> cobranças
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-[#CBD5E1] text-[#475569] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página Anterior"
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
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[28px] h-7 px-2 rounded-md font-semibold transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#008C66] text-white"
                          : "border border-[#CBD5E1] text-[#475569] hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return (
                    <span key={pageNum} className="px-1 text-slate-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-[#CBD5E1] text-[#475569] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Cobrança */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Detalhes da Cobrança"
      >
        {selectedCobranca && (
          <div className="space-y-4 pt-1">
            {/* Header de Valor e Status */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Valor da Cobrança
                </span>
                <span className="text-2xl font-bold text-[#0F172A]">
                  {formatCurrency(selectedCobranca.valor)}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedCobranca.gatewayStatus === "RECEIVED" ||
                  selectedCobranca.gatewayStatus === "CONFIRMED"
                    ? "bg-emerald-100 text-emerald-800"
                    : selectedCobranca.gatewayStatus === "OVERDUE"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {selectedCobranca.gatewayStatus || "PENDING"}
              </span>
            </div>

            {/* Grid de Informações */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Cliente (Titular)</span>
                <strong className="text-slate-900 text-sm block">
                  {getClientName(selectedCobranca.clienteId)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Vínculo Contratual</span>
                <strong className="text-slate-900 text-sm font-mono block">
                  {getMensalidadeInfo(selectedCobranca.mensalidadeId)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Método de Emissão</span>
                <strong className="text-slate-900 block">{selectedCobranca.gatewayMethod}</strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Data de Vencimento</span>
                <strong className="text-slate-900 font-mono block">
                  {formatDate(selectedCobranca.vencimento)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Emitido em</span>
                <strong className="text-slate-900 font-mono block">
                  {selectedCobranca.createdAt ? formatDate(selectedCobranca.createdAt) : "N/D"}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Liquidado em</span>
                <strong className="text-slate-900 font-mono block">
                  {selectedCobranca.paidAt ? formatDate(selectedCobranca.paidAt) : "Não liquidado"}
                </strong>
              </div>

              {selectedCobranca.cancelledAt && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Cancelado em</span>
                  <strong className="text-rose-700 font-mono block">
                    {formatDate(selectedCobranca.cancelledAt)}
                  </strong>
                </div>
              )}
            </div>

            {/* Descrição */}
            {selectedCobranca.descricao && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-slate-500 font-semibold block">Descrição / Mensagem:</span>
                <p className="text-slate-700">{selectedCobranca.descricao}</p>
              </div>
            )}

            {/* QR Code PIX quando pendente */}
            {selectedCobranca.pixQrCode &&
              selectedCobranca.gatewayStatus !== "RECEIVED" &&
              selectedCobranca.gatewayStatus !== "CONFIRMED" && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">QR Code PIX</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${selectedCobranca.pixQrCode}`}
                    alt="QR Code PIX"
                    className="w-40 h-40 mx-auto block object-contain border border-slate-200 rounded-lg p-1 bg-white"
                  />
                </div>
              )}

            {/* PIX Copia e Cola */}
            {selectedCobranca.pixCopyPaste &&
              selectedCobranca.gatewayStatus !== "RECEIVED" &&
              selectedCobranca.gatewayStatus !== "CONFIRMED" && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Código PIX Copia e Cola:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedCobranca.pixCopyPaste}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyPix(selectedCobranca.pixCopyPaste || "")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 rounded-lg shadow-sm transition-all"
                    >
                      <Copy size={14} />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              )}

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
              {selectedCobranca.invoiceUrl && (
                <button
                  type="button"
                  onClick={() => window.open(selectedCobranca.invoiceUrl || "", "_blank")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <ExternalLink size={14} />
                  <span>Fatura no ASAAS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Diálogo de Confirmação de Cancelamento */}
      <ModalConfirm
        isOpen={confirmCancelId !== null}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={handleConfirmCancel}
        title="Cancelar Cobrança"
        message="Tem certeza que deseja cancelar esta cobrança no sistema? O status será alterado para CANCELADO."
        confirmText="Confirmar Cancelamento"
        variant="danger"
      />
    </div>
  );
}
