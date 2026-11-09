/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useStorage } from "@/hooks/useStorage";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { Plano, Contrato } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import {
  Tag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  UsersRound,
  FileText,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
} from "@/components/icons/AdminIcons";

export default function PlanosPage() {
  const { data: planos, loading, create, update, remove } = useStorage<Plano>(planosSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const toast = useToast();

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estados de Modal e Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Plano>>({
    nome: "",
    diasCarencia: "0",
    nMeses: "",
    limiteDependentes: "",
    valorMensal: "",
    status: "Ativo",
  });

  const handleOpenNew = () => {
    setEditingPlano(null);
    setFormData({
      nome: "",
      diasCarencia: "0",
      nMeses: "12",
      limiteDependentes: "4",
      valorMensal: "",
      status: "Ativo",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plano: Plano) => {
    setEditingPlano(plano);
    setFormData(plano);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    // Checagem de segurança de contratos ativos vinculados
    const linkedContratos = contratos.filter((c) => String(c.planoId) === String(id));
    if (linkedContratos.length > 0) {
      toast.error(`Este plano possui ${linkedContratos.length} contrato(s) vinculado(s) e não pode ser excluído diretamente.`);
      return;
    }
    setConfirmDeleteId(id);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome?.trim()) {
      toast.error("Por favor, informe o Nome do Plano.");
      return;
    }

    setSubmitting(true);

    const payload: Omit<Plano, "id"> = {
      nome: formData.nome.trim().toUpperCase(),
      diasCarencia: formData.diasCarencia || "0",
      nMeses: formData.nMeses || "",
      limiteDependentes: formData.limiteDependentes || "0",
      valorMensal: formData.valorMensal || "0",
      status: formData.status || "Ativo",
    };

    try {
      if (editingPlano && editingPlano.id !== undefined) {
        await update(editingPlano.id, payload);
        toast.success("Plano atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Plano cadastrado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar plano.");
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs Resumo de Planos
  const totalGeral = planos.length;
  const totalAtivos = planos.filter((p) => String(p.status || "Ativo").toUpperCase() === "ATIVO").length;
  const totalInativos = planos.filter((p) => String(p.status).toUpperCase() === "INATIVO").length;

  const ticketMedio =
    totalAtivos > 0
      ? planos
          .filter((p) => String(p.status || "Ativo").toUpperCase() === "ATIVO")
          .reduce((acc, curr) => acc + Number(curr.valorMensal || 0), 0) / totalAtivos
      : 0;

  // Filtragem
  const filteredPlanos = planos.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.nome.toLowerCase().includes(term) ||
      String(p.id).includes(term);

    const matchesStatus =
      statusFilter === "TODOS" ||
      String(p.status || "Ativo").toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Paginação
  const totalPages = Math.ceil(filteredPlanos.length / itemsPerPage) || 1;
  const paginatedPlanos = filteredPlanos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="planos-root-container">
      {/* Estilos Escopados para o Módulo Planos */}
      <style jsx global>{`
        .planos-root-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .planos-kpis-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(12px, 1.2vw, 18px);
          width: 100%;
        }

        .planos-kpi-card {
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
        .planos-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 35, 55, 0.08);
        }

        .planos-panel-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          box-sizing: border-box;
          width: 100%;
        }

        .planos-filter-grid {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: center;
        }

        .planos-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .planos-search-input {
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
        .planos-search-input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.12);
        }

        .planos-select {
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
        .planos-select:focus {
          border-color: #008C66;
        }

        .planos-clear-btn {
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
        .planos-clear-btn:hover {
          background: #EEF2F6;
          color: #0F172A;
        }

        .planos-new-btn {
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
        .planos-new-btn:hover {
          background: linear-gradient(135deg, #009B71 0%, #007A5A 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 140, 102, 0.35);
        }

        /* Tabela Estilizada */
        .planos-table-wrap {
          width: 100%;
          overflow-x: auto;
          margin-top: 12px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
        }

        .planos-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          text-align: left;
          background: #FFFFFF;
        }

        .planos-table th {
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

        .planos-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }

        .planos-table tr:last-child td {
          border-bottom: none;
        }

        .planos-table tr:hover td {
          background-color: #F8FAFC;
        }

        .plano-action-btn {
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
        .plano-action-btn.edit:hover {
          background: #F0FDF4;
          border-color: #86EFAC;
          color: #15803D;
        }
        .plano-action-btn.delete:hover {
          background: #FEF2F2;
          border-color: #FECACA;
          color: #DC2626;
        }

        /* Paginação */
        .planos-pagination-bar {
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

        .planos-page-btn {
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
        .planos-page-btn:hover:not(:disabled) {
          background: #F1F5F9;
          color: #0F172A;
        }
        .planos-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .modal-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
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

        @media (max-width: 1024px) {
          .planos-kpis-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .planos-filter-grid {
            grid-template-columns: 1fr;
          }
          .modal-form-grid {
            grid-template-columns: 1fr;
          }
          .modal-form-group.col-span-2 {
            grid-column: span 1;
          }
        }

        @media (max-width: 640px) {
          .planos-kpis-grid {
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
              Catálogo de Planos
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
              Configuração comercial de mensalidades, prazos, coberturas e limites de agregados
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="planos-new-btn"
          title="Cadastrar Novo Plano"
        >
          <PlusCircle size={18} color="#FFFFFF" strokeWidth={2.2} />
          <span>Cadastrar Plano</span>
        </button>
      </div>

      {/* ==================================================
          2. INDICADORES RÁPIDOS (KPIS DE PLANOS)
          ================================================== */}
      <div className="planos-kpis-grid">
        {/* Total de Planos */}
        <div className="planos-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#3185FF", display: "flex" }}>
              <Tag size={26} color="#3185FF" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Total de Planos
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1.1 }}>
                {totalGeral}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#3185FF" }}>
            <Tag size={40} color="#3185FF" strokeWidth={1.5} />
          </div>
        </div>

        {/* Planos Ativos */}
        <div className="planos-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#00A86B", display: "flex" }}>
              <CheckCircle2 size={26} color="#00A86B" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Planos Ativos
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

        {/* Ticket Médio */}
        <div className="planos-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#E5A400", display: "flex" }}>
              <DollarSign size={26} color="#E5A400" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Mensalidade Média
              </span>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#0C1738", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(ticketMedio)}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#E5A400" }}>
            <DollarSign size={40} color="#E5A400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Inativos */}
        <div className="planos-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#EF4444", display: "flex" }}>
              <AlertTriangle size={26} color="#EF4444" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", display: "block" }}>
                Planos Inativos
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
      <div className="planos-panel-card">
        {/* Linha de Busca e Filtros */}
        <div className="planos-filter-grid">
          <div className="planos-search-box">
            <span style={{ position: "absolute", left: "12px", color: "#94A3B8", display: "flex" }}>
              <Search size={18} color="#94A3B8" strokeWidth={2} />
            </span>
            <input
              type="text"
              className="planos-search-input"
              placeholder="Pesquisar por nome do plano ou código..."
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
              className="planos-select"
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
              className="planos-clear-btn"
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
            <p style={{ marginTop: "12px", fontSize: "13px" }}>Carregando catálogo de planos...</p>
          </div>
        ) : filteredPlanos.length === 0 ? (
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
              <Tag size={24} color="#008C66" />
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Nenhum plano localizado
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B", maxWidth: "360px", marginInline: "auto" }}>
              {searchTerm || statusFilter !== "TODOS"
                ? "Nenhum resultado corresponde aos critérios de busca selecionados."
                : "Cadastre o primeiro plano comercial da empresa para disponibilizar na emissão de contratos."}
            </p>
            {searchTerm || statusFilter !== "TODOS" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("TODOS");
                }}
                className="planos-clear-btn"
              >
                Limpar Filtros
              </button>
            ) : (
              <button onClick={handleOpenNew} className="planos-new-btn">
                <PlusCircle size={16} color="#FFFFFF" />
                <span>Cadastrar Primeiro Plano</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="planos-table-wrap">
              <table className="planos-table">
                <thead>
                  <tr>
                    <th>Cód.</th>
                    <th>Nome do Plano</th>
                    <th>Duração</th>
                    <th>Máx. Agregados</th>
                    <th>Carência</th>
                    <th>Valor Mensal</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPlanos.map((p) => {
                    const isAtivo = String(p.status || "Ativo").toUpperCase() === "ATIVO";
                    const contratosCount = contratos.filter((c) => String(c.planoId) === String(p.id)).length;
                    return (
                      <tr key={p.id}>
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
                            #{String(p.id).padStart(3, "0")}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0C1837" }}>{p.nome}</div>
                          <span style={{ fontSize: "11px", color: "#64748B" }}>
                            {contratosCount} contrato(s) ativo(s)
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#334155" }}>
                            <Calendar size={13} color="#94A3B8" />
                            <span>{p.nMeses ? `${p.nMeses} meses` : "Indeterminado"}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#334155" }}>
                            <UsersRound size={13} color="#94A3B8" />
                            <span>{p.limiteDependentes || 0} pessoa(s)</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#334155" }}>
                            <Clock size={13} color="#94A3B8" />
                            <span>{p.diasCarencia || 0} dias</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 750, color: "#0C1837", fontVariantNumeric: "tabular-nums", fontSize: "13.5px" }}>
                            {formatCurrency(Number(p.valorMensal || 0))}
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
                              onClick={() => handleOpenEdit(p)}
                              className="plano-action-btn edit"
                              title="Editar Plano"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="plano-action-btn delete"
                              title="Excluir Plano"
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
            <div className="planos-pagination-bar">
              <div>
                Exibindo <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a{" "}
                <strong>{Math.min(currentPage * itemsPerPage, filteredPlanos.length)}</strong> de{" "}
                <strong>{filteredPlanos.length}</strong> planos cadastrados
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  className="planos-page-btn"
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
                  className="planos-page-btn"
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
        title={editingPlano ? "Editar Informações do Plano" : "Novo Cadastro de Plano"}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-form-grid">
            <div className="modal-form-group col-span-2">
              <label className="modal-label">Nome do Plano *</label>
              <input
                type="text"
                name="nome"
                className="modal-input"
                value={formData.nome || ""}
                onChange={handleInputChange}
                required
                autoFocus
                placeholder="Ex: Plano Familiar Ouro"
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Valor Mensal (R$) *</label>
              <input
                type="text"
                name="valorMensal"
                className="modal-input"
                value={formData.valorMensal || ""}
                onChange={handleInputChange}
                placeholder="Ex: 89.90"
                required
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Dias de Carência</label>
              <input
                type="number"
                name="diasCarencia"
                className="modal-input"
                value={formData.diasCarencia ?? "0"}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Duração do Contrato (Meses)</label>
              <input
                type="number"
                name="nMeses"
                className="modal-input"
                value={formData.nMeses || ""}
                onChange={handleInputChange}
                placeholder="Ex: 12"
                min="1"
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Limite de Agregados / Dependentes</label>
              <input
                type="number"
                name="limiteDependentes"
                className="modal-input"
                value={formData.limiteDependentes ?? "0"}
                onChange={handleInputChange}
                placeholder="Ex: 4"
                min="0"
              />
            </div>

            <div className="modal-form-group col-span-2">
              <label className="modal-label">Status Comercial</label>
              <select
                name="status"
                className="modal-input"
                value={formData.status || "Ativo"}
                onChange={handleInputChange}
              >
                <option value="Ativo">Ativo (disponível para novos contratos)</option>
                <option value="Inativo">Inativo (suspenso para novas vendas)</option>
              </select>
            </div>
          </div>

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
              className="planos-new-btn"
              style={{ height: "40px", opacity: submitting ? 0.7 : 1 }}
            >
              <span>{submitting ? "Gravando..." : editingPlano ? "Salvar Alterações" : "Cadastrar Plano"}</span>
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
              toast.success("Plano excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir plano.");
            }
          }
        }}
        title="Excluir Plano"
        message="Tem certeza que deseja excluir este plano? Esta operação não poderá ser desfeita."
        confirmText="Excluir Definitivamente"
        variant="danger"
      />
    </div>
  );
}
