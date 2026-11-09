/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Cobranca, Mensalidade, Cliente } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart3,
  PieChart,
  Calendar,
  UsersRound,
} from "@/components/icons/AdminIcons";

export default function DashboardFinanceiroPage() {
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(
    mensalidadesSupabaseService as any
  );
  const { data: cobrancas, loading: loadingCobrancas } = useStorage<Cobranca>(
    cobrancasSupabaseService as any
  );
  const { data: clientes, loading: loadingClientes } = useStorage<Cliente>(
    clientesSupabaseService as any
  );

  const loading = loadingMensalidades || loadingCobrancas || loadingClientes;

  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const currentCompetencia = `${String(currentMonthNum).padStart(2, "0")}/${currentYearNum}`;

  // Helper map para localizar nomes de clientes
  const clientMap = useMemo(() => {
    return new Map(clientes.map((c) => [String(c.id), c.nomeCompleto]));
  }, [clientes]);

  const getClientName = (clienteId: string | number) => {
    return clientMap.get(String(clienteId)) || `Cliente #${clienteId}`;
  };

  // Helper tolerante para status de cobranças
  const mapCobrancaStatus = (status: string) => {
    const st = String(status || "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "PAGO"].includes(st)) return "Pago";
    if (["PENDING", "PIX_GERADO", "AWAITING_PAYMENT"].includes(st)) return "Pendente";
    if (["CANCELLED", "CANCELED"].includes(st)) return "Cancelado";
    return "Outro";
  };

  // --- Cálculos Financeiros (Mês Atual) ---
  const mensalidadesMesAtual = useMemo(() => {
    return mensalidades.filter((m) => m.competencia === currentCompetencia);
  }, [mensalidades, currentCompetencia]);

  const receitaPrevista = useMemo(() => {
    return mensalidadesMesAtual
      .filter((m) => m.status === "EM_ABERTO" || m.status === "PAGO")
      .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  }, [mensalidadesMesAtual]);

  const receitaRecebida = useMemo(() => {
    return mensalidadesMesAtual
      .filter((m) => m.status === "PAGO")
      .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);
  }, [mensalidadesMesAtual]);

  const receitaEmAberto = useMemo(() => {
    return mensalidadesMesAtual
      .filter((m) => m.status === "EM_ABERTO")
      .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  }, [mensalidadesMesAtual]);

  // PIX Pendentes gerais em aberto
  const pixPendentesQtd = useMemo(() => {
    return cobrancas.filter(
      (c) => c.gatewayMethod === "PIX" && mapCobrancaStatus(c.gatewayStatus || "") === "Pendente"
    ).length;
  }, [cobrancas]);

  // Taxa de Adimplência do Mês
  const taxaAdimplencia = receitaPrevista > 0 ? (receitaRecebida / receitaPrevista) * 100 : 0;

  // Total Recebido Hoje
  const recebidosHoje = useMemo(() => {
    return mensalidades
      .filter((m) => m.status === "PAGO" && m.dataPagamento === todayStr)
      .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);
  }, [mensalidades, todayStr]);

  // --- Gráfico 1: Evolução da Receita nos Últimos 6 Meses ---
  const last6Months = useMemo(() => {
    const list: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYearNum, currentMonthNum - 1 - i, 1);
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const value = mensalidades
        .filter((m) => m.competencia === label && m.status === "PAGO")
        .reduce((sum, m) => sum + Number(m.valorRecebido || m.valor || 0), 0);
      list.push({ label, value });
    }
    return list;
  }, [mensalidades, currentMonthNum, currentYearNum]);

  const maxVal = Math.max(...last6Months.map((m) => m.value), 100);

  // --- Gráfico 2: Distribuição por Status das Cobranças (Donut) ---
  const { pagoCount, pendenteCount, canceladoCount, totalCobrancas } = useMemo(() => {
    let p = 0;
    let pen = 0;
    let cCount = 0;

    cobrancas.forEach((c) => {
      const mapped = mapCobrancaStatus(c.gatewayStatus || "");
      if (mapped === "Pago") p++;
      else if (mapped === "Pendente") pen++;
      else if (mapped === "Cancelado") cCount++;
    });

    return {
      pagoCount: p,
      pendenteCount: pen,
      canceladoCount: cCount,
      totalCobrancas: p + pen + cCount,
    };
  }, [cobrancas]);

  // Cálculos do Donut SVG
  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~219.91
  const pPago = totalCobrancas > 0 ? pagoCount / totalCobrancas : 0;
  const pPendente = totalCobrancas > 0 ? pendenteCount / totalCobrancas : 0;
  const pCancelado = totalCobrancas > 0 ? canceladoCount / totalCobrancas : 0;

  const dashPago = pPago * circumference;
  const dashPendente = pPendente * circumference;
  const dashCancelado = pCancelado * circumference;

  // --- Listagens e Alertas Financeiros ---
  const ultimosRecebimentos = useMemo(() => {
    return mensalidades
      .filter((m) => m.status === "PAGO")
      .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
      .slice(0, 5);
  }, [mensalidades]);

  // Alertas
  const cobrancasVencidas = useMemo(() => {
    return cobrancas.filter(
      (c) =>
        c.gatewayStatus === "OVERDUE" ||
        (mapCobrancaStatus(c.gatewayStatus || "") === "Pendente" && c.vencimento < todayStr)
    );
  }, [cobrancas, todayStr]);

  const mensalidadesVencidasSemCobranca = useMemo(() => {
    return mensalidades.filter((m) => {
      if (m.status !== "EM_ABERTO" || m.dataVencimento >= todayStr) return false;
      const hasCobranca = cobrancas.some(
        (c) =>
          String(c.mensalidadeId) === String(m.id) &&
          mapCobrancaStatus(c.gatewayStatus || "") !== "Cancelado"
      );
      return !hasCobranca;
    });
  }, [mensalidades, cobrancas, todayStr]);

  const pixAguardandoPagamento = useMemo(() => {
    return cobrancas.filter(
      (c) => c.gatewayMethod === "PIX" && mapCobrancaStatus(c.gatewayStatus || "") === "Pendente"
    );
  }, [cobrancas]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-20 bg-white rounded-xl border border-[#E5EAF0] p-6" />
        {/* Skeleton KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-[#E5EAF0] p-4" />
          ))}
        </div>
        {/* Skeleton Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 h-72 bg-white rounded-xl border border-[#E5EAF0]" />
          <div className="lg:col-span-5 h-72 bg-white rounded-xl border border-[#E5EAF0]" />
        </div>
      </div>
    );
  }

  const hasData = mensalidades.length > 0 || cobrancas.length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho Institucional do Dashboard Financeiro com Barra Dourada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#F5BD22] rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <TrendingUp className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Dashboard Financeiro
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Consolidação de receitas, fluxo de recebimentos, distribuição de cobranças e indicadores de adimplência
            </p>
          </div>
        </div>

        {/* Badge Informativo da Competência Atual */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[#006D50] text-xs font-semibold self-start sm:self-auto">
          <Calendar size={15} />
          <span>Competência Atual: <strong>{currentCompetencia}</strong></span>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-[#008C66] mb-3">
            <DollarSign size={28} />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Nenhuma movimentação financeira encontrada</h3>
          <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
            Quando existirem cobranças, mensalidades e pagamentos registrados no sistema, seus indicadores e demonstrativos analíticos aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Faixa Principal de KPIs Financeiros (6 Cards em Grid Responsivo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* KPI 1: Receita Prevista */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-sm hover:border-[#008C66]/30 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Previsto (Mês)
                </span>
                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                  <DollarSign size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#0F172A] truncate">
                  {formatCurrency(receitaPrevista)}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Aberto + Pago ({currentCompetencia})</p>
              </div>
            </div>

            {/* KPI 2: Receita Recebida */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Recebido (Mês)
                </span>
                <div className="p-1.5 bg-emerald-50 rounded-lg text-[#008C66]">
                  <CheckCircle2 size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#008C66] truncate">
                  {formatCurrency(receitaRecebida)}
                </div>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Liquidado na competência</p>
              </div>
            </div>

            {/* KPI 3: Receita em Aberto */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Em Aberto (Mês)
                </span>
                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                  <Clock size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-amber-600 truncate">
                  {formatCurrency(receitaEmAberto)}
                </div>
                <p className="text-[10px] text-amber-700 font-medium mt-0.5">A vencer no mês atual</p>
              </div>
            </div>

            {/* KPI 4: Taxa de Adimplência */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Adimplência
                </span>
                <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                  <TrendingUp size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-purple-700">
                  {taxaAdimplencia.toFixed(1)}%
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Recebido vs Previsto</p>
              </div>
            </div>

            {/* KPI 5: PIX Pendentes */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-sm hover:border-cyan-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  PIX Aguardando
                </span>
                <div className="p-1.5 bg-cyan-50 rounded-lg text-cyan-600">
                  <FileText size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#0F172A]">
                  {pixPendentesQtd}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Aguardando liquidação</p>
              </div>
            </div>

            {/* KPI 6: Recebido Hoje */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Recebido Hoje
                </span>
                <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                  <DollarSign size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#0F172A] truncate">
                  {formatCurrency(recebidosHoje)}
                </div>
                <p className="text-[10px] text-rose-600 font-medium mt-0.5">Pagamentos de hoje</p>
              </div>
            </div>
          </div>

          {/* Segunda Linha: Gráficos de Evolução e Distribuição (Proporção ~1.65fr / 1fr) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Gráfico 1: Evolução da Receita (Barras) */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-xl border border-[#E5EAF0] p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-[#008C66]" size={18} />
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Evolução da Receita Liquidada (Últimos 6 Meses)
                  </h3>
                </div>
                <span className="text-xs text-[#64748B] font-medium">Competências</span>
              </div>

              <div className="w-full h-56 flex items-center justify-center">
                <svg width="100%" height="220" viewBox="0 0 520 220" className="overflow-visible">
                  {/* Linhas de Grade de Apoio */}
                  <line x1="40" y1="30" x2="500" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="80" x2="500" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="130" x2="500" y2="130" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="175" x2="500" y2="175" stroke="#CBD5E1" strokeWidth="1.5" />

                  {/* Barras Verticais de Receita */}
                  {last6Months.map((m, i) => {
                    const barWidth = 42;
                    const spacing = 75;
                    const x = 55 + i * spacing;
                    const barHeight = (m.value / maxVal) * 140;
                    const y = 175 - barHeight;

                    return (
                      <g key={`bar-${i}`} className="group cursor-pointer">
                        {/* Barra com Gradiente Esmeralda */}
                        <defs>
                          <linearGradient id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#008C66" />
                            <stop offset="100%" stopColor="#006D50" />
                          </linearGradient>
                        </defs>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(barHeight, 4)}
                          fill={`url(#barGrad-${i})`}
                          rx="6"
                          className="transition-all duration-300 group-hover:brightness-110"
                        />
                        {/* Rótulo de Valor Acima da Barra */}
                        {m.value > 0 && (
                          <text
                            x={x + barWidth / 2}
                            y={y - 8}
                            fill="#0F172A"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            R$ {Math.round(m.value)}
                          </text>
                        )}
                        {/* Rótulo de Competência Abaixo da Barra */}
                        <text
                          x={x + barWidth / 2}
                          y="195"
                          fill="#64748B"
                          fontSize="11"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {m.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Gráfico 2: Status das Cobranças (Donut) */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-[#E5EAF0] p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="text-[#008C66]" size={18} />
                  <h3 className="text-sm font-bold text-[#0F172A]">Status das Cobranças</h3>
                </div>
                <span className="text-xs text-[#64748B] font-medium">{totalCobrancas} total</span>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6">
                {totalCobrancas > 0 ? (
                  <>
                    {/* Gráfico Donut em SVG */}
                    <div className="relative flex-shrink-0">
                      <svg width="130" height="130" viewBox="0 0 100 100" className="-rotate-90">
                        {/* Trilha de fundo */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="#F1F5F9"
                          strokeWidth="12"
                        />
                        {/* Segmento Pago (Verde) */}
                        {pPago > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke="#008C66"
                            strokeWidth="12"
                            strokeDasharray={`${dashPago} ${circumference}`}
                            strokeDashoffset={0}
                          />
                        )}
                        {/* Segmento Pendente (Amarelo/Laranja) */}
                        {pPendente > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke="#F5BD22"
                            strokeWidth="12"
                            strokeDasharray={`${dashPendente} ${circumference}`}
                            strokeDashoffset={-dashPago}
                          />
                        )}
                        {/* Segmento Cancelado (Vermelho) */}
                        {pCancelado > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke="#EF4444"
                            strokeWidth="12"
                            strokeDasharray={`${dashCancelado} ${circumference}`}
                            strokeDashoffset={-(dashPago + dashPendente)}
                          />
                        )}
                      </svg>
                      {/* Texto Central */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-[#0F172A]">{pagoCount}</span>
                        <span className="text-[9px] text-[#64748B]">pagos</span>
                      </div>
                    </div>

                    {/* Legenda Lateral com Percentuais */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#008C66] flex-shrink-0" />
                        <span className="text-slate-700">
                          <strong>Pago:</strong> {pagoCount} ({(pPago * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#F5BD22] flex-shrink-0" />
                        <span className="text-slate-700">
                          <strong>Pendente:</strong> {pendenteCount} ({(pPendente * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#EF4444] flex-shrink-0" />
                        <span className="text-slate-700">
                          <strong>Cancelado:</strong> {canceladoCount} ({(pCancelado * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-[#64748B]">
                        Total Geral: <strong>{totalCobrancas}</strong> registros
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-xs text-slate-400 py-6">
                    Nenhuma cobrança registrada para análise gráfica.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terceira Linha: Últimos Recebimentos & Painel de Alertas Financeiros */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Tabela de Últimos Recebimentos */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 md:p-5 border-b border-[#E5EAF0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#008C66]" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Últimos Recebimentos</h3>
                </div>
                <span className="text-xs text-[#64748B] font-medium">
                  {ultimosRecebimentos.length} registros recentes
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                {ultimosRecebimentos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nenhum recebimento registrado até o momento.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Cliente / Contrato</th>
                        <th className="py-2.5 px-4">Valor Recebido</th>
                        <th className="py-2.5 px-4">Data Pagamento</th>
                        <th className="py-2.5 px-4">Método</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0] text-[#1E293B]">
                      {ultimosRecebimentos.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#0F172A]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#008C66] flex items-center justify-center font-bold text-[10px]">
                                {getClientName(m.contratoId || "").charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[180px]">
                                {getClientName(m.contratoId || "")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#008C66]">
                            {formatCurrency(Number(m.valorRecebido || m.valor))}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {formatDate(m.dataPagamento || "")}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                              {m.gatewayMethod || "Manual"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#008C66] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#008C66]" />
                              Liquidado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Painel de Alertas e Notificações Financeiras */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-[#E5EAF0] p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <h3 className="text-sm font-bold text-[#0F172A]">Alertas & Conciliação</h3>
                </div>
                <span className="text-xs text-[#64748B] font-medium">Atenção Prioritária</span>
              </div>

              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {/* Alerta 1: Cobranças Vencidas */}
                {cobrancasVencidas.length > 0 && (
                  <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                      <span>Cobranças Vencidas ({cobrancasVencidas.length})</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Cobranças emitidas que ultrapassaram a data de vencimento e não foram liquidadas no gateway.
                    </p>
                  </div>
                )}

                {/* Alerta 2: Mensalidades vencidas sem cobrança */}
                {mensalidadesVencidasSemCobranca.length > 0 && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <Clock size={15} className="text-amber-600 flex-shrink-0" />
                      <span>Mensalidades Sem Cobrança ({mensalidadesVencidasSemCobranca.length})</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Mensalidades vencidas em aberto que não possuem nenhuma cobrança de gateway correspondente.
                    </p>
                  </div>
                )}

                {/* Alerta 3: PIX aguardando pagamento */}
                {pixAguardandoPagamento.length > 0 && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                      <FileText size={15} className="text-blue-600 flex-shrink-0" />
                      <span>PIX Aguardando Pagamento ({pixAguardandoPagamento.length})</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Cobranças via QR Code / chave PIX geradas e pendentes de leitura ou liquidação.
                    </p>
                  </div>
                )}

                {cobrancasVencidas.length === 0 &&
                  mensalidadesVencidasSemCobranca.length === 0 &&
                  pixAguardandoPagamento.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <CheckCircle2 size={32} className="text-[#008C66] mx-auto mb-2 opacity-80" />
                      <strong className="block text-slate-700">Tudo em conformidade</strong>
                      <span>Nenhum alerta pendente. A saúde financeira está em dia!</span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
