/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import { agregadosSupabaseService } from "@/services/agregados.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Agregado, Contrato, Plano, Cliente } from "@/types";
import { formatDate, formatCPF, getAgregadoMatricula } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import {
  UsersRound,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
  User,
  FileText,
  Tag,
  ShieldCheck,
} from "@/components/icons/AdminIcons";

export default function AgregadosPage() {
  const { data: agregados, loading, create, update, remove } = useStorage<Agregado>(agregadosSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [liberacaoFilter, setLiberacaoFilter] = useState("TODOS");
  const [parentescoFilter, setParentescoFilter] = useState("TODOS");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Estados de Modal e Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgregado, setEditingAgregado] = useState<Agregado | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [parentesco, setParentesco] = useState("Filho(a)");
  const [liberacao, setLiberacao] = useState("Sim");

  // Contrato e Plano selecionados para cálculo de limites e detalhes
  const selectedContrato = contratos.find((c) => String(c.id) === String(selectedContratoId));
  const selectedPlano = selectedContrato
    ? planos.find((p) => String(p.id) === String(selectedContrato.planoId))
    : null;

  // Limite máximo de agregados do plano
  const maxAgregados = selectedPlano ? parseInt(String(selectedPlano.limiteDependentes || 0)) : 0;

  // Contagem atual de agregados vinculados ao contrato selecionado (excluindo o que está sendo editado)
  const currentCount = agregados.filter(
    (a) =>
      String(a.contratoId) === String(selectedContratoId) &&
      (editingAgregado ? String(a.id) !== String(editingAgregado.id) : true)
  ).length;

  const isLimitReached = maxAgregados > 0 && currentCount >= maxAgregados;
  const canCreate = contratos.length > 0;

  // Handlers de Abertura de Modal
  const handleOpenNew = () => {
    if (!canCreate) {
      toast.error("É necessário ter pelo menos um Contrato ativo para cadastrar um Agregado.");
      return;
    }
    setEditingAgregado(null);
    setSelectedContratoId(String(contratos[0].id));
    setNome("");
    setCpf("");
    setDataNascimento("");
    setParentesco("Filho(a)");
    setLiberacao("Sim");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agregado: Agregado) => {
    setEditingAgregado(agregado);
    setSelectedContratoId(String(agregado.contratoId));
    setNome(agregado.nome);
    setCpf(agregado.cpf || "");
    setDataNascimento(agregado.dataNascimento || "");
    setParentesco(agregado.parentesco || "Filho(a)");
    setLiberacao(agregado.liberacao || "Sim");
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContratoId || !nome.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (isLimitReached) {
      toast.error(`Limite máximo de dependentes (${maxAgregados}) deste plano foi atingido!`);
      return;
    }

    setSubmitting(true);
    const payload: Omit<Agregado, "id"> = {
      contratoId: selectedContratoId,
      nome: nome.trim(),
      cpf: cpf.trim(),
      dataNascimento,
      parentesco,
      liberacao,
    };

    try {
      if (editingAgregado && editingAgregado.id !== undefined) {
        await update(editingAgregado.id, payload);
        toast.success("Agregado atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Agregado adicionado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar dependente/agregado.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtragem de Agregados
  const filteredAgregados = useMemo(() => {
    return agregados.filter((a) => {
      const contrato = contratos.find((c) => String(c.id) === String(a.contratoId));
      const contratoNum = contrato?.numeroContrato || "";
      const titularNome = contrato?.clienteNome || "";

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.nome.toLowerCase().includes(q) ||
        (a.cpf && a.cpf.includes(q)) ||
        contratoNum.toLowerCase().includes(q) ||
        titularNome.toLowerCase().includes(q);

      const matchesLiberacao =
        liberacaoFilter === "TODOS" ||
        (liberacaoFilter === "SIM" && a.liberacao === "Sim") ||
        (liberacaoFilter === "NAO" && a.liberacao === "Não");

      const matchesParentesco =
        parentescoFilter === "TODOS" ||
        a.parentesco?.toLowerCase() === parentescoFilter.toLowerCase();

      return matchesSearch && matchesLiberacao && matchesParentesco;
    });
  }, [agregados, contratos, searchTerm, liberacaoFilter, parentescoFilter]);

  // Indicadores de KPIs
  const totalAgregados = agregados.length;
  const agregadosLiberados = agregados.filter((a) => a.liberacao === "Sim").length;
  const agregadosBloqueados = agregados.filter((a) => a.liberacao === "Não").length;

  // Média de Agregados por Contrato Ativo
  const contratosComAgregados = useMemo(() => {
    const ids = new Set(agregados.map((a) => String(a.contratoId)));
    return ids.size;
  }, [agregados]);

  // Paginação
  const totalPages = Math.ceil(filteredAgregados.length / itemsPerPage) || 1;
  const paginatedAgregados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAgregados.slice(start, start + itemsPerPage);
  }, [filteredAgregados, currentPage]);

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
              <UsersRound className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Agregados e Dependentes
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Gestão de beneficiários vinculados aos contratos titulares e controle de cobertura
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
          <span>Novo Agregado</span>
        </button>
      </div>

      {/* Alerta Preventivo de Pré-requisitos */}
      {!canCreate && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm text-sm animate-fadeIn">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <strong className="font-semibold text-amber-950">Pré-requisito para Adição de Agregados:</strong>
            <p className="text-amber-800 text-xs md:text-sm mt-0.5">
              Você precisa cadastrar pelo menos um <strong>Contrato</strong> antes de poder associar dependentes ou agregados.
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
              Total de Agregados
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <UsersRound size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{totalAgregados}</span>
            <span className="text-xs text-[#64748B]">dependentes</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Total na base de contratos</p>
        </div>

        {/* KPI 2: Liberados / Ativos */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Cobertura Liberada
            </span>
            <div className="p-2 bg-green-50 rounded-lg text-emerald-600">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{agregadosLiberados}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {totalAgregados > 0 ? `${Math.round((agregadosLiberados / totalAgregados) * 100)}%` : "0%"} aptos
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Beneficiários com cobertura ativa</p>
        </div>

        {/* KPI 3: Contratos com Dependentes */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Famílias Atendidas
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileText size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{contratosComAgregados}</span>
            <span className="text-xs text-[#64748B]">contratos</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Contratos com ao menos 1 dependente</p>
        </div>

        {/* KPI 4: Bloqueados / Em Carência */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Aguardando / Bloqueados
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{agregadosBloqueados}</span>
            <span className="text-xs text-[#64748B]">sem liberação</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Liberação suspensa ou em análise</p>
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
                placeholder="Buscar por dependente, CPF, titular ou nº de contrato..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>

            {/* Seletor de Liberação */}
            <div className="relative min-w-[150px]">
              <Filter
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
              />
              <select
                value={liberacaoFilter}
                onChange={(e) => {
                  setLiberacaoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
              >
                <option value="TODOS">Liberação: Todas</option>
                <option value="SIM">Apenas Liberados</option>
                <option value="NAO">Não Liberados</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8] text-xs">
                ▼
              </div>
            </div>

            {/* Seletor de Parentesco */}
            <div className="relative min-w-[150px]">
              <select
                value={parentescoFilter}
                onChange={(e) => {
                  setParentescoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 pr-8 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] appearance-none focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all cursor-pointer"
              >
                <option value="TODOS">Parentesco: Todos</option>
                <option value="Cônjuge">Cônjuge</option>
                <option value="Filho(a)">Filho(a)</option>
                <option value="Pai/Mãe">Pai/Mãe</option>
                <option value="Sogro(a)">Sogro(a)</option>
                <option value="Outros">Outros</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8] text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Botão de Limpar Filtros */}
          {(searchTerm || liberacaoFilter !== "TODOS" || parentescoFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setLiberacaoFilter("TODOS");
                setParentescoFilter("TODOS");
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={15} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Tabela de Agregados */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAgregados.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-[#64748B] mb-3">
                <UsersRound size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Nenhum agregado encontrado</h3>
              <p className="text-xs md:text-sm text-[#64748B] max-w-md mx-auto mt-1">
                {searchTerm || liberacaoFilter !== "TODOS" || parentescoFilter !== "TODOS"
                  ? "Tente refinar sua busca ou limpe os filtros aplicados."
                  : "Cadastre um novo dependente associando-o a um contrato ativo."}
              </p>
              {canCreate && !searchTerm && liberacaoFilter === "TODOS" && parentescoFilter === "TODOS" && (
                <button
                  onClick={handleOpenNew}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 transition-all shadow-sm"
                >
                  <PlusCircle size={16} />
                  Cadastrar Primeiro Agregado
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#475569] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Nome do Dependente</th>
                  <th className="py-3 px-4">CPF</th>
                  <th className="py-3 px-4">Data Nasc.</th>
                  <th className="py-3 px-4">Parentesco</th>
                  <th className="py-3 px-4">Contrato / Titular</th>
                  <th className="py-3 px-4 text-center">Liberação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-sm text-[#1E293B]">
                {paginatedAgregados.map((a) => {
                  const contrato = contratos.find((c) => String(c.id) === String(a.contratoId));
                  const matricula = getAgregadoMatricula(a.id, a.contratoId, agregados, contrato, clientes);
                  const isLiberado = a.liberacao === "Sim";

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Matrícula */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0F172A]">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[#334155] border border-slate-200">
                          {matricula}
                        </span>
                      </td>

                      {/* Nome do Agregado */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#008C66] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {a.nome?.charAt(0).toUpperCase() || "A"}
                          </div>
                          <span className="font-semibold">{a.nome}</span>
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="py-3.5 px-4 font-mono text-xs text-[#475569]">
                        {a.cpf ? formatCPF(a.cpf) : <span className="text-slate-400 font-sans italic">Não informado</span>}
                      </td>

                      {/* Data de Nascimento */}
                      <td className="py-3.5 px-4 text-xs text-[#475569]">
                        {a.dataNascimento ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-[#94A3B8]" />
                            <span>{formatDate(a.dataNascimento)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não informada</span>
                        )}
                      </td>

                      {/* Parentesco */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {a.parentesco || "Dependente"}
                        </span>
                      </td>

                      {/* Contrato / Titular */}
                      <td className="py-3.5 px-4">
                        {contrato ? (
                          <div>
                            <span className="font-semibold text-xs text-[#0F172A] block">
                              {contrato.clienteNome}
                            </span>
                            <span className="text-[11px] text-[#64748B] font-mono">
                              Contrato: {contrato.numeroContrato}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Contrato não localizado</span>
                        )}
                      </td>

                      {/* Liberação */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isLiberado
                              ? "bg-emerald-50 text-[#008C66] border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLiberado ? "bg-[#008C66]" : "bg-rose-500"
                            }`}
                          />
                          {isLiberado ? "Liberado" : "Bloqueado"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(a)}
                            title="Editar dependente"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit size={16} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id!)}
                            title="Excluir dependente"
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
        {filteredAgregados.length > 0 && (
          <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Mostrando{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(filteredAgregados.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(filteredAgregados.length, currentPage * itemsPerPage)}
              </span>{" "}
              de <span className="font-semibold text-[#0F172A]">{filteredAgregados.length}</span> dependentes
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

      {/* Modal Formulário: Criar / Editar Agregado */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAgregado ? "Editar Agregado / Dependente" : "Cadastrar Novo Agregado"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Header do Form no Modal */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersRound size={18} className="text-[#008C66]" />
              <span className="text-xs font-semibold text-[#0F172A]">
                {editingAgregado
                  ? `Editando Beneficiário: ${editingAgregado.nome}`
                  : "Novo Vínculo Familiar"}
              </span>
            </div>
            {editingAgregado && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                editingAgregado.liberacao === "Sim" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>
                {editingAgregado.liberacao === "Sim" ? "Liberado" : "Bloqueado"}
              </span>
            )}
          </div>

          {/* Seleção do Contrato / Titular */}
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

          {/* Card Resumo do Contrato & Limite de Agregados */}
          {selectedContrato && (
            <div className={`p-3.5 rounded-xl border space-y-2 transition-all ${
              isLimitReached
                ? "bg-rose-50 border-rose-200 text-rose-950"
                : "bg-emerald-50/70 border-emerald-200/80 text-[#006D50]"
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Tag size={15} />
                  Plano: {selectedContrato.planoNome || selectedPlano?.nome || "Vigente"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  isLimitReached ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {currentCount} de {maxAgregados} permitidos
                </span>
              </div>

              {isLimitReached ? (
                <div className="text-xs text-rose-700 flex items-center gap-1.5 pt-0.5 font-medium">
                  <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                  <span>Limite máximo de dependentes atingido para este plano.</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-600">
                  Titular: <strong>{selectedContrato.clienteNome}</strong> • Carência: {selectedPlano?.diasCarencia || 0} dias
                </p>
              )}
            </div>
          )}

          {/* Nome do Agregado */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Nome Completo do Dependente <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Ex: Maria Souza Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>
          </div>

          {/* CPF e Data de Nascimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                CPF <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Data de Nascimento
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Parentesco e Liberação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Grau de Parentesco
              </label>
              <select
                value={parentesco}
                onChange={(e) => setParentesco(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                <option value="Cônjuge">Cônjuge</option>
                <option value="Filho(a)">Filho(a)</option>
                <option value="Pai/Mãe">Pai/Mãe</option>
                <option value="Sogro(a)">Sogro(a)</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Liberação de Cobertura
              </label>
              <select
                value={liberacao}
                onChange={(e) => setLiberacao(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              >
                <option value="Sim">Sim (Cobertura Autorizada)</option>
                <option value="Não">Não (Em Carência / Bloqueado)</option>
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
              disabled={submitting || isLimitReached}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all ${
                isLimitReached
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] cursor-pointer"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingAgregado ? "Salvar Alterações" : "Cadastrar Dependente"}</span>
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
              toast.success("Agregado excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir agregado.");
            }
          }
        }}
        title="Excluir Agregado"
        message="Tem certeza que deseja excluir este dependente/agregado? Essa ação removerá o registro e a cobertura associada."
        confirmText="Excluir Dependente"
        variant="danger"
      />
    </div>
  );
}
