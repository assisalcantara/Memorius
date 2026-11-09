/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useStorage } from "@/hooks/useStorage";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Cliente } from "@/types";
import { formatDate, getClienteMatricula } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { supabase } from "@/lib/supabase/client";
import {
  UsersRound,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  X,
} from "@/components/icons/AdminIcons";

export default function ClientesPage() {
  const { data: clientes, loading, create, update, remove } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Modal e Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<"DADOS" | "ENDERECO" | "CONTATOS">("DADOS");
  const [submitting, setSubmitting] = useState(false);

  // Estados de Upgrade / Limite de Plano
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ current: 0, limit: 500, planName: "Essencial" });

  // Form State
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nomeCompleto: "",
    cpf: "",
    rg: "",
    dataNascimento: "",
    sexo: "MASCULINO",
    nomePai: "",
    nomeMae: "",
    naturalidade: "",
    estadoCivil: "Solteiro",
    nomeConjuge: "",
    profissao: "",
    localTrabalho: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "SP",
    telefone: "",
    email: "",
    status: "Ativo",
  });

  const handleOpenNew = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/dashboard/plan-limits?check=CLIENTES", {
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
      console.warn("Não foi possível verificar limite prévio:", err);
    }

    setActiveFormTab("DADOS");
    setEditingCliente(null);
    setFormData({
      nomeCompleto: "",
      cpf: "",
      rg: "",
      dataNascimento: "",
      sexo: "MASCULINO",
      nomePai: "",
      nomeMae: "",
      naturalidade: "",
      estadoCivil: "Solteiro",
      nomeConjuge: "",
      profissao: "",
      localTrabalho: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "SP",
      telefone: "",
      email: "",
      status: "Ativo",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setActiveFormTab("DADOS");
    setEditingCliente(cliente);
    setFormData(cliente);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "cep") {
      const cleanCep = value.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.erro) {
              setFormData((prev) => ({
                ...prev,
                logradouro: data.logradouro || prev.logradouro,
                bairro: data.bairro || prev.bairro,
                cidade: data.localidade || prev.cidade,
                estado: data.uf || prev.estado,
              }));
            }
          })
          .catch((err) => console.error("Erro ao buscar CEP:", err));
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomeCompleto?.trim() || !formData.dataNascimento) {
      toast.error("Por favor, preencha os campos obrigatórios marcados com (*).");
      return;
    }

    setSubmitting(true);

    const payload: Omit<Cliente, "id"> = {
      nomeCompleto: formData.nomeCompleto.trim().toUpperCase(),
      cpf: (formData.cpf || "").trim(),
      rg: (formData.rg || "").trim().toUpperCase(),
      dataNascimento: formData.dataNascimento,
      sexo: (formData.sexo || "MASCULINO").trim().toUpperCase(),
      nomePai: (formData.nomePai || "").trim().toUpperCase(),
      nomeMae: (formData.nomeMae || "").trim().toUpperCase(),
      naturalidade: (formData.naturalidade || "").trim().toUpperCase(),
      estadoCivil: (formData.estadoCivil || "Solteiro").trim().toUpperCase(),
      nomeConjuge: (formData.nomeConjuge || "").trim().toUpperCase(),
      profissao: (formData.profissao || "").trim().toUpperCase(),
      localTrabalho: (formData.localTrabalho || "").trim().toUpperCase(),
      cep: (formData.cep || "").trim(),
      logradouro: (formData.logradouro || "").trim().toUpperCase(),
      numero: (formData.numero || "").trim().toUpperCase(),
      complemento: (formData.complemento || "").trim().toUpperCase(),
      bairro: (formData.bairro || "").trim().toUpperCase(),
      cidade: (formData.cidade || "").trim().toUpperCase(),
      estado: (formData.estado || "SP").trim().toUpperCase(),
      telefone: (formData.telefone || "").trim(),
      email: (formData.email || "").trim().toLowerCase(),
      status: formData.status || "Ativo",
      dataCadastro: editingCliente?.dataCadastro || new Date().toISOString().split("T")[0],
    };

    try {
      if (editingCliente && editingCliente.id !== undefined) {
        await update(editingCliente.id, payload);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Cliente cadastrado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs Resumo de Clientes
  const totalGeral = clientes.length;
  const totalAtivos = clientes.filter((c) => String(c.status).toUpperCase() === "ATIVO").length;
  const totalInativos = clientes.filter((c) => String(c.status).toUpperCase() === "INATIVO").length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  const totalNovos30d = clientes.filter((c) => c.dataCadastro && c.dataCadastro >= thirtyDaysAgoStr).length;

  // Filtragem
  const filteredClientes = clientes.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      c.nomeCompleto.toLowerCase().includes(term) ||
      (c.cpf && c.cpf.includes(term)) ||
      (c.telefone && c.telefone.includes(term)) ||
      (c.cidade && c.cidade.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === "TODOS" || String(c.status).toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Paginação
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage) || 1;
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="clientes-root-container">
      {/* Estilos Escopados para o Módulo Clientes */}
      <style jsx global>{`
        .clientes-root-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .clientes-kpis-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(12px, 1.2vw, 18px);
          width: 100%;
        }

        .clientes-kpi-card {
          background: #FFFFFF;
          border: 1px solid #E1E9EC;
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(15, 35, 55, 0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .clientes-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 35, 55, 0.08);
        }

        .clientes-panel-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          box-sizing: border-box;
          width: 100%;
        }

        .clientes-filter-grid {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: center;
        }

        .clientes-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .clientes-search-input {
          width: 100%;
          height: 42px;
          padding: 0 14px 0 40px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 13.5px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .clientes-search-input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.12);
        }

        .clientes-select {
          height: 42px;
          padding: 0 32px 0 14px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          background: #FFFFFF;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .clientes-select:focus {
          border-color: #008C66;
        }

        .clientes-clear-btn {
          height: 42px;
          padding: 0 16px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          background: #F8FAFC;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .clientes-clear-btn:hover {
          background: #EEF2F6;
          color: #0F172A;
        }

        .clientes-new-btn {
          height: 42px;
          padding: 0 20px;
          border-radius: 10px;
          background: linear-gradient(135deg, #008C66 0%, #006D50 100%);
          border: 1px solid #005A42;
          color: #FFFFFF;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(0, 140, 102, 0.25);
          transition: all 0.18s ease;
        }
        .clientes-new-btn:hover {
          background: linear-gradient(135deg, #009B71 0%, #007A5A 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 140, 102, 0.35);
        }

        /* Tabela Estilizada */
        .clientes-table-wrap {
          width: 100%;
          overflow-x: auto;
          margin-top: 12px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
        }

        .clientes-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          text-align: left;
          background: #FFFFFF;
        }

        .clientes-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.04em;
          padding: 12px 14px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }

        .clientes-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }

        .clientes-table tr:last-child td {
          border-bottom: none;
        }

        .clientes-table tr:hover td {
          background-color: #F8FAFC;
        }

        .cliente-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748B;
          transition: all 0.15s ease;
        }
        .cliente-action-btn.edit:hover {
          background: #F0FDF4;
          border-color: #86EFAC;
          color: #15803D;
        }
        .cliente-action-btn.delete:hover {
          background: #FEF2F2;
          border-color: #FECACA;
          color: #DC2626;
        }

        /* Paginação */
        .clientes-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          margin-top: 8px;
          border-top: 1px solid #F1F5F9;
          font-size: 12.5px;
          color: #64748B;
          flex-wrap: wrap;
          gap: 10px;
        }

        .clientes-page-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #334155;
          transition: all 0.15s ease;
        }
        .clientes-page-btn:hover:not(:disabled) {
          background: #F1F5F9;
          color: #0F172A;
        }
        .clientes-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Formulário Tabs & Inputs */
        .modal-tab-btn {
          padding: 8px 16px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          color: #64748B;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .modal-tab-btn.active {
          color: #008C66;
          border-bottom-color: #008C66;
        }

        .modal-form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .modal-form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .modal-form-group.col-span-2 {
          grid-column: span 2;
        }

        .modal-form-group.col-span-3 {
          grid-column: span 3;
        }

        .modal-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .modal-input {
          height: 40px;
          padding: 0 12px;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          font-size: 13.5px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .modal-input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.12);
        }

        /* Media Queries Responsivas */
        @media (max-width: 1024px) {
          .clientes-kpis-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .modal-form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .modal-form-group.col-span-3 {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .clientes-filter-grid {
            grid-template-columns: 1fr;
          }
          .modal-form-grid {
            grid-template-columns: 1fr;
          }
          .modal-form-group.col-span-2,
          .modal-form-group.col-span-3 {
            grid-column: span 1;
          }
        }

        @media (max-width: 640px) {
          .clientes-kpis-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ==================================================
          1. HEADER DO MÓDULO COM BARRA DOURADA & AÇÃO PRINCIPAL
          ================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          minHeight: "44px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
          <div
            style={{
              width: "5px",
              height: "40px",
              backgroundColor: "#F5BD22",
              borderRadius: "3px",
              flexShrink: 0,
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 800,
                lineHeight: "26px",
                color: "#0B1536",
                letterSpacing: "-0.01em",
              }}
            >
              Gestão de Clientes
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "18px",
                color: "#52627B",
                fontWeight: 500,
              }}
            >
              Controle completo de associados titulares, dados cadastrais e documentos
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="clientes-new-btn"
          title="Cadastrar Novo Cliente"
        >
          <UserPlus size={18} color="#FFFFFF" strokeWidth={2.2} />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* ==================================================
          2. INDICADORES RÁPIDOS (KPIS)
          ================================================== */}
      <div className="clientes-kpis-grid">
        {/* Total Geral */}
        <div className="clientes-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#3185FF", display: "flex" }}>
              <UsersRound size={26} color="#3185FF" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Total Cadastrado
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1.1 }}>
                {totalGeral}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#3185FF" }}>
            <UsersRound size={40} color="#3185FF" strokeWidth={1.5} />
          </div>
        </div>

        {/* Ativos */}
        <div className="clientes-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#00A86B", display: "flex" }}>
              <CheckCircle2 size={26} color="#00A86B" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Clientes Ativos
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1.1 }}>
                {totalAtivos}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#00A86B" }}>
            <CheckCircle2 size={40} color="#00A86B" strokeWidth={1.5} />
          </div>
        </div>

        {/* Novos últimos 30 dias */}
        <div className="clientes-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#E5A400", display: "flex" }}>
              <Clock size={26} color="#E5A400" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Novos (30 dias)
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1.1 }}>
                +{totalNovos30d}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#E5A400" }}>
            <Clock size={40} color="#E5A400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Inativos */}
        <div className="clientes-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#EF4444", display: "flex" }}>
              <AlertTriangle size={26} color="#EF4444" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Inativos / Bloqueados
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1.1 }}>
                {totalInativos}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#EF4444" }}>
            <AlertTriangle size={40} color="#EF4444" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* ==================================================
          3. PAINEL PRINCIPAL: FILTROS E LISTAGEM
          ================================================== */}
      <div className="clientes-panel-card">
        {/* Linha de Busca e Filtros */}
        <div className="clientes-filter-grid">
          <div className="clientes-search-box">
            <span style={{ position: "absolute", left: "12px", color: "#94A3B8", display: "flex" }}>
              <Search size={18} color="#94A3B8" strokeWidth={2} />
            </span>
            <input
              type="text"
              className="clientes-search-input"
              placeholder="Pesquisar por nome, CPF, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  display: "flex",
                }}
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#64748B", display: "flex" }}>
              <Filter size={16} color="#64748B" />
            </span>
            <select
              className="clientes-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVO">Somente Ativos</option>
              <option value="INATIVO">Somente Inativos</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("TODOS");
                setCurrentPage(1);
              }}
              className="clientes-clear-btn"
              title="Redefinir filtros"
            >
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Listagem em Tabela */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <div style={{ display: "inline-block", width: "28px", height: "28px", border: "3px solid #E2E8F0", borderTopColor: "#008C66", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: "12px", fontSize: "13px" }}>Carregando dados dos clientes...</p>
          </div>
        ) : filteredClientes.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              background: "#F8FAFC",
              borderRadius: "12px",
              border: "1px dashed #CBD5E1",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#E8F8F2",
                color: "#008C66",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <UsersRound size={24} color="#008C66" />
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Nenhum cliente localizado
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B", maxWidth: "360px", marginInline: "auto" }}>
              {searchTerm || statusFilter !== "TODOS"
                ? "Nenhum resultado corresponde aos critérios de busca selecionados."
                : "Cadastre o primeiro cliente da empresa para iniciar a emissão de contratos e controle de mensalidades."}
            </p>
            {searchTerm || statusFilter !== "TODOS" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("TODOS");
                }}
                className="clientes-clear-btn"
              >
                Limpar Filtros
              </button>
            ) : (
              <button onClick={handleOpenNew} className="clientes-new-btn">
                <UserPlus size={16} color="#FFFFFF" />
                <span>Cadastrar Primeiro Cliente</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="clientes-table-wrap">
              <table className="clientes-table">
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Nome do Cliente</th>
                    <th>CPF / Documento</th>
                    <th>Cidade / UF</th>
                    <th>Contato</th>
                    <th>Cadastro</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClientes.map((c) => {
                    const isAtivo = String(c.status).toUpperCase() === "ATIVO";
                    return (
                      <tr key={c.id}>
                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "#0F766E",
                              backgroundColor: "#F0FDFA",
                              padding: "3px 7px",
                              borderRadius: "6px",
                              border: "1px solid #CCFBF1",
                            }}
                          >
                            {getClienteMatricula(c.id, clientes)}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0C1837" }}>{c.nomeCompleto}</div>
                          {c.email && (
                            <span style={{ fontSize: "11px", color: "#64748B", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Mail size={12} color="#94A3B8" /> {c.email}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontVariantNumeric: "tabular-nums", color: "#334155" }}>
                            {c.cpf || "—"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#334155" }}>
                            {c.cidade ? (
                              <>
                                <MapPin size={13} color="#94A3B8" />
                                <span>{c.cidade}/{c.estado || "SP"}</span>
                              </>
                            ) : (
                              <span style={{ color: "#94A3B8" }}>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#334155" }}>
                            {c.telefone ? (
                              <>
                                <Phone size={13} color="#94A3B8" />
                                <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.telefone}</span>
                              </>
                            ) : (
                              <span style={{ color: "#94A3B8" }}>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ color: "#64748B", fontSize: "11.5px" }}>
                            {formatDate(c.dataCadastro)}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              height: "22px",
                              padding: "0 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: isAtivo ? "#E8F8F2" : "#FEE2E2",
                              color: isAtivo ? "#008C66" : "#DC2626",
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }} />
                            {isAtivo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="cliente-action-btn edit"
                              title="Editar Informações"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id!)}
                              className="cliente-action-btn delete"
                              title="Excluir Cliente"
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

            {/* Rodapé de Paginação */}
            <div className="clientes-pagination-bar">
              <div>
                Exibindo <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a{" "}
                <strong>{Math.min(currentPage * itemsPerPage, filteredClientes.length)}</strong> de{" "}
                <strong>{filteredClientes.length}</strong> registros
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  className="clientes-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Página Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 600, color: "#0F172A" }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="clientes-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Próxima Página"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==================================================
          4. MODAL DE CADASTRO / EDIÇÃO REESTILIZADO
          ================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCliente ? "Editar Informações do Cliente" : "Novo Cadastro de Cliente"}
      >
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", marginBottom: "18px", gap: "10px" }}>
          <button
            type="button"
            className={`modal-tab-btn ${activeFormTab === "DADOS" ? "active" : ""}`}
            onClick={() => setActiveFormTab("DADOS")}
          >
            <UsersRound size={16} />
            <span>Dados Pessoais</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeFormTab === "ENDERECO" ? "active" : ""}`}
            onClick={() => setActiveFormTab("ENDERECO")}
          >
            <MapPin size={16} />
            <span>Endereço</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeFormTab === "CONTATOS" ? "active" : ""}`}
            onClick={() => setActiveFormTab("CONTATOS")}
          >
            <Phone size={16} />
            <span>Contato & Status</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeFormTab === "DADOS" && (
            <div className="modal-form-grid">
              <div className="modal-form-group col-span-2">
                <label className="modal-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nomeCompleto"
                  className="modal-input"
                  value={formData.nomeCompleto || ""}
                  onChange={handleInputChange}
                  required
                  autoFocus
                  placeholder="Nome do titular completo"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Sexo</label>
                <select
                  name="sexo"
                  className="modal-input"
                  value={formData.sexo || "MASCULINO"}
                  onChange={handleInputChange}
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                </select>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">CPF</label>
                <input
                  type="text"
                  name="cpf"
                  className="modal-input"
                  value={formData.cpf || ""}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">RG</label>
                <input
                  type="text"
                  name="rg"
                  className="modal-input"
                  value={formData.rg || ""}
                  onChange={handleInputChange}
                  placeholder="Registro geral"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Data de Nascimento *</label>
                <input
                  type="date"
                  name="dataNascimento"
                  className="modal-input"
                  value={formData.dataNascimento || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Estado Civil</label>
                <select
                  name="estadoCivil"
                  className="modal-input"
                  value={formData.estadoCivil || "Solteiro"}
                  onChange={handleInputChange}
                >
                  <option value="Solteiro">Solteiro(a)</option>
                  <option value="Casado">Casado(a)</option>
                  <option value="Divorciado">Divorciado(a)</option>
                  <option value="Viúvo">Viúvo(a)</option>
                </select>
              </div>

              <div className="modal-form-group col-span-2">
                <label className="modal-label">Nome do Cônjuge</label>
                <input
                  type="text"
                  name="nomeConjuge"
                  className="modal-input"
                  value={formData.nomeConjuge || ""}
                  onChange={handleInputChange}
                  placeholder="Nome do parceiro(a)"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Nome do Pai</label>
                <input
                  type="text"
                  name="nomePai"
                  className="modal-input"
                  value={formData.nomePai || ""}
                  onChange={handleInputChange}
                  placeholder="Filiação paterna"
                />
              </div>

              <div className="modal-form-group col-span-2">
                <label className="modal-label">Nome da Mãe</label>
                <input
                  type="text"
                  name="nomeMae"
                  className="modal-input"
                  value={formData.nomeMae || ""}
                  onChange={handleInputChange}
                  placeholder="Filiação materna"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Naturalidade</label>
                <input
                  type="text"
                  name="naturalidade"
                  className="modal-input"
                  value={formData.naturalidade || ""}
                  onChange={handleInputChange}
                  placeholder="Cidade natal"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Profissão</label>
                <input
                  type="text"
                  name="profissao"
                  className="modal-input"
                  value={formData.profissao || ""}
                  onChange={handleInputChange}
                  placeholder="Ocupação profissional"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Local de Trabalho</label>
                <input
                  type="text"
                  name="localTrabalho"
                  className="modal-input"
                  value={formData.localTrabalho || ""}
                  onChange={handleInputChange}
                  placeholder="Empresa / local de trabalho"
                />
              </div>
            </div>
          )}

          {activeFormTab === "ENDERECO" && (
            <div className="modal-form-grid">
              <div className="modal-form-group">
                <label className="modal-label">CEP</label>
                <input
                  type="text"
                  name="cep"
                  className="modal-input"
                  value={formData.cep || ""}
                  onChange={handleInputChange}
                  placeholder="00000-000 (busca automática)"
                />
              </div>

              <div className="modal-form-group col-span-2">
                <label className="modal-label">Logradouro / Rua</label>
                <input
                  type="text"
                  name="logradouro"
                  className="modal-input"
                  value={formData.logradouro || ""}
                  onChange={handleInputChange}
                  placeholder="Rua, avenida ou alameda"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Número</label>
                <input
                  type="text"
                  name="numero"
                  className="modal-input"
                  value={formData.numero || ""}
                  onChange={handleInputChange}
                  placeholder="Nº ou S/N"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Bairro</label>
                <input
                  type="text"
                  name="bairro"
                  className="modal-input"
                  value={formData.bairro || ""}
                  onChange={handleInputChange}
                  placeholder="Bairro"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Complemento</label>
                <input
                  type="text"
                  name="complemento"
                  className="modal-input"
                  value={formData.complemento || ""}
                  onChange={handleInputChange}
                  placeholder="Apto, bloco, casa 2..."
                />
              </div>

              <div className="modal-form-group col-span-2">
                <label className="modal-label">Cidade</label>
                <input
                  type="text"
                  name="cidade"
                  className="modal-input"
                  value={formData.cidade || ""}
                  onChange={handleInputChange}
                  placeholder="Município"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">UF</label>
                <select
                  name="estado"
                  className="modal-input"
                  value={formData.estado || "SP"}
                  onChange={handleInputChange}
                >
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeFormTab === "CONTATOS" && (
            <div className="modal-form-grid">
              <div className="modal-form-group col-span-2">
                <label className="modal-label">E-mail</label>
                <input
                  type="email"
                  name="email"
                  className="modal-input"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  placeholder="cliente@email.com.br"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Telefone / Celular</label>
                <input
                  type="text"
                  name="telefone"
                  className="modal-input"
                  value={formData.telefone || ""}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Situação Cadastral</label>
                <select
                  name="status"
                  className="modal-input"
                  value={formData.status || "Ativo"}
                  onChange={handleInputChange}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
          )}

          {/* Botões do Rodapé do Modal */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #E2E8F0",
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: "0 18px",
                height: "40px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="clientes-new-btn"
              style={{ height: "40px", opacity: submitting ? 0.7 : 1 }}
            >
              <span>{submitting ? "Gravando..." : editingCliente ? "Salvar Alterações" : "Cadastrar Cliente"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirm
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId !== null) {
            try {
              await remove(confirmDeleteId);
              toast.success("Cliente excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir cliente.");
            }
          }
        }}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir o registro deste cliente? Esta operação remove os vínculos diretos e não poderá ser desfeita."
        confirmText="Excluir Definitivamente"
        variant="danger"
      />

      {/* Modal de Bloqueio/Upgrade por Limite do Plano */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        resource="CLIENTES"
        currentCount={limitInfo.current}
        limit={limitInfo.limit}
        planName={limitInfo.planName}
      />
    </div>
  );
}
