/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { contractTemplatesSupabaseService } from "@/services/contract-templates.supabase.service";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";
import { Contrato, Cliente, Plano, EmpresaConfig } from "@/types";
import {
  formatDate,
  formatCurrency,
  formatCPF,
  generatePrintProtocol,
  getCurrentFormattedDateTime,
} from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { supabase } from "@/lib/supabase/client";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  UsersRound,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
  Printer,
  User,
  Tag,
  ExternalLink,
} from "@/components/icons/AdminIcons";

export default function ContratosPage() {
  const { data: contratos, loading, create, update, remove } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const toast = useToast();

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  // Dados da Empresa (para cabeçalho e impressão timbrada)
  const [companyConfig, setCompanyConfig] = useState<EmpresaConfig | null>(null);

  useEffect(() => {
    empresaConfigSupabaseService.getConfig().then((cfg) => {
      if (cfg) setCompanyConfig(cfg);
    });
  }, []);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estados de Modal e Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedPlanoId, setSelectedPlanoId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [status, setStatus] = useState("Ativo");

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ current: 0, limit: 500, planName: "Essencial" });

  // Print States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingContrato, setPrintingContrato] = useState<Contrato | null>(null);
  const [activeTemplates, setActiveTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewProtocol, setPreviewProtocol] = useState("");
  const [previewPrintDate, setPreviewPrintDate] = useState("");

  // Detalhes do Plano selecionado no formulário
  const selectedPlano = planos.find((p) => String(p.id) === String(selectedPlanoId));
  const selectedCliente = clientes.find((c) => String(c.id) === String(selectedClienteId));

  const canCreate = clientes.length > 0 && planos.length > 0;

  // Handlers de Abertura de Modal
  const handleOpenNew = async () => {
    if (!canCreate) {
      toast.error("É necessário ter pelo menos um Cliente e um Plano cadastrados para criar um Contrato.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/dashboard/plan-limits?check=CONTRATOS", {
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
      console.warn("Could not pre-check contract limit:", err);
    }

    setEditingContrato(null);
    setSelectedClienteId(String(clientes[0].id));
    setSelectedPlanoId(String(planos[0].id));
    setDataInicio(new Date().toISOString().split("T")[0]);
    setStatus("Ativo");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contrato: Contrato) => {
    setEditingContrato(contrato);
    setSelectedClienteId(String(contrato.clienteId));
    setSelectedPlanoId(String(contrato.planoId));
    setDataInicio(contrato.dataInicio);
    setStatus(contrato.status);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clienteObj = clientes.find((c) => String(c.id) === String(selectedClienteId));
    const planoObj = planos.find((p) => String(p.id) === String(selectedPlanoId));

    if (!clienteObj || !planoObj) {
      toast.error("Cliente ou Plano inválido.");
      return;
    }

    setSubmitting(true);
    const payload: Omit<Contrato, "id"> = {
      numeroContrato: editingContrato?.numeroContrato || `CON-${Date.now().toString().slice(-6)}`,
      clienteId: clienteObj.id!,
      clienteNome: clienteObj.nomeCompleto,
      planoId: planoObj.id,
      planoNome: planoObj.nome,
      dataInicio,
      status,
    };

    try {
      if (editingContrato && editingContrato.id !== undefined) {
        await update(editingContrato.id, payload);
        toast.success("Contrato atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Contrato emitido com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar contrato.");
    } finally {
      setSubmitting(false);
    }
  };

  // Impressão e Compilação de Template
  const handleOpenPrint = async (contrato: Contrato) => {
    setPrintingContrato(contrato);
    setPreviewProtocol(generatePrintProtocol(contrato.numeroContrato));
    setPreviewPrintDate(getCurrentFormattedDateTime());
    setLoadingTemplates(true);
    setIsPrintModalOpen(true);
    try {
      const templates = await contractTemplatesSupabaseService.getActive();
      setActiveTemplates(templates);
      if (templates.length > 0) {
        setSelectedTemplateId(String(templates[0].id));
      } else {
        setSelectedTemplateId("");
      }
    } catch (e: any) {
      toast.error("Erro ao carregar modelos de contratos: " + e.message);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const compileTemplate = (templateContent: string, contrato: Contrato) => {
    if (!templateContent) return "";

    const clientObj = clientes.find((c) => String(c.id) === String(contrato.clienteId));
    const planoObj = planos.find((p) => String(p.id) === String(contrato.planoId));

    const formatValue = (val: string) => {
      return `<strong>${val.toUpperCase()}</strong>`;
    };

    const nomeCliente = formatValue(contrato.clienteNome || clientObj?.nomeCompleto || "Não informado");
    const cpfCliente = formatValue(clientObj?.cpf ? formatCPF(clientObj.cpf) : "Não informado");
    const numeroContrato = formatValue(contrato.numeroContrato || "Não informado");
    const planoNome = formatValue(contrato.planoNome || planoObj?.nome || "Não informado");

    const valorPlano = formatValue(
      planoObj?.valorMensal ? formatCurrency(planoObj.valorMensal) : "Não informado"
    );

    const dataContrato = formatValue(
      contrato.dataInicio ? formatDate(contrato.dataInicio) : "Não informado"
    );

    let text = templateContent;
    text = text.replaceAll("{{nome_cliente}}", nomeCliente);
    text = text.replaceAll("{{cpf_cliente}}", cpfCliente);
    text = text.replaceAll("{{numero_contrato}}", numeroContrato);
    text = text.replaceAll("{{plano_nome}}", planoNome);
    text = text.replaceAll("{{valor_mensal}}", valorPlano);
    text = text.replaceAll("{{data_contrato}}", dataContrato);

    return text;
  };

  const handlePrint = (compiledContent: string, contrato: Contrato) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const addressString =
        [
          companyConfig?.logradouro,
          companyConfig?.numero,
          companyConfig?.bairro,
          companyConfig?.cidade,
          companyConfig?.estado,
        ]
          .filter(Boolean)
          .join(", ")
          .toUpperCase() || "Não informado";

      const contactsString =
        [companyConfig?.telefone, companyConfig?.celular].filter(Boolean).join(" / ") ||
        "Não informado";

      const protocolId = generatePrintProtocol(contrato.numeroContrato);
      const printDate = getCurrentFormattedDateTime();

      printWindow.document.write(`
        <html>
          <head>
            <title>Contrato - ${contrato.numeroContrato}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #1e293b;
                line-height: 1.6;
              }
              .letterhead {
                display: flex;
                align-items: center;
                border-bottom: 2px solid #008C66;
                padding-bottom: 12px;
                margin-bottom: 30px;
              }
              .logo-box {
                flex-shrink: 0;
                margin-right: 15px;
              }
              .logo-box img {
                max-height: 80px;
                display: block;
              }
              .info-box {
                flex-grow: 1;
                text-align: left;
              }
              .company-name {
                color: #006D50;
                font-size: 24px;
                font-weight: 800;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
              }
              .company-details {
                color: #475569;
                font-size: 10px;
                font-weight: bold;
                line-height: 1.4;
                margin-bottom: 2px;
              }
              .contract-content {
                white-space: pre-wrap;
                text-align: justify;
                font-size: 14px;
              }
              .print-footer {
                margin-top: 50px;
                border-top: 1px dashed #cbd5e1;
                padding-top: 10px;
                font-size: 11px;
                color: #64748b;
                display: flex;
                justify-content: space-between;
              }
              @media print {
                body {
                  margin: 20mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="letterhead">
              <div class="logo-box">
                ${companyConfig?.logoUrl ? `<img src="${companyConfig.logoUrl}" alt="Logo" />` : ""}
              </div>
              <div class="info-box">
                <div class="company-name">${(
                  companyConfig?.nomeFantasia ||
                  companyConfig?.razaoSocial ||
                  "Empresa"
                ).toUpperCase()}</div>
                <div class="company-details">CNPJ: ${companyConfig?.cnpj || "Não informado"}</div>
                <div class="company-details">END: ${addressString}</div>
                <div class="company-details">CONTATOS: ${contactsString} | E-MAIL: ${(
                  companyConfig?.email || "Não informado"
                ).toUpperCase()}</div>
              </div>
            </div>
            <div class="contract-content">${compiledContent}</div>
            <div class="print-footer">
              <span><strong>Protocolo:</strong> ${protocolId}</span>
              <span><strong>Data de Impressão:</strong> ${printDate}</span>
            </div>
            <script>
              window.onload = function() {
                const img = document.querySelector('.logo-box img');
                if (img && img.src && !img.complete) {
                  img.onload = function() {
                    window.print();
                    window.close();
                  };
                  img.onerror = function() {
                    window.print();
                    window.close();
                  };
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 2000);
                } else {
                  window.print();
                  window.close();
                }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast.error("Não foi possível abrir a janela de impressão. Por favor, libere os pop-ups.");
    }
  };

  // Filtragem e Métricas
  const filteredContratos = useMemo(() => {
    return contratos.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.clienteNome?.toLowerCase().includes(q) ||
        c.numeroContrato?.toLowerCase().includes(q) ||
        c.planoNome?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "TODOS" || c.status?.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [contratos, searchTerm, statusFilter]);

  // Indicadores de KPIs
  const totalContratos = contratos.length;
  const contratosAtivos = contratos.filter((c) => c.status?.toUpperCase() === "ATIVO").length;
  const contratosInativos = contratos.filter(
    (c) => c.status?.toUpperCase() === "INATIVO" || c.status?.toUpperCase() === "CANCELADO"
  ).length;

  // Receita Mensal Recorrente Estimada (Soma do valor mensal dos contratos ativos)
  const receitaRecorrente = useMemo(() => {
    return contratos.reduce((acc, c) => {
      if (c.status?.toUpperCase() === "ATIVO") {
        const plano = planos.find((p) => String(p.id) === String(c.planoId));
        return acc + (plano?.valorMensal ? Number(plano.valorMensal) : 0);
      }
      return acc;
    }, 0);
  }, [contratos, planos]);

  // Paginação
  const totalPages = Math.ceil(filteredContratos.length / itemsPerPage) || 1;
  const paginatedContratos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContratos.slice(start, start + itemsPerPage);
  }, [filteredContratos, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho do Módulo com Barra Dourada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#F5BD22] rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <FileText className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Contratos
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Gestão de adesões, modelos contratuais, vigência e termos de prestação de serviços
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          disabled={!canCreate}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008C66]/30 ${
            canCreate
              ? "bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] cursor-pointer"
              : "bg-[#94A3B8] opacity-60 cursor-not-allowed"
          }`}
        >
          <PlusCircle size={18} strokeWidth={2.2} />
          <span>Emitir Contrato</span>
        </button>
      </div>

      {/* Alerta Preventivo de Pré-requisitos */}
      {!canCreate && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm text-sm animate-fadeIn">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <strong className="font-semibold text-amber-950">Pré-requisito para Emissão:</strong>
            <p className="text-amber-800 text-xs md:text-sm mt-0.5">
              Você precisa ter ao menos um <strong>Cliente</strong> e um <strong>Plano</strong> ativos cadastrados no sistema antes de poder emitir contratos.
            </p>
          </div>
        </div>
      )}

      {/* Faixa de KPIs Resumo (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total de Contratos
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <FileText size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{totalContratos}</span>
            <span className="text-xs text-[#64748B]">registros</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Histórico completo de contratos</p>
        </div>

        {/* KPI 2: Ativos */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Contratos Ativos
            </span>
            <div className="p-2 bg-green-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{contratosAtivos}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {totalContratos > 0 ? `${Math.round((contratosAtivos / totalContratos) * 100)}%` : "0%"} da base
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Em vigência regular</p>
        </div>

        {/* KPI 3: Receita Recorrente */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Receita Recorrente
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <DollarSign size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {formatCurrency(receitaRecorrente)}
            </span>
            <span className="text-xs text-[#64748B]">/mês</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Soma mensal dos contratos ativos</p>
        </div>

        {/* KPI 4: Inativos / Cancelados */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Inativos / Encerrados
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{contratosInativos}</span>
            <span className="text-xs text-[#64748B]">suspensos</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Cancelados ou inativados</p>
        </div>
      </div>

      {/* Card Principal: Filtros + Listagem */}
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-sm overflow-hidden">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 md:p-5 border-b border-[#E5EAF0] bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Input de Busca */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              />
              <input
                type="text"
                placeholder="Buscar por cliente, nº de contrato ou plano..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>

            {/* Seletor de Status */}
            <div className="relative min-w-[170px]">
              <Filter
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="ATIVO">Apenas Ativos</option>
                <option value="INATIVO">Apenas Inativos</option>
                <option value="CANCELADO">Apenas Cancelados</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8] text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Botão de Limpar Filtros */}
          {(searchTerm || statusFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("TODOS");
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={15} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Tabela de Contratos */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredContratos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-[#64748B] mb-3">
                <FileText size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Nenhum contrato encontrado</h3>
              <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
                {searchTerm || statusFilter !== "TODOS"
                  ? "Tente refinar sua busca ou limpe os filtros aplicados."
                  : "Comece emitindo um novo contrato para vincular um cliente ativo a um plano."}
              </p>
              {canCreate && !searchTerm && statusFilter === "TODOS" && (
                <button
                  onClick={handleOpenNew}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 transition-all shadow-sm"
                >
                  <PlusCircle size={16} />
                  Emitir Primeiro Contrato
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Nº Contrato</th>
                  <th className="py-3 px-4">Cliente (Titular)</th>
                  <th className="py-3 px-4">Plano Vinculado</th>
                  <th className="py-3 px-4">Data Adesão</th>
                  <th className="py-3 px-4">Mensalidade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-sm text-[#1E293B]">
                {paginatedContratos.map((c) => {
                  const plano = planos.find((p) => String(p.id) === String(c.planoId));
                  const valor = plano?.valorMensal || 0;
                  const isAtivo = c.status?.toUpperCase() === "ATIVO";
                  const isCancelado = c.status?.toUpperCase() === "CANCELADO";

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Nº Contrato */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0F172A]">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[#334155] border border-slate-200">
                          {c.numeroContrato}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#008C66] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {c.clienteNome?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div>
                            <span className="font-semibold">{c.clienteNome || "Cliente Desconhecido"}</span>
                            <span className="block text-[11px] text-[#64748B]">
                              ID #{c.clienteId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#1E293B] text-xs font-medium">
                          <Tag size={13} className="text-[#008C66]" />
                          <span>{c.planoNome || plano?.nome || "Plano Não Vinculado"}</span>
                        </div>
                      </td>

                      {/* Data Adesão */}
                      <td className="py-3.5 px-4 text-xs text-[#475569]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#94A3B8]" />
                          <span>{formatDate(c.dataInicio)}</span>
                        </div>
                      </td>

                      {/* Mensalidade */}
                      <td className="py-3.5 px-4 font-bold text-xs text-[#0F172A]">
                        {formatCurrency(valor)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAtivo
                              ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                              : isCancelado
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAtivo
                                ? "bg-[#008C66]"
                                : isCancelado
                                ? "bg-rose-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {c.status || "Ativo"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenPrint(c)}
                            title="Imprimir contrato timbrado"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#008C66] hover:bg-emerald-50 transition-colors"
                          >
                            <Printer size={16} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Editar contrato"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit size={16} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id!)}
                            title="Excluir contrato"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={16} strokeWidth={2.2} />
                          </button>
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
        {filteredContratos.length > 0 && (
          <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(filteredContratos.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(filteredContratos.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{filteredContratos.length}</span> contratos
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
                // Exibe página atual, primeira, última e adjacentes
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

      {/* Modal Formulário: Criar / Editar Contrato */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContrato ? "Editar Contrato" : "Emitir Novo Contrato"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Header do Form no Modal */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#008C66]" />
              <span className="text-xs font-semibold text-[#0F172A]">
                {editingContrato
                  ? `Editando Contrato: ${editingContrato.numeroContrato}`
                  : "Novo Registro de Adesão"}
              </span>
            </div>
            {editingContrato && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {editingContrato.status}
              </span>
            )}
          </div>

          {/* Seleção do Cliente */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Cliente Titular <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeCompleto} {c.cpf ? `— CPF: ${formatCPF(c.cpf)}` : "(Sem CPF)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seleção do Plano */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Plano Vinculado <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedPlanoId}
                onChange={(e) => setSelectedPlanoId(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {formatCurrency(p.valorMensal || 0)}/mês
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card Resumo do Plano Selecionado */}
          {selectedPlano && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006D50]">
                <CheckCircle2 size={16} />
                <span>Condições Contratuais do Plano: {selectedPlano.nome}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs text-[#0F172A]">
                <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Mensalidade</span>
                  <strong className="text-emerald-700 font-bold">
                    {formatCurrency(selectedPlano.valorMensal || 0)}
                  </strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Carência</span>
                  <strong>{selectedPlano.diasCarencia || 0} dias</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Vigência</span>
                  <strong>{selectedPlano.nMeses || "-"} meses</strong>
                </div>
              </div>
            </div>
          )}

          {/* Data de Adesão e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Data de Início / Adesão <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Status do Contrato
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF0]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingContrato ? "Salvar Alterações" : "Emitir Contrato"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Diálogo de Confirmação de Exclusão */}
      <ModalConfirm
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId !== null) {
            try {
              await remove(confirmDeleteId);
              toast.success("Contrato excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir contrato.");
            }
          }
        }}
        title="Excluir Contrato"
        message="Tem certeza que deseja excluir este contrato? Essa ação não poderá ser desfeita e removerá o vínculo contratual."
        confirmText="Excluir Contrato"
        variant="danger"
      />

      {/* Modal de Impressão e Prévia Timbrada */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Imprimir Contrato Oficial"
      >
        {loadingTemplates ? (
          <div className="p-8 text-center text-sm text-slate-600">
            <div className="w-6 h-6 border-2 border-[#008C66] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando modelos de contratos...
          </div>
        ) : activeTemplates.length === 0 ? (
          <div className="p-6 text-center">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full inline-flex mb-3">
              <AlertTriangle size={24} />
            </div>
            <p className="text-sm font-semibold text-rose-800 mb-1">
              Nenhum modelo de contrato ativo encontrado
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Solicite ao administrador a configuração de um modelo de contrato no sistema para emissão de impressões.
            </p>
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Escolha do Modelo */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Escolha o Modelo de Contrato:
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                {activeTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Caixa de Pré-Visualização Timbrada */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Visualização Prévia do Documento:
              </label>
              {(() => {
                const selectedTemplate = activeTemplates.find(
                  (t) => String(t.id) === String(selectedTemplateId)
                );
                if (!selectedTemplate || !printingContrato) return null;
                const compiled = compileTemplate(selectedTemplate.conteudo, printingContrato);
                return (
                  <div className="border border-slate-300 rounded-xl p-5 max-h-[360px] overflow-y-auto bg-white text-slate-800 shadow-inner">
                    {/* Timbre Preview */}
                    <div className="flex items-center border-b-2 border-[#008C66] pb-3 mb-4">
                      {companyConfig?.logoUrl && (
                        <div className="flex-shrink-0 mr-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={companyConfig.logoUrl}
                            alt="Logo"
                            className="max-h-14 block object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-grow text-left">
                        <div className="text-[#006D50] text-base font-extrabold tracking-wide uppercase">
                          {companyConfig?.nomeFantasia || companyConfig?.razaoSocial || "Empresa"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          CNPJ: {companyConfig?.cnpj || "Não informado"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          CONTATOS: {[companyConfig?.telefone, companyConfig?.celular].filter(Boolean).join(" / ") || "Não informado"}
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo Compilado */}
                    <div
                      dangerouslySetInnerHTML={{ __html: compiled }}
                      className="text-xs text-justify leading-relaxed font-serif text-slate-700 whitespace-pre-wrap"
                    />

                    {/* Rodapé da Impressão */}
                    <div className="mt-6 pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400 flex justify-between items-center">
                      <span><strong>Protocolo:</strong> {previewProtocol}</span>
                      <span><strong>Data de Emissão:</strong> {previewPrintDate}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ações da Impressão */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedTemplate = activeTemplates.find(
                    (t) => String(t.id) === String(selectedTemplateId)
                  );
                  if (selectedTemplate && printingContrato) {
                    const compiled = compileTemplate(selectedTemplate.conteudo, printingContrato);
                    handlePrint(compiled, printingContrato);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] rounded-lg shadow-sm transition-all"
              >
                <Printer size={16} strokeWidth={2.2} />
                <span>Imprimir Agora</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Limite / Upgrade de Plano da Plataforma */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        resource="CONTRATOS"
        currentCount={limitInfo.current}
        limit={limitInfo.limit}
        planName={limitInfo.planName}
      />
    </div>
  );
}
