/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Cobranca, Mensalidade, Cliente } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import {
  AlertTriangle,
  Search,
  Filter,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  QrCode,
  Zap,
  Phone,
  MessageCircle,
  FileText,
  Clock,
  CheckCircle2,
} from "@/components/icons/AdminIcons";

export default function InadimplentesPage() {
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(
    mensalidadesSupabaseService as any
  );
  const {
    data: cobrancas,
    loading: loadingCobrancas,
    refresh: reloadCobrancas,
  } = useStorage<Cobranca>(cobrancasSupabaseService as any);
  const { data: clientes, loading: loadingClientes } = useStorage<Cliente>(
    clientesSupabaseService as any
  );
  const toast = useToast();

  const loading = loadingMensalidades || loadingCobrancas || loadingClientes;

  // Estados dos Modais
  const [activePixCobranca, setActivePixCobranca] = useState<Cobranca | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [generatingPixId, setGeneratingPixId] = useState<string | number | null>(null);

  // Estados de Filtros e Busca
  const [nomeFilter, setNomeFilter] = useState("");
  const [competenciaFilter, setCompetenciaFilter] = useState("");
  const [faixaFilter, setFaixaFilter] = useState("TODAS");
  const [statusCobFilter, setStatusCobFilter] = useState("TODOS");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper map para localizar dados de clientes
  const clientMap = useMemo(() => {
    return new Map(clientes.map((c) => [String(c.id), c]));
  }, [clientes]);

  const getClientInfo = (cId: string | number) => {
    return clientMap.get(String(cId));
  };

  // Helper de mapeamento tolerante de status de cobrança
  const mapCobrancaStatus = (status: string) => {
    const st = String(status || "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "PAGO"].includes(st)) return "Pago";
    if (["PENDING", "PIX_GERADO", "AWAITING_PAYMENT"].includes(st)) return "Pendente";
    if (["CANCELLED", "CANCELED"].includes(st)) return "Cancelado";
    return "Sem Cobrança";
  };

  const getActiveCobranca = (mId: string | number) => {
    return cobrancas.find(
      (c) =>
        String(c.mensalidadeId) === String(mId) &&
        mapCobrancaStatus(c.gatewayStatus || "") !== "Cancelado"
    );
  };

  // Processamento das mensalidades em atraso (EM_ABERTO e vencimento anterior a hoje)
  const parsedOverdueList = useMemo(() => {
    const overdueMensalidadesRaw = mensalidades.filter(
      (m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr
    );

    return overdueMensalidadesRaw.map((m) => {
      const overdueDays = Math.max(
        0,
        Math.floor(
          (new Date(todayStr).getTime() - new Date(m.dataVencimento).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      let ageBand = "";
      let bandColor = "";
      let textHexColor = "";
      if (overdueDays <= 30) {
        ageBand = "0-30 dias";
        bandColor = "bg-amber-50 border-amber-200 text-amber-800";
        textHexColor = "#92400e";
      } else if (overdueDays <= 60) {
        ageBand = "31-60 dias";
        bandColor = "bg-orange-50 border-orange-200 text-orange-800";
        textHexColor = "#c2410c";
      } else {
        ageBand = "61+ dias";
        bandColor = "bg-rose-50 border-rose-200 text-rose-800";
        textHexColor = "#b91c1c";
      }

      const client = getClientInfo(m.contratoId ? m.contratoId : "");
      const activeCobranca = getActiveCobranca(m.id!);

      return {
        mensalidade: m,
        client,
        overdueDays,
        ageBand,
        bandColor,
        textHexColor,
        activeCobranca,
      };
    });
  }, [mensalidades, todayStr, cobrancas, clientMap]);

  // Cálculos dos KPIs
  const totalInadimplentes = useMemo(() => {
    return new Set(
      parsedOverdueList.map((item) =>
        String(item.mensalidade.clienteNome || item.mensalidade.contratoId)
      )
    ).size;
  }, [parsedOverdueList]);

  const totalValorEmAberto = useMemo(() => {
    return parsedOverdueList.reduce(
      (acc, curr) => acc + Number(curr.mensalidade.valor || 0),
      0
    );
  }, [parsedOverdueList]);

  const maiorAtrasoDias = useMemo(() => {
    return parsedOverdueList.length > 0
      ? Math.max(...parsedOverdueList.map((item) => item.overdueDays))
      : 0;
  }, [parsedOverdueList]);

  const pixPendentesQtd = useMemo(() => {
    return parsedOverdueList.filter(
      (item) =>
        item.activeCobranca &&
        item.activeCobranca.gatewayMethod === "PIX" &&
        mapCobrancaStatus(item.activeCobranca.gatewayStatus || "") === "Pendente"
    ).length;
  }, [parsedOverdueList]);

  // Filtragem da Lista
  const filteredList = useMemo(() => {
    return parsedOverdueList.filter((item) => {
      const nomeLower = (item.mensalidade.clienteNome || "").toLowerCase();
      const q = nomeFilter.toLowerCase().trim();
      const matchesNome = !q || nomeLower.includes(q);

      const compLower = (item.mensalidade.competencia || "").toLowerCase();
      const compQ = competenciaFilter.toLowerCase().trim();
      const matchesCompetencia = !compQ || compLower.includes(compQ);

      const matchesFaixa =
        faixaFilter === "TODAS" ||
        (faixaFilter === "0-30 dias" && item.overdueDays <= 30) ||
        (faixaFilter === "31-60 dias" && item.overdueDays > 30 && item.overdueDays <= 60) ||
        (faixaFilter === "61-90 dias" && item.overdueDays > 60 && item.overdueDays <= 90) ||
        (faixaFilter === "90+" && item.overdueDays > 90);

      const mappedStatus = item.activeCobranca
        ? mapCobrancaStatus(item.activeCobranca.gatewayStatus || "")
        : "Sem Cobrança";
      const matchesStatus = statusCobFilter === "TODOS" || mappedStatus === statusCobFilter;

      return matchesNome && matchesCompetencia && matchesFaixa && matchesStatus;
    });
  }, [parsedOverdueList, nomeFilter, competenciaFilter, faixaFilter, statusCobFilter]);

  // Ordenação: maior atraso primeiro
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => b.overdueDays - a.overdueDays);
  }, [filteredList]);

  // Paginação
  const totalPages = Math.ceil(sortedList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedList.slice(start, start + itemsPerPage);
  }, [sortedList, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleClearFilters = () => {
    setNomeFilter("");
    setCompetenciaFilter("");
    setFaixaFilter("TODAS");
    setStatusCobFilter("TODOS");
    setCurrentPage(1);
  };

  // Gerar PIX de Recuperação
  const handleGeneratePix = async (mId: string | number) => {
    setGeneratingPixId(mId);
    try {
      const result = await cobrancasSupabaseService.createPixFromMensalidade(mId);
      if (result) {
        toast.success("PIX gerado com sucesso no gateway!");
        await reloadCobrancas();
        setActivePixCobranca(result);
        setIsPixModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
      setGeneratingPixId(null);
    }
  };

  // Link WhatsApp de cobrança
  const getCleanWhatsappLink = (telefone: string) => {
    if (!telefone) return null;
    const cleanNum = telefone.replace(/\D/g, "");
    if (cleanNum.length < 8) return null;
    const formatted = cleanNum.startsWith("55") ? cleanNum : `55${cleanNum}`;
    return `https://wa.me/${formatted}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho Institucional do Módulo com Barra Dourada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#F5BD22] rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <AlertTriangle className="text-rose-600" size={26} strokeWidth={2.2} />
              Central de Inadimplentes & Régua de Cobrança
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Monitoramento de faturas vencidas, faixas de atraso, renegociação e recuperação de receita
            </p>
          </div>
        </div>

        {/* Badge Informativo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold self-start sm:self-auto">
          <AlertTriangle size={15} />
          <span>Régua de Cobrança Ativa</span>
        </div>
      </div>

      {/* Faixa de KPIs (4 Cards em Grid Responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Inadimplentes */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total Inadimplentes
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">{totalInadimplentes}</div>
            <p className="text-xs text-[#94A3B8] mt-1">Titulares com faturas em atraso</p>
          </div>
        </div>

        {/* KPI 2: Valor Total em Aberto */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Valor em Atraso
            </span>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <DollarSign size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">
              {formatCurrency(totalValorEmAberto)}
            </div>
            <p className="text-xs text-orange-700 font-medium mt-1">Montante total pendente</p>
          </div>
        </div>

        {/* KPI 3: Maior Atraso */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Maior Atraso
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-800">{maiorAtrasoDias} dias</div>
            <p className="text-xs text-[#94A3B8] mt-1">Fatura mais antiga não paga</p>
          </div>
        </div>

        {/* KPI 4: PIX Pendentes */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              PIX Aguardando
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileText size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">{pixPendentesQtd}</div>
            <p className="text-xs text-blue-600 font-medium mt-1">Cobranças emitidas em aberto</p>
          </div>
        </div>
      </div>

      {/* Card Principal: Filtros + Tabela de Inadimplentes */}
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 md:p-5 border-b border-[#E5EAF0] bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Input de Busca de Cliente */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente/titular..."
                value={nomeFilter}
                onChange={(e) => {
                  setNomeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>

            {/* Input de Competência */}
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

            {/* Seletor de Faixa de Atraso */}
            <div className="relative">
              <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={faixaFilter}
                onChange={(e) => {
                  setFaixaFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
              >
                <option value="TODAS">Todas as Faixas</option>
                <option value="0-30 dias">Até 30 dias de atraso</option>
                <option value="31-60 dias">31 a 60 dias de atraso</option>
                <option value="61-90 dias">61 a 90 dias de atraso</option>
                <option value="90+">Mais de 90 dias</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>

            {/* Seletor de Status da Cobrança */}
            <div className="relative">
              <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={statusCobFilter}
                onChange={(e) => {
                  setStatusCobFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="Pendente">Cobrança Pendente</option>
                <option value="Pago">Liquidado no Gateway</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Sem Cobrança">Sem Cobrança Ativa</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Botão de Limpar Filtros */}
          {(nomeFilter || competenciaFilter || faixaFilter !== "TODAS" || statusCobFilter !== "TODOS") && (
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

        {/* Tabela de Inadimplentes */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-[#008C66] mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Nenhuma mensalidade inadimplente</h3>
              <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
                Todos os clientes estão em dia com seus pagamentos ou nenhum registro corresponde aos filtros selecionados.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente (Titular)</th>
                  <th className="py-3 px-4">Contrato / Plano</th>
                  <th className="py-3 px-4 text-center">Competência</th>
                  <th className="py-3 px-4">Valor em Aberto</th>
                  <th className="py-3 px-4 text-center">Dias em Atraso</th>
                  <th className="py-3 px-4 text-center">Status Cobrança</th>
                  <th className="py-3 px-4 text-right">Ações de Recuperação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-sm text-[#1E293B]">
                {paginatedList.map(
                  ({ mensalidade, client, overdueDays, ageBand, bandColor, activeCobranca }) => {
                    const isPaid =
                      activeCobranca &&
                      mapCobrancaStatus(activeCobranca.gatewayStatus || "") === "Pago";
                    const cleanPhone = client?.telefone || "";
                    const whatsappUrl = getCleanWhatsappLink(cleanPhone);

                    return (
                      <tr
                        key={mensalidade.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Cliente */}
                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {mensalidade.clienteNome?.charAt(0).toUpperCase() || "C"}
                            </div>
                            <div>
                              <span className="font-semibold block truncate max-w-[180px]">
                                {mensalidade.clienteNome}
                              </span>
                              {cleanPhone ? (
                                <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                                  <Phone size={11} />
                                  {cleanPhone}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Sem telefone</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contrato / Plano */}
                        <td className="py-3.5 px-4 text-xs text-[#475569]">
                          <span className="font-semibold text-slate-900 block font-mono">
                            {mensalidade.numeroContrato}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {mensalidade.planoNome || "Plano Ativo"}
                          </span>
                        </td>

                        {/* Competência */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {mensalidade.competencia}
                          </span>
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-4 font-bold text-xs text-rose-600">
                          {formatCurrency(Number(mensalidade.valor))}
                        </td>

                        {/* Dias em Atraso */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bandColor}`}
                          >
                            <AlertTriangle size={12} />
                            <span>
                              {overdueDays} dias ({ageBand})
                            </span>
                          </span>
                        </td>

                        {/* Status Cobrança */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isPaid
                                ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                                : activeCobranca
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaid
                                  ? "bg-[#008C66]"
                                  : activeCobranca
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            {activeCobranca
                              ? activeCobranca.gatewayStatus || "Pendente"
                              : "Sem Cobrança"}
                          </span>
                        </td>

                        {/* Ações de Recuperação */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* WhatsApp Direct */}
                            {whatsappUrl && (
                              <button
                                onClick={() => window.open(whatsappUrl, "_blank")}
                                title="Abrir conversa WhatsApp de cobrança"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              >
                                <MessageCircle size={14} />
                                <span>WhatsApp</span>
                              </button>
                            )}

                            {/* Gerar ou Ver PIX */}
                            {!activeCobranca ? (
                              <button
                                onClick={() => handleGeneratePix(mensalidade.id!)}
                                disabled={generatingPixId === mensalidade.id}
                                title="Gerar cobrança PIX no gateway ASAAS"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 rounded-lg shadow-2xs transition-all disabled:opacity-50"
                              >
                                <Zap size={14} />
                                <span>{generatingPixId === mensalidade.id ? "Gerando..." : "Gerar PIX"}</span>
                              </button>
                            ) : (
                              <>
                                {activePixCobranca?.pixQrCode && !isPaid && (
                                  <button
                                    onClick={() => {
                                      setActivePixCobranca(activeCobranca);
                                      setIsPixModalOpen(true);
                                    }}
                                    title="Ver QR Code PIX"
                                    className="p-1.5 rounded-lg text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors"
                                  >
                                    <QrCode size={15} />
                                  </button>
                                )}

                                {activeCobranca.pixCopyPaste && !isPaid && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(activeCobranca.pixCopyPaste || "");
                                      toast.success("Código PIX copiado com sucesso!");
                                    }}
                                    title="Copiar PIX Copia e Cola"
                                    className="p-1.5 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                                  >
                                    <Copy size={15} />
                                  </button>
                                )}

                                {activeCobranca.invoiceUrl && (
                                  <button
                                    onClick={() => window.open(activeCobranca.invoiceUrl || "", "_blank")}
                                    title="Abrir fatura oficial no ASAAS"
                                    className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                                  >
                                    <ExternalLink size={15} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé da Tabela: Paginação */}
        {sortedList.length > 0 && (
          <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedList.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedList.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{sortedList.length}</span> registros em atraso
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

      {/* Modal PIX ASAAS de Recuperação */}
      <Modal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        title="PIX de Recuperação — Gateway ASAAS"
      >
        {activePixCobranca && (
          <div className="space-y-4 pt-1 flex flex-col items-center">
            <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Valor em Cobrança:</span>
                <span className="text-rose-600 text-sm">{formatCurrency(activePixCobranca.valor)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Data de Vencimento:</span>
                <span className="font-mono">{formatDate(activePixCobranca.vencimento)}</span>
              </div>
              {activePixCobranca.descricao && (
                <div className="pt-2 border-t border-slate-200 text-slate-600">
                  <span className="block font-semibold">Descrição:</span>
                  <p>{activePixCobranca.descricao}</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            {activePixCobranca.pixQrCode && (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${activePixCobranca.pixQrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 block mx-auto object-contain"
                />
                <span className="text-[11px] text-slate-500 font-medium mt-2 block">
                  Envie a imagem ou peça para escanear no aplicativo bancário
                </span>
              </div>
            )}

            {/* Código PIX Copia e Cola */}
            {activePixCobranca.pixCopyPaste && (
              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Código PIX (Copia e Cola):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activePixCobranca.pixCopyPaste}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (activePixCobranca.pixCopyPaste) {
                        navigator.clipboard.writeText(activePixCobranca.pixCopyPaste);
                        toast.success("Código PIX copiado!");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 rounded-lg shadow-sm transition-all"
                  >
                    <Copy size={14} />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 w-full pt-3 border-t border-[#E5EAF0]">
              {activePixCobranca.invoiceUrl && (
                <button
                  type="button"
                  onClick={() => window.open(activePixCobranca.invoiceUrl || "", "_blank")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <ExternalLink size={14} />
                  <span>Abrir Fatura ASAAS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPixModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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
