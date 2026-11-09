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
  DollarSign,
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
  TrendingUp,
} from "@/components/icons/AdminIcons";

export default function RecebimentosPage() {
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(
    mensalidadesSupabaseService as any
  );
  const { data: cobrancas, loading: loadingCobrancas } = useStorage<Cobranca>(
    cobrancasSupabaseService as any
  );
  const { data: clientes, loading: loadingClientes } = useStorage<Cliente>(
    clientesSupabaseService as any
  );
  const toast = useToast();

  const loading = loadingMensalidades || loadingCobrancas || loadingClientes;

  // Estados dos Modais
  const [selectedRecebimento, setSelectedRecebimento] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activePixCobranca, setActivePixCobranca] = useState<Cobranca | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  // Estados de Filtros e Busca
  const [periodoFilter, setPeriodoFilter] = useState("TODOS"); // HOJE, 7_DIAS, 30_DIAS, PERSONALIZADO, TODOS
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");
  const [metodoFilter, setMetodoFilter] = useState("TODOS");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefixMonthStr = `${currentYear}-${currentMonthStr}`;

  // Helper map para localizar nomes dos clientes
  const clientMap = useMemo(() => {
    return new Map(clientes.map((c) => [String(c.id), c.nomeCompleto]));
  }, [clientes]);

  const getClientName = (clienteId: string | number) => {
    return clientMap.get(String(clienteId)) || `Cliente #${clienteId}`;
  };

  // Base de recebimentos enriquecida: mensalidades com status === PAGO
  const enrichedReceipts = useMemo(() => {
    const paidMensalidades = mensalidades.filter((m) => m.status === "PAGO");

    return paidMensalidades.map((m) => {
      const linkedCobranca = cobrancas.find(
        (c) =>
          String(c.mensalidadeId) === String(m.id) &&
          c.gatewayStatus !== "CANCELLED" &&
          c.gatewayStatus !== "CANCELED"
      );

      const valorRecebido = Number(m.valorRecebido || m.valor || 0);
      const dataPagamento = m.dataPagamento || "";
      const cleanMethod = linkedCobranca ? linkedCobranca.gatewayMethod || "Gateway" : "Manual";

      return {
        id: m.id,
        mensalidade: m,
        cobranca: linkedCobranca,
        valor: valorRecebido,
        data: dataPagamento,
        metodo: cleanMethod,
        clienteNome: getClientName(m.contratoId ? m.contratoId : ""),
      };
    });
  }, [mensalidades, cobrancas, clientMap]);

  // Estatísticas gerais (KPIs)
  const recebidosHoje = useMemo(() => {
    return enrichedReceipts
      .filter((r) => r.data === todayStr)
      .reduce((acc, curr) => acc + curr.valor, 0);
  }, [enrichedReceipts, todayStr]);

  const qtdRecebidosHoje = useMemo(() => {
    return enrichedReceipts.filter((r) => r.data === todayStr).length;
  }, [enrichedReceipts, todayStr]);

  const recebidosNoMes = useMemo(() => {
    return enrichedReceipts
      .filter((r) => r.data.startsWith(prefixMonthStr))
      .reduce((acc, curr) => acc + curr.valor, 0);
  }, [enrichedReceipts, prefixMonthStr]);

  const qtdRecebidosNoMes = useMemo(() => {
    return enrichedReceipts.filter((r) => r.data.startsWith(prefixMonthStr)).length;
  }, [enrichedReceipts, prefixMonthStr]);

  const ticketMedioMes = qtdRecebidosNoMes > 0 ? recebidosNoMes / qtdRecebidosNoMes : 0;

  // Filtragem da Lista
  const filteredReceipts = useMemo(() => {
    return enrichedReceipts.filter((r) => {
      // 1. Cliente Filter
      const q = clienteFilter.toLowerCase().trim();
      const matchesCliente =
        !q ||
        r.clienteNome.toLowerCase().includes(q) ||
        r.mensalidade.numeroContrato?.toLowerCase().includes(q);

      // 2. Método Filter
      const matchesMetodo = metodoFilter === "TODOS" || r.metodo === metodoFilter;

      // 3. Período Filter
      let matchesPeriod = true;
      if (periodoFilter === "HOJE") {
        matchesPeriod = r.data === todayStr;
      } else if (periodoFilter === "7_DIAS") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
        matchesPeriod = r.data >= sevenDaysAgoStr && r.data <= todayStr;
      } else if (periodoFilter === "30_DIAS") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
        matchesPeriod = r.data >= thirtyDaysAgoStr && r.data <= todayStr;
      } else if (periodoFilter === "PERSONALIZADO") {
        if (startDate && endDate) {
          matchesPeriod = r.data >= startDate && r.data <= endDate;
        } else if (startDate) {
          matchesPeriod = r.data >= startDate;
        } else if (endDate) {
          matchesPeriod = r.data <= endDate;
        }
      }

      return matchesCliente && matchesMetodo && matchesPeriod;
    });
  }, [enrichedReceipts, clienteFilter, metodoFilter, periodoFilter, startDate, endDate, todayStr]);

  // Ordenação: pagamentos mais recentes primeiro
  const sortedReceipts = useMemo(() => {
    return [...filteredReceipts].sort((a, b) => b.data.localeCompare(a.data));
  }, [filteredReceipts]);

  // Paginação
  const totalPages = Math.ceil(sortedReceipts.length / itemsPerPage) || 1;
  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedReceipts.slice(start, start + itemsPerPage);
  }, [sortedReceipts, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleClearFilters = () => {
    setClienteFilter("");
    setMetodoFilter("TODOS");
    setPeriodoFilter("TODOS");
    setStartDate("");
    setEndDate("");
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
              <DollarSign className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Central de Recebimentos
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Auditoria de liquidações, conciliação de métodos, comprovantes PIX e extrato financeiro de entradas
            </p>
          </div>
        </div>

        {/* Badge Informativo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[#006D50] text-xs font-semibold self-start sm:self-auto">
          <CheckCircle2 size={15} />
          <span>Conciliação Automática Ativa</span>
        </div>
      </div>

      {/* Faixa de KPIs (4 Cards em Grid Responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Recebido Hoje */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Recebido Hoje
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <DollarSign size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#008C66]">
              {formatCurrency(recebidosHoje)}
            </div>
            <p className="text-xs text-[#64748B] mt-1">{qtdRecebidosHoje} pagamento(s) liquidado(s)</p>
          </div>
        </div>

        {/* KPI 2: Recebido no Mês */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Recebido no Mês
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TrendingUp size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">
              {formatCurrency(recebidosNoMes)}
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">{qtdRecebidosNoMes} liquidações no mês</p>
          </div>
        </div>

        {/* KPI 3: Qtd Recebimentos Hoje */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Volume Diário
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">
              {qtdRecebidosHoje}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">Transações de hoje</p>
          </div>
        </div>

        {/* KPI 4: Ticket Médio do Mês */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Ticket Médio (Mês)
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(ticketMedioMes)}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">Média por pagamento no mês</p>
          </div>
        </div>
      </div>

      {/* Card Principal: Filtros + Tabela de Recebimentos */}
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 md:p-5 border-b border-[#E5EAF0] bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            {/* Input de Busca */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Cliente ou Contrato
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente ou nº contrato..."
                  value={clienteFilter}
                  onChange={(e) => {
                    setClienteFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>
            </div>

            {/* Seletor de Período */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Período de Liquidação
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={periodoFilter}
                  onChange={(e) => {
                    setPeriodoFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
                >
                  <option value="TODOS">Todos os Registros</option>
                  <option value="HOJE">Hoje</option>
                  <option value="7_DIAS">Últimos 7 Dias</option>
                  <option value="30_DIAS">Últimos 30 Dias</option>
                  <option value="PERSONALIZADO">Período Personalizado</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Seletor de Método de Recebimento */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Método de Recebimento
              </label>
              <div className="relative">
                <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                  <option value="Manual">Manual</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Ação Limpar Filtros ou Espaçador */}
            <div className="flex items-center">
              {(clienteFilter || metodoFilter !== "TODOS" || periodoFilter !== "TODOS") ? (
                <button
                  onClick={handleClearFilters}
                  className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={15} />
                  Limpar filtros
                </button>
              ) : (
                <div className="text-xs text-slate-400 py-2 hidden lg:block">
                  {sortedReceipts.length} recebimento(s) encontrado(s)
                </div>
              )}
            </div>
          </div>

          {/* Campos de Período Personalizado */}
          {periodoFilter === "PERSONALIZADO" && (
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-medium">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-medium">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabela de Recebimentos */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedReceipts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-[#64748B] mb-3">
                <DollarSign size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Nenhum recebimento encontrado</h3>
              <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
                Tente ajustar os filtros de busca ou o período selecionado para visualizar o histórico de entradas.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Data Pagamento</th>
                  <th className="py-3 px-4">Cliente (Titular)</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4 text-center">Competência</th>
                  <th className="py-3 px-4 text-center">Método</th>
                  <th className="py-3 px-4">Valor Recebido</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-sm text-[#1E293B]">
                {paginatedReceipts.map((r) => {
                  const isPix = r.metodo === "PIX";
                  const isManual = r.metodo === "Manual";

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Data Pagamento */}
                      <td className="py-3.5 px-4 text-xs text-[#475569] font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#94A3B8]" />
                          <span>{formatDate(r.data)}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#008C66] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {r.clienteNome?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div>
                            <span className="font-semibold block truncate max-w-[200px]">
                              {r.clienteNome}
                            </span>
                            <span className="text-[11px] text-[#64748B] font-mono">
                              Contrato: {r.mensalidade.numeroContrato || "N/D"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="py-3.5 px-4 text-xs text-[#475569]">
                        {r.mensalidade.planoNome || "Plano Ativo"}
                      </td>

                      {/* Competência */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {r.mensalidade.competencia}
                        </span>
                      </td>

                      {/* Método de Recebimento */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isPix
                              ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                              : isManual
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {r.metodo}
                        </span>
                      </td>

                      {/* Valor Recebido */}
                      <td className="py-3.5 px-4 font-bold text-xs text-[#008C66]">
                        {formatCurrency(r.valor)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#008C66] border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#008C66]" />
                          Liquidado
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecebimento(r);
                              setIsViewModalOpen(true);
                            }}
                            title="Ver detalhes do recebimento"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <FileText size={14} />
                            <span>Detalhes</span>
                          </button>

                          {r.cobranca?.pixQrCode && (
                            <button
                              onClick={() => {
                                setActivePixCobranca(r.cobranca || null);
                                setIsPixModalOpen(true);
                              }}
                              title="Ver QR Code PIX vinculado"
                              className="p-1.5 rounded-lg text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors"
                            >
                              <QrCode size={15} />
                            </button>
                          )}

                          {r.cobranca?.invoiceUrl && (
                            <button
                              onClick={() => window.open(r.cobranca?.invoiceUrl || "", "_blank")}
                              title="Abrir fatura oficial no ASAAS"
                              className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <ExternalLink size={15} />
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
        {sortedReceipts.length > 0 && (
          <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedReceipts.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedReceipts.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{sortedReceipts.length}</span> recebimentos
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

      {/* Modal de Detalhes do Recebimento */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Comprovante & Detalhes do Recebimento"
      >
        {selectedRecebimento && (
          <div className="space-y-4 pt-1">
            {/* Header com Valor e Status */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider block">
                  Valor Liquidado
                </span>
                <span className="text-2xl font-bold text-[#006D50]">
                  {formatCurrency(selectedRecebimento.valor)}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={15} />
                Confirmado
              </span>
            </div>

            {/* Grid de Informações */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Cliente (Titular)</span>
                <strong className="text-slate-900 text-sm block">
                  {selectedRecebimento.clienteNome}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Contrato</span>
                <strong className="text-slate-900 text-sm font-mono block">
                  {selectedRecebimento.mensalidade.numeroContrato || "N/D"}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Data da Liquidação</span>
                <strong className="text-slate-900 font-mono block">
                  {formatDate(selectedRecebimento.data)}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Competência</span>
                <strong className="text-slate-900 font-mono block">
                  {selectedRecebimento.mensalidade.competencia}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Método de Pagamento</span>
                <strong className="text-slate-900 block">
                  {selectedRecebimento.metodo}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Plano Vinculado</span>
                <strong className="text-slate-900 block">
                  {selectedRecebimento.mensalidade.planoNome || "Padrão"}
                </strong>
              </div>

              {selectedRecebimento.cobranca && (
                <>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block mb-0.5">ID da Transação Gateway (ASAAS)</span>
                    <strong className="text-slate-900 font-mono text-[11px] block">
                      {selectedRecebimento.cobranca.gatewayPaymentId || "Não informado"}
                    </strong>
                  </div>
                </>
              )}
            </div>

            {/* Observações */}
            {selectedRecebimento.mensalidade.observacao && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-slate-500 font-semibold block">Observações do Registro:</span>
                <p className="text-slate-700">{selectedRecebimento.mensalidade.observacao}</p>
              </div>
            )}

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
              {selectedRecebimento.cobranca?.invoiceUrl && (
                <button
                  type="button"
                  onClick={() => window.open(selectedRecebimento.cobranca.invoiceUrl || "", "_blank")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <ExternalLink size={14} />
                  <span>Ver Fatura no ASAAS</span>
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

      {/* Modal de Visualização do QR Code PIX */}
      <Modal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        title="Comprovante & QR Code PIX"
      >
        {activePixCobranca && (
          <div className="space-y-4 pt-1 flex flex-col items-center">
            {activePixCobranca.pixQrCode && (
              <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${activePixCobranca.pixQrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 block mx-auto object-contain"
                />
                <span className="text-[11px] text-slate-500 font-medium mt-2 block">
                  QR Code dinâmico do Gateway
                </span>
              </div>
            )}

            {activePixCobranca.pixCopyPaste && (
              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  Código PIX Copia e Cola:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activePixCobranca.pixCopyPaste}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activePixCobranca.pixCopyPaste || "");
                      toast.success("Código PIX copiado!");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 rounded-lg shadow-sm transition-all"
                  >
                    <Copy size={14} />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsPixModalOpen(false)}
              className="w-full mt-2 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
