/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";
import { usePermission } from "@/context/PermissionContext";
import { useTenant } from "@/context/TenantContext";
import { generateClientesReport } from "@/lib/reports/clientes.report";
import { generateContratosReport } from "@/lib/reports/contratos.report";
import { generateMensalidadesReport } from "@/lib/reports/mensalidades.report";
import { generateAtendimentosReport } from "@/lib/reports/atendimentos.report";
import { Cliente, Contrato, Plano, Mensalidade, Atendimento } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText,
  Printer,
  UsersRound,
  DollarSign,
  HeartPulse,
  Filter,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Tag,
  Building2,
  AlertTriangle,
} from "@/components/icons/AdminIcons";

type ReportModule = "CLIENTES" | "CONTRATOS" | "MENSALIDADES" | "ATENDIMENTOS";

export default function RelatoriosPage() {
  const { tenant, userProfile } = useTenant();
  const { roleName } = usePermission();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    empresaConfigSupabaseService.getConfig().then((res) => {
      if (res) setConfig(res);
    });
  }, [tenant]);

  // Carregamento dos dados via hooks oficiais
  const { data: clientes, loading: loadingClientes } = useStorage<Cliente>(
    clientesSupabaseService as any
  );
  const { data: contratos, loading: loadingContratos } = useStorage<Contrato>(
    contratosSupabaseService as any
  );
  const { data: planos, loading: loadingPlanos } = useStorage<Plano>(
    planosSupabaseService as any
  );
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(
    mensalidadesSupabaseService as any
  );
  const { data: atendimentos, loading: loadingAtendimentos } = useStorage<Atendimento>(
    atendimentosSupabaseService as any
  );

  const loading =
    loadingClientes || loadingContratos || loadingPlanos || loadingMensalidades || loadingAtendimentos;

  // Permissões por perfil
  const isFullView = roleName === "ADMIN" || roleName === "GERENTE";
  const isAtendente = roleName === "ATENDENTE";
  const isFinanceiro = roleName === "FINANCEIRO";
  const isConsulta = roleName === "CONSULTA";

  const getInitialModule = (): ReportModule => {
    if (isFinanceiro) return "MENSALIDADES";
    if (isAtendente) return "CLIENTES";
    return "CLIENTES";
  };

  const [activeModule, setActiveModule] = useState<ReportModule>(getInitialModule());

  // Estados dos Filtros por Módulo
  const [clientStatus, setClientStatus] = useState("TODOS");
  const [clientCity, setClientCity] = useState("");

  const [contractStatus, setContractStatus] = useState("TODOS");
  const [contractPlan, setContractPlan] = useState("TODOS");

  const [paymentStatus, setPaymentStatus] = useState("TODOS");
  const [paymentDateStart, setPaymentDateStart] = useState("");
  const [paymentDateEnd, setPaymentDateEnd] = useState("");

  const [appointmentStatus, setAppointmentStatus] = useState("TODOS");
  const [appointmentDateStart, setAppointmentDateStart] = useState("");
  const [appointmentDateEnd, setAppointmentDateEnd] = useState("");

  // Paginação na visualização prévia da tela
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Resetar página ao trocar de módulo ou filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeModule,
    clientStatus,
    clientCity,
    contractStatus,
    contractPlan,
    paymentStatus,
    paymentDateStart,
    paymentDateEnd,
    appointmentStatus,
    appointmentDateStart,
    appointmentDateEnd,
  ]);

  // Checagem de permissão por aba
  const isTabAllowed = (tab: ReportModule): boolean => {
    if (isFullView || isConsulta) return true;
    if (isFinanceiro && tab === "MENSALIDADES") return true;
    if (isAtendente && (tab === "CLIENTES" || tab === "ATENDIMENTOS")) return true;
    return false;
  };

  // Execução das consultas oficiais de geração de relatório
  const filteredRecords = useMemo((): any[] => {
    if (activeModule === "CLIENTES") {
      return generateClientesReport(clientes, { status: clientStatus, cidade: clientCity });
    }
    if (activeModule === "CONTRATOS") {
      return generateContratosReport(contratos, {
        status: contractStatus,
        planoId: contractPlan,
      });
    }
    if (activeModule === "MENSALIDADES") {
      return generateMensalidadesReport(mensalidades, {
        status: paymentStatus,
        dataInicio: paymentDateStart,
        dataFim: paymentDateEnd,
      });
    }
    if (activeModule === "ATENDIMENTOS") {
      return generateAtendimentosReport(atendimentos, {
        status: appointmentStatus,
        dataInicio: appointmentDateStart,
        dataFim: appointmentDateEnd,
      });
    }
    return [];
  }, [
    activeModule,
    clientes,
    clientStatus,
    clientCity,
    contratos,
    contractStatus,
    contractPlan,
    mensalidades,
    paymentStatus,
    paymentDateStart,
    paymentDateEnd,
    atendimentos,
    appointmentStatus,
    appointmentDateStart,
    appointmentDateEnd,
  ]);

  const hasRecords = filteredRecords.length > 0;

  // Descrição legível dos filtros aplicados
  const getFiltersDescription = () => {
    const desc: string[] = [];
    if (activeModule === "CLIENTES") {
      desc.push(`Status: ${clientStatus}`);
      if (clientCity) desc.push(`Cidade: ${clientCity}`);
    } else if (activeModule === "CONTRATOS") {
      desc.push(`Status: ${contractStatus}`);
      if (contractPlan !== "TODOS") {
        const pName = planos.find((p) => String(p.id) === contractPlan)?.nome || "Plano Selecionado";
        desc.push(`Plano: ${pName}`);
      }
    } else if (activeModule === "MENSALIDADES") {
      desc.push(`Status: ${paymentStatus}`);
      if (paymentDateStart || paymentDateEnd) {
        desc.push(`Período: ${paymentDateStart || "início"} até ${paymentDateEnd || "fim"}`);
      }
    } else if (activeModule === "ATENDIMENTOS") {
      desc.push(`Status: ${appointmentStatus}`);
      if (appointmentDateStart || appointmentDateEnd) {
        desc.push(`Período: ${appointmentDateStart || "início"} até ${appointmentDateEnd || "fim"}`);
      }
    }
    return desc.join(" | ");
  };

  // KPIs por módulo
  const totalGeral = filteredRecords.length;

  const handlePrint = () => {
    if (isConsulta || !hasRecords) return;
    window.print();
  };

  // Paginação dos itens em tela (não afeta impressão)
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* CSS Específico para Impressão PDF Timbrada */}
      <style jsx global>{`
        @media print {
          .no-print,
          aside,
          header,
          footer,
          button,
          .tab-menu,
          .filter-card {
            display: none !important;
          }

          body,
          .dashboard-container,
          .main-content {
            background: white !important;
            color: black !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .print-report-header-layout {
            display: block !important;
          }

          .screen-table-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 1.5rem !important;
          }

          th,
          td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            font-size: 10pt !important;
          }

          th {
            background-color: #f2f2f2 !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .pagination-footer {
            display: none !important;
          }
        }

        .print-report-header-layout {
          display: none;
        }
      `}</style>

      {/* Cabeçalho Institucional do Módulo com Barra Dourada */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#F5BD22] rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <FileText className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Relatórios & Impressões PDF
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Demonstrativos analíticos, emissão de listagens operacionais e exportação oficial em papel timbrado
            </p>
          </div>
        </div>

        {/* Botão de Impressão ou Aviso de Perfil */}
        {hasRecords && !isConsulta && (
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008C66]/30 cursor-pointer"
          >
            <Printer size={18} strokeWidth={2.2} />
            <span>Imprimir PDF Timbrado</span>
          </button>
        )}
        {isConsulta && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <AlertTriangle size={15} />
            <span>Modo Consulta: Impressão desativada</span>
          </span>
        )}
      </div>

      {/* Faixa de KPIs Resumo (4 Cards) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Registros Filtrados */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Registros no Relatório
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <FileText size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A]">{totalGeral}</div>
            <p className="text-xs text-[#94A3B8] mt-1">Conforme filtros selecionados</p>
          </div>
        </div>

        {/* KPI 2: Módulo Ativo */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Módulo Selecionado
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Tag size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700 capitalize">
              {activeModule.toLowerCase()}
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">Visão analítica operacional</p>
          </div>
        </div>

        {/* KPI 3: Operador / Emissor */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Operador Ativo
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <UsersRound size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-[#0F172A] truncate">
              {userProfile?.nome || "Operador do Sistema"}
            </div>
            <p className="text-xs text-purple-700 font-medium mt-1">Perfil: {roleName}</p>
          </div>
        </div>

        {/* KPI 4: Empresa / Tenant */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Empresa / Tenant
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Building2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-[#0F172A] truncate">
              {config?.nomeFantasia || tenant?.empresa || "Memorius"}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">Documento oficial timbrado</p>
          </div>
        </div>
      </div>

      {/* Menu de Abas por Módulo */}
      <div className="no-print bg-white p-2 rounded-xl border border-[#E5EAF0] shadow-sm flex items-center gap-2 overflow-x-auto">
        {isTabAllowed("CLIENTES") && (
          <button
            onClick={() => setActiveModule("CLIENTES")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "CLIENTES"
                ? "bg-emerald-50 text-[#006D50] border border-emerald-200 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <UsersRound size={16} />
            <span>Relatório de Clientes</span>
          </button>
        )}

        {isTabAllowed("CONTRATOS") && (
          <button
            onClick={() => setActiveModule("CONTRATOS")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "CONTRATOS"
                ? "bg-emerald-50 text-[#006D50] border border-emerald-200 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <FileText size={16} />
            <span>Relatório de Contratos</span>
          </button>
        )}

        {isTabAllowed("MENSALIDADES") && (
          <button
            onClick={() => setActiveModule("MENSALIDADES")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "MENSALIDADES"
                ? "bg-emerald-50 text-[#006D50] border border-emerald-200 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <DollarSign size={16} />
            <span>Relatório de Mensalidades</span>
          </button>
        )}

        {isTabAllowed("ATENDIMENTOS") && (
          <button
            onClick={() => setActiveModule("ATENDIMENTOS")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "ATENDIMENTOS"
                ? "bg-emerald-50 text-[#006D50] border border-emerald-200 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <HeartPulse size={16} />
            <span>Relatório de Atendimentos</span>
          </button>
        )}
      </div>

      {/* Card de Filtros Específicos por Módulo */}
      <div className="no-print bg-white p-5 rounded-xl border border-[#E5EAF0] shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-2.5">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#008C66]" />
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Parâmetros & Filtros de Emissão ({activeModule})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {filteredRecords.length} resultado(s)
          </span>
        </div>

        {/* Filtros: CLIENTES */}
        {activeModule === "CLIENTES" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Status</label>
              <select
                value={clientStatus}
                onChange={(e) => setClientStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              >
                <option value="TODOS">Todos os Clientes</option>
                <option value="ATIVOS">Apenas Ativos</option>
                <option value="INATIVOS">Apenas Inativos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Filtrar por cidade..."
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>
          </div>
        )}

        {/* Filtros: CONTRATOS */}
        {activeModule === "CONTRATOS" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Status</label>
              <select
                value={contractStatus}
                onChange={(e) => setContractStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              >
                <option value="TODOS">Todos os Contratos</option>
                <option value="ATIVOS">Apenas Ativos</option>
                <option value="CANCELADOS">Apenas Cancelados</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Plano Vinculado</label>
              <select
                value={contractPlan}
                onChange={(e) => setContractPlan(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              >
                <option value="TODOS">Todos os Planos</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filtros: MENSALIDADES */}
        {activeModule === "MENSALIDADES" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Status da Mensalidade</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              >
                <option value="TODOS">Todos os Registros</option>
                <option value="EM_ABERTO">Em Aberto</option>
                <option value="PAGO">Pagas / Recebidas</option>
                <option value="CANCELADO">Canceladas</option>
                <option value="INADIMPLENTES">Inadimplentes (Vencidas)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Vencimento Inicial</label>
              <input
                type="date"
                value={paymentDateStart}
                onChange={(e) => setPaymentDateStart(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Vencimento Final</label>
              <input
                type="date"
                value={paymentDateEnd}
                onChange={(e) => setPaymentDateEnd(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>
          </div>
        )}

        {/* Filtros: ATENDIMENTOS */}
        {activeModule === "ATENDIMENTOS" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Status do Atendimento</label>
              <select
                value={appointmentStatus}
                onChange={(e) => setAppointmentStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              >
                <option value="TODOS">Todos os Atendimentos</option>
                <option value="Aberto">Aberto / Em Andamento</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Data Inicial</label>
              <input
                type="date"
                value={appointmentDateStart}
                onChange={(e) => setAppointmentDateStart(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Data Final</label>
              <input
                type="date"
                value={appointmentDateEnd}
                onChange={(e) => setAppointmentDateEnd(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Estrutura do Layout Timbrado de Impressão (Exibido exclusivamente em window.print()) */}
      <div className="print-report-header-layout">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {config?.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  style={{ maxHeight: "60px", maxWidth: "150px", objectFit: "contain", borderRadius: "4px" }}
                />
              </>
            ) : null}
            <div>
              <h1 style={{ margin: "0 0 5px 0", fontSize: "16pt", color: "#333", fontWeight: 800 }}>
                {config?.nomeFantasia || config?.razaoSocial || tenant?.empresa || "Memorius"}
              </h1>
              <p style={{ margin: 0, fontSize: "9pt", color: "#666" }}>
                {config?.cnpj ? `CNPJ: ${config.cnpj} | ` : ""}
                {config?.telefone || config?.celular ? `Contato: ${config.telefone || config.celular} | ` : ""}
                {config?.email ? `Email: ${config.email}` : ""}
              </p>
              {config?.cidade && (
                <p style={{ margin: "3px 0 0 0", fontSize: "9pt", color: "#666" }}>
                  {config.logradouro}
                  {config.numero ? `, ${config.numero}` : ""} - {config.cidade}/{config.estado || "UF"}
                </p>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "9pt", color: "#555" }}>
              Emissão: {new Date().toLocaleDateString("pt-BR")} {new Date().toLocaleTimeString("pt-BR")}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "9pt", color: "#666" }}>
              Operador: {userProfile?.nome || "Operador"}
            </p>
          </div>
        </div>
        <hr style={{ border: "0", borderTop: "2px solid #008C66", margin: "10px 0" }} />
        <h2 style={{ textAlign: "center", margin: "10px 0", fontSize: "14pt", textTransform: "uppercase", color: "#006D50" }}>
          Relatório Oficial de {activeModule === "CLIENTES" && "Clientes"}
          {activeModule === "CONTRATOS" && "Contratos"}
          {activeModule === "MENSALIDADES" && "Mensalidades"}
          {activeModule === "ATENDIMENTOS" && "Atendimentos"}
        </h2>
        <p style={{ fontSize: "9pt", color: "#555", fontStyle: "italic", textAlign: "center", margin: "0 0 1.5rem 0" }}>
          Filtros aplicados: {getFiltersDescription()}
        </p>
      </div>

      {/* Card da Tabela de Pré-Visualização / Impressão */}
      <div className="screen-table-container bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden">
        <div className="no-print p-4 md:p-5 border-b border-[#E5EAF0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#008C66]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              Visualização Prévia do Relatório ({filteredRecords.length} registros)
            </h3>
          </div>
          <span className="text-xs text-[#64748B] font-mono">
            Mostrando página {currentPage} de {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !hasRecords ? (
            <div className="p-12 text-center text-slate-500">
              <FileText size={36} className="mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="text-sm font-bold text-slate-700">Nenhum registro correspondente encontrado</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere os filtros acima para consultar novos períodos ou status.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  {activeModule === "CLIENTES" && (
                    <>
                      <th className="py-3 px-4">Nome do Cliente</th>
                      <th className="py-3 px-4">CPF</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">Cidade / UF</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  )}
                  {activeModule === "CONTRATOS" && (
                    <>
                      <th className="py-3 px-4">Nº Contrato</th>
                      <th className="py-3 px-4">Cliente (Titular)</th>
                      <th className="py-3 px-4">Plano</th>
                      <th className="py-3 px-4">Data Início</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  )}
                  {activeModule === "MENSALIDADES" && (
                    <>
                      <th className="py-3 px-4 text-center">Competência</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4">Cliente (Titular)</th>
                      <th className="py-3 px-4">Nº Contrato</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  )}
                  {activeModule === "ATENDIMENTOS" && (
                    <>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Paciente</th>
                      <th className="py-3 px-4">Plano</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-[#1E293B]">
                {paginatedRecords.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    {activeModule === "CLIENTES" && (
                      <>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">{item.nomeCompleto}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{item.cpf || "-"}</td>
                        <td className="py-3 px-4 text-slate-600">{item.telefone || "-"}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.cidade ? `${item.cidade}/${item.estado || "UF"}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.status === "Ativo"
                                ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}

                    {activeModule === "CONTRATOS" && (
                      <>
                        <td className="py-3 px-4 font-mono font-bold text-xs text-[#0F172A]">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {item.numeroContrato}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">{item.clienteNome}</td>
                        <td className="py-3 px-4 text-slate-600">{item.planoNome}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(item.dataInicio)}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.status === "Ativo"
                                ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}

                    {activeModule === "MENSALIDADES" && (
                      <>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {item.competencia}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                          {formatDate(item.dataVencimento)}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">{item.clienteNome}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {item.numeroContrato}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatCurrency(item.valor)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.status === "PAGO"
                                ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                                : item.status === "EM_ABERTO"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}

                    {activeModule === "ATENDIMENTOS" && (
                      <>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {formatDate(item.data)} {item.hora}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">{item.clienteNome}</td>
                        <td className="py-3 px-4 text-slate-600">{item.planoNome}</td>
                        <td className="py-3 px-4 text-slate-600">{item.tipo}</td>
                        <td className="py-3 px-4 text-slate-600">{item.responsavel}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.status === "Finalizado"
                                ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé da Tabela: Paginação na Tela */}
        {hasRecords && (
          <div className="pagination-footer no-print p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(filteredRecords.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{filteredRecords.length}</span> registros
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
    </div>
  );
}
