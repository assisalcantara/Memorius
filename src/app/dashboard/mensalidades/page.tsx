/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { Mensalidade, Contrato, Plano, Cobranca } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
  ExternalLink,
  Copy,
  QrCode,
  FileText,
  Clock,
  Zap,
  Trash2,
  AlertTriangle,
  User,
  Tag,
} from "@/components/icons/AdminIcons";

export default function MensalidadesPage() {
  const { data: mensalidades, loading: loadingMensalidades, create, update } = useStorage<Mensalidade>(
    mensalidadesSupabaseService as any
  );
  const { data: contratos, loading: loadingContratos } = useStorage<Contrato>(
    contratosSupabaseService as any
  );
  const { data: planos, loading: loadingPlanos } = useStorage<Plano>(
    planosSupabaseService as any
  );
  const { data: cobrancas, loading: loadingCobrancas, refresh: reloadCobrancas } = useStorage<Cobranca>(
    cobrancasSupabaseService as any
  );
  const toast = useToast();

  const loading = loadingMensalidades || loadingContratos || loadingPlanos || loadingCobrancas;

  // Estados de Modais
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | number | null>(null);

  // Estados de PIX
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [activePixCobranca, setActivePixCobranca] = useState<Cobranca | null>(null);
  const [generatingPixId, setGeneratingPixId] = useState<string | number | null>(null);

  // Estados de Filtro e Busca
  const [searchTitular, setSearchTitular] = useState("");
  const [searchContrato, setSearchContrato] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [competenciaFilter, setCompetenciaFilter] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estados do Formulário de Geração
  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  // Detalhes do contrato e plano selecionado para geração
  const selectedContrato = useMemo(() => {
    return contratos.find((c) => String(c.id) === String(selectedContratoId));
  }, [contratos, selectedContratoId]);

  const selectedPlano = useMemo(() => {
    return selectedContrato
      ? planos.find((p) => String(p.id) === String(selectedContrato.planoId))
      : null;
  }, [selectedContrato, planos]);

  const valorPlano = selectedPlano ? Number(selectedPlano.valorMensal || 0) : 0;

  // Estados do Formulário de Baixa Manual (Recebimento)
  const [payingMensalidade, setPayingMensalidade] = useState<Mensalidade | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canCreate = contratos.length > 0;

  // Abertura do Modal de Geração
  const handleOpenGenerate = () => {
    if (!canCreate) {
      toast.error("É necessário ter pelo menos um Contrato ativo para gerar mensalidades.");
      return;
    }
    setSelectedContratoId(String(contratos[0].id));

    // Padrão de competência: mês/ano atual (ex: 06/2026)
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentYear = now.getFullYear();
    setCompetencia(`${currentMonth}/${currentYear}`);

    // Padrão de vencimento: 10 dias a frente
    const due = new Date();
    due.setDate(due.getDate() + 10);
    setDataVencimento(due.toISOString().split("T")[0]);

    setIsGenerateModalOpen(true);
  };

  // Abertura do Modal de Recebimento
  const handleOpenPay = (m: Mensalidade) => {
    if (m.status !== "EM_ABERTO") {
      toast.error("Apenas mensalidades EM ABERTO podem ser liquidadas.");
      return;
    }
    setPayingMensalidade(m);
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setValorRecebido(String(m.valor));
    setObservacao("");
    setIsPayModalOpen(true);
  };

  // Submit de Geração
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContrato || !competencia || !dataVencimento) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);
    const payload: Omit<Mensalidade, "id"> = {
      contratoId: selectedContrato.id!,
      numeroContrato: selectedContrato.numeroContrato,
      clienteNome: selectedContrato.clienteNome,
      planoNome: selectedContrato.planoNome,
      competencia,
      dataVencimento,
      valor: valorPlano,
      status: "EM_ABERTO",
    };

    try {
      await create(payload);
      toast.success("Mensalidade gerada com sucesso!");
      setIsGenerateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar mensalidade.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit de Baixa Manual
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payingMensalidade || !payingMensalidade.id || !dataPagamento || !valorRecebido) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);
    try {
      await update(payingMensalidade.id, {
        status: "PAGO",
        dataPagamento,
        valorRecebido: Number(valorRecebido),
        observacao,
      });

      toast.success("Pagamento confirmado e mensalidade liquidada!");
      setIsPayModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao receber pagamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (id: string | number) => {
    setConfirmCancelId(id);
  };

  // Helper de PIX Ativo
  const getActivePix = (mId: string | number) => {
    return cobrancas.find(
      (c) =>
        String(c.mensalidadeId) === String(mId) &&
        c.gatewayMethod === "PIX" &&
        c.gatewayStatus !== "CANCELLED" &&
        c.gatewayStatus !== "CANCELED"
    );
  };

  const handleGeneratePix = async (mId: string | number) => {
    if (generatingPixId !== null) return;

    const existing = getActivePix(mId);
    if (existing) {
      toast.success("Cobrança PIX já disponível para esta mensalidade.");
      setActivePixCobranca(existing);
      setIsPixModalOpen(true);
      return;
    }

    setGeneratingPixId(mId);
    try {
      const result = await cobrancasSupabaseService.createPixFromMensalidade(mId);
      if (result) {
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

  // Filtragem da Lista
  const filteredMensalidades = useMemo(() => {
    return mensalidades.filter((m) => {
      const titQ = searchTitular.toLowerCase().trim();
      const matchesTitular = !titQ || m.clienteNome?.toLowerCase().includes(titQ);

      const contQ = searchContrato.toLowerCase().trim();
      const matchesContrato = !contQ || m.numeroContrato?.toLowerCase().includes(contQ);

      const matchesStatus = statusFilter === "TODOS" || m.status === statusFilter;

      const compQ = competenciaFilter.toLowerCase().trim();
      const matchesCompetencia = !compQ || m.competencia?.toLowerCase().includes(compQ);

      return matchesTitular && matchesContrato && matchesStatus && matchesCompetencia;
    });
  }, [mensalidades, searchTitular, searchContrato, statusFilter, competenciaFilter]);

  // Cálculos de Totais dos KPIs
  const totalEmAberto = useMemo(() => {
    return filteredMensalidades
      .filter((m) => m.status === "EM_ABERTO")
      .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  }, [filteredMensalidades]);

  const totalPago = useMemo(() => {
    return filteredMensalidades
      .filter((m) => m.status === "PAGO")
      .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);
  }, [filteredMensalidades]);

  const qtdEmAberto = useMemo(() => {
    return filteredMensalidades.filter((m) => m.status === "EM_ABERTO").length;
  }, [filteredMensalidades]);

  const qtdPago = useMemo(() => {
    return filteredMensalidades.filter((m) => m.status === "PAGO").length;
  }, [filteredMensalidades]);

  // Ordenação: mais recentes por vencimento
  const sortedMensalidades = useMemo(() => {
    return [...filteredMensalidades].sort((a, b) => (b.dataVencimento || "").localeCompare(a.dataVencimento || ""));
  }, [filteredMensalidades]);

  // Paginação
  const totalPages = Math.ceil(sortedMensalidades.length / itemsPerPage) || 1;
  const paginatedMensalidades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedMensalidades.slice(start, start + itemsPerPage);
  }, [sortedMensalidades, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleClearFilters = () => {
    setSearchTitular("");
    setSearchContrato("");
    setStatusFilter("TODOS");
    setCompetenciaFilter("");
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
              Gestão de Mensalidades
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Geração de competências, controle de vencimentos, baixa manual e emissão de cobranças PIX
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenGenerate}
          disabled={!canCreate}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008C66]/30 ${
            canCreate
              ? "bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] cursor-pointer"
              : "bg-[#94A3B8] opacity-60 cursor-not-allowed"
          }`}
        >
          <PlusCircle size={18} strokeWidth={2.2} />
          <span>Gerar Mensalidade</span>
        </button>
      </div>

      {/* Alerta Preventivo */}
      {!canCreate && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm text-sm animate-fadeIn">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <strong className="font-semibold text-amber-950">Pré-requisito para Geração:</strong>
            <p className="text-amber-800 text-xs md:text-sm mt-0.5">
              Você precisa ter ao menos um <strong>Contrato</strong> ativo cadastrado antes de poder gerar mensalidades.
            </p>
          </div>
        </div>
      )}

      {/* Faixa de KPIs (4 Cards em Grid Responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total em Aberto */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total em Aberto
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalEmAberto)}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">{qtdEmAberto} mensalidade(s) pendente(s)</p>
          </div>
        </div>

        {/* KPI 2: Total Recebido */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total Liquidado
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#008C66]">
              {formatCurrency(totalPago)}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">{qtdPago} mensalidade(s) quitada(s)</p>
          </div>
        </div>

        {/* KPI 3: Qtd em Aberto */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Faturas a Vencer
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <FileText size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">{qtdEmAberto}</div>
            <p className="text-xs text-[#94A3B8] mt-1">Aguardando baixa ou gateway</p>
          </div>
        </div>

        {/* KPI 4: Qtd Pagas */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Faturas Liquidadas
            </span>
            <div className="p-2 bg-green-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">{qtdPago}</div>
            <p className="text-xs text-[#94A3B8] mt-1">Pagamentos confirmados</p>
          </div>
        </div>
      </div>

      {/* Card Principal: Filtros + Listagem de Mensalidades */}
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 md:p-5 border-b border-[#E5EAF0] bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Input de Titular */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por titular..."
                value={searchTitular}
                onChange={(e) => {
                  setSearchTitular(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>

            {/* Input de Contrato */}
            <div className="relative">
              <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Nº de Contrato..."
                value={searchContrato}
                onChange={(e) => {
                  setSearchContrato(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>

            {/* Seletor de Status */}
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
                <option value="EM_ABERTO">Em Aberto</option>
                <option value="PAGO">Pago</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>

            {/* Input de Competência */}
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Competência (MM/AAAA)..."
                value={competenciaFilter}
                onChange={(e) => {
                  setCompetenciaFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>
          </div>

          {/* Botão de Limpar Filtros */}
          {(searchTitular || searchContrato || statusFilter !== "TODOS" || competenciaFilter) && (
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

        {/* Tabela de Mensalidades */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sortedMensalidades.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-[#64748B] mb-3">
                <DollarSign size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Nenhuma mensalidade encontrada</h3>
              <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
                Gere mensalidades manuais ou a partir de contratos vigentes para gerenciar seus vencimentos.
              </p>
              {canCreate && !searchTitular && !searchContrato && statusFilter === "TODOS" && !competenciaFilter && (
                <button
                  onClick={handleOpenGenerate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 transition-all shadow-sm"
                >
                  <PlusCircle size={16} />
                  Gerar Primeira Mensalidade
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Nº Contrato</th>
                  <th className="py-3 px-4">Titular</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4 text-center">Competência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-sm text-[#1E293B]">
                {paginatedMensalidades.map((m) => {
                  const isAberto = m.status === "EM_ABERTO";
                  const isPago = m.status === "PAGO";
                  const isCancelado = m.status === "CANCELADO";
                  const pix = getActivePix(m.id!);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Nº Contrato */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0F172A]">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[#334155] border border-slate-200">
                          {m.numeroContrato}
                        </span>
                      </td>

                      {/* Titular */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#008C66] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {m.clienteNome?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <span className="font-semibold block truncate max-w-[180px]">
                            {m.clienteNome}
                          </span>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="py-3.5 px-4 text-xs text-[#475569]">
                        {m.planoNome || "Plano Ativo"}
                      </td>

                      {/* Competência */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {m.competencia}
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#94A3B8]" />
                          <span>{formatDate(m.dataVencimento)}</span>
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 font-bold text-xs text-[#0F172A]">
                        {formatCurrency(m.valor)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPago
                              ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                              : isAberto
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPago
                                ? "bg-[#008C66]"
                                : isAberto
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {isPago ? "Pago" : isAberto ? "Em Aberto" : "Cancelado"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {isAberto && (
                            <>
                              {/* Botão de PIX */}
                              {pix ? (
                                <button
                                  onClick={() => {
                                    setActivePixCobranca(pix);
                                    setIsPixModalOpen(true);
                                  }}
                                  title="Ver QR Code PIX da cobrança"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
                                >
                                  <QrCode size={14} />
                                  <span>Ver PIX</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGeneratePix(m.id!)}
                                  disabled={generatingPixId === m.id}
                                  title="Gerar cobrança PIX no ASAAS"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Zap size={14} />
                                  <span>{generatingPixId === m.id ? "Gerando..." : "Gerar PIX"}</span>
                                </button>
                              )}

                              {/* Baixa Manual */}
                              <button
                                onClick={() => handleOpenPay(m)}
                                title="Confirmar recebimento / Baixa manual"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 rounded-lg shadow-2xs transition-all"
                              >
                                <CheckCircle2 size={14} />
                                <span>Receber</span>
                              </button>

                              {/* Cancelar Mensalidade */}
                              <button
                                onClick={() => handleCancel(m.id!)}
                                title="Cancelar mensalidade"
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}

                          {isPago && (
                            <span className="text-xs text-slate-500 italic pr-1">
                              Liquidado em {formatDate(m.dataPagamento || "")}
                            </span>
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
        {sortedMensalidades.length > 0 && (
          <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedMensalidades.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(sortedMensalidades.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{sortedMensalidades.length}</span> mensalidades
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

      {/* Modal de Geração de Mensalidade Manual */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Gerar Mensalidade Manual"
      >
        <form onSubmit={handleGenerate} className="space-y-4 pt-1">
          {/* Seleção do Contrato */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Contrato / Titular <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedContratoId}
                onChange={(e) => setSelectedContratoId(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numeroContrato} — {c.clienteNome} ({c.planoNome || "Plano Ativo"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card Resumo do Contrato Selecionado */}
          {selectedContrato && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-[#006D50]">
                <span>Titular: {selectedContrato.clienteNome}</span>
                <span>{formatCurrency(valorPlano)} / mês</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Plano: <strong>{selectedContrato.planoNome}</strong> • Contrato: <strong>{selectedContrato.numeroContrato}</strong>
              </p>
            </div>
          )}

          {/* Competência e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Competência (MM/AAAA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 06/2026"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Data de Vencimento <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <PlusCircle size={16} />
              <span>Gerar Mensalidade</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Baixa Manual (Recebimento) */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Confirmar Recebimento / Baixa Manual"
      >
        <form onSubmit={handlePaySubmit} className="space-y-4 pt-1">
          {payingMensalidade && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{payingMensalidade.clienteNome}</span>
                <span className="text-emerald-700 font-bold text-sm">
                  {formatCurrency(payingMensalidade.valor)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Contrato: <strong>{payingMensalidade.numeroContrato}</strong> • Competência: <strong>{payingMensalidade.competencia}</strong>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Data do Pagamento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Valor Recebido (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Observações / Comentários
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pagamento recebido presencialmente no caixa"
              className="w-full px-3.5 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] rounded-lg shadow-sm transition-all"
            >
              <CheckCircle2 size={16} />
              <span>Confirmar Baixa</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal PIX ASAAS */}
      <Modal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        title="Cobrança PIX — Gateway ASAAS"
      >
        {activePixCobranca && (
          <div className="space-y-4 pt-1 flex flex-col items-center">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                activePixCobranca.gatewayStatus === "RECEIVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              Status: {activePixCobranca.gatewayStatus}
            </span>

            <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Valor a Pagar:</span>
                <span className="text-[#008C66] text-sm">{formatCurrency(activePixCobranca.valor)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vencimento:</span>
                <span className="font-mono">{formatDate(activePixCobranca.vencimento)}</span>
              </div>
            </div>

            {/* QR Code */}
            {activePixCobranca.pixQrCode && activePixCobranca.gatewayStatus !== "RECEIVED" && (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${activePixCobranca.pixQrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 block mx-auto object-contain"
                />
                <span className="text-[11px] text-slate-500 font-medium mt-2 block">
                  Escaneie pelo aplicativo do seu banco
                </span>
              </div>
            )}

            {/* Código PIX Copia e Cola */}
            {activePixCobranca.pixCopyPaste && activePixCobranca.gatewayStatus !== "RECEIVED" && (
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
                  <span>Fatura ASAAS</span>
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

      {/* Modal Diálogo de Confirmação de Cancelamento */}
      <ModalConfirm
        isOpen={confirmCancelId !== null}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={async () => {
          if (confirmCancelId !== null) {
            try {
              await update(confirmCancelId, { status: "CANCELADO" });
              toast.success("Mensalidade cancelada com sucesso!");
              setConfirmCancelId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao cancelar mensalidade.");
            }
          }
        }}
        title="Cancelar Mensalidade"
        message="Tem certeza que deseja cancelar esta mensalidade? Essa alteração ficará registrada no histórico financeiro."
        confirmText="Confirmar Cancelamento"
        variant="danger"
      />
    </div>
  );
}
