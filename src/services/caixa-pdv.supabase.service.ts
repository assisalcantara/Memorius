/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import {
  CaixaFisico,
  CaixaTurno,
  CaixaMovimentacao,
  FechamentoCegoPayload,
  FechamentoCegoResult,
} from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamelCaixaFisico(db: any): CaixaFisico | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    nome: db.nome,
    identificadorPdv: db.identificador_pdv,
    descricao: db.descricao,
    ativo: db.ativo ?? true,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toCamelCaixaTurno(db: any): CaixaTurno | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    caixaId: db.caixa_id,
    operadorId: db.operador_id,
    status: db.status,
    dataAbertura: db.data_abertura,
    fundoTroco: db.fundo_troco ? Number(db.fundo_troco) : 0,
    observacoesAbertura: db.observacoes_abertura,
    dataFechamento: db.data_fechamento,
    totalDeclaradoDinheiro: db.total_declarado_dinheiro !== null ? Number(db.total_declarado_dinheiro) : null,
    totalDeclaradoPix: db.total_declarado_pix !== null ? Number(db.total_declarado_pix) : null,
    totalDeclaradoCartaoDebito: db.total_declarado_cartao_debito !== null ? Number(db.total_declarado_cartao_debito) : null,
    totalDeclaradoCartaoCredito: db.total_declarado_cartao_credito !== null ? Number(db.total_declarado_cartao_credito) : null,
    totalDeclaradoOutros: db.total_declarado_outros !== null ? Number(db.total_declarado_outros) : null,
    totalDeclaradoGeral: db.total_declarado_geral !== null ? Number(db.total_declarado_geral) : null,
    totalSistemaDinheiro: db.total_sistema_dinheiro !== null ? Number(db.total_sistema_dinheiro) : null,
    totalSistemaPix: db.total_sistema_pix !== null ? Number(db.total_sistema_pix) : null,
    totalSistemaCartaoDebito: db.total_sistema_cartao_debito !== null ? Number(db.total_sistema_cartao_debito) : null,
    totalSistemaCartaoCredito: db.total_sistema_cartao_credito !== null ? Number(db.total_sistema_cartao_credito) : null,
    totalSistemaOutros: db.total_sistema_outros !== null ? Number(db.total_sistema_outros) : null,
    totalSistemaGeral: db.total_sistema_geral !== null ? Number(db.total_sistema_geral) : null,
    diferencaDinheiro: db.diferenca_dinheiro !== null ? Number(db.diferenca_dinheiro) : null,
    diferencaGeral: db.diferenca_geral !== null ? Number(db.diferenca_geral) : null,
    temDivergencia: db.tem_divergencia ?? false,
    motivoDivergencia: db.motivo_divergencia,
    supervisorAprovadorId: db.supervisor_aprovador_id,
    supervisorAprovadorNome: db.supervisor_aprovador_nome,
    dataAprovacao: db.data_aprovacao,
    observacoesSupervisor: db.observacoes_supervisor,
    caixaNome: db.caixas_fisicos?.nome,
    operadorNome: db.profiles?.nome || db.profiles?.email,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toCamelCaixaMovimentacao(db: any): CaixaMovimentacao | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    turnoId: db.turno_id,
    tipo: db.tipo,
    formaPagamento: db.forma_pagamento,
    valor: db.valor ? Number(db.valor) : 0,
    motivo: db.motivo,
    documentoRef: db.documento_ref,
    idempotencyKey: db.idempotency_key,
    operadorId: db.operador_id,
    operadorNome: db.operador_nome,
    autorizadorId: db.autorizador_id,
    autorizadorNome: db.autorizador_nome,
    createdAt: db.created_at,
  };
}

export const caixaPdvSupabaseService = {
  // =========================================================================
  // CAIXAS FÍSICOS (TERMINAIS)
  // =========================================================================
  async getCaixasFisicos(tenantId?: string): Promise<CaixaFisico[]> {
    let query = (supabase.from("caixas_fisicos") as any)
      .select("*")
      .order("nome", { ascending: true });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao listar caixas físicos:", error);
      throw new Error(error.message);
    }

    return (data || []).map(toCamelCaixaFisico).filter(Boolean) as CaixaFisico[];
  },

  async createCaixaFisico(payload: Partial<CaixaFisico>): Promise<CaixaFisico> {
    const { data, error } = await (supabase.from("caixas_fisicos") as any)
      .insert({
        tenant_id: payload.tenantId,
        nome: payload.nome?.trim(),
        identificador_pdv: payload.identificadorPdv?.trim() || null,
        descricao: payload.descricao?.trim() || null,
        ativo: payload.ativo ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao cadastrar caixa físico:", error);
      throw new Error(error.message);
    }

    await auditLogSupabaseService.logActivity(
      "PDV_CAIXA",
      "CREATE_TERMINAL",
      data.id,
      `Criado terminal físico de caixa: ${payload.nome}`
    );

    return toCamelCaixaFisico(data)!;
  },

  // =========================================================================
  // TURNOS DE CAIXA
  // =========================================================================
  async getTurnoAtivoOperador(operadorId?: string): Promise<CaixaTurno | null> {
    let query = (supabase.from("v_caixa_turnos_segura") as any)
      .select(`
        *,
        caixas_fisicos:caixa_id (nome),
        profiles:operador_id (nome, email)
      `)
      .in("status", ["ABERTO", "EM_CONCILIACAO"]);

    if (operadorId) {
      query = query.eq("operador_id", operadorId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("Erro ao buscar turno ativo do operador:", error);
      throw new Error(error.message);
    }

    return toCamelCaixaTurno(data);
  },

  async abrirTurno(caixaId: string, fundoTroco: number, observacoes?: string): Promise<string> {
    const { data, error } = await (supabase.rpc as any)("abrir_turno_caixa", {
      p_caixa_id: caixaId,
      p_fundo_troco: Number(fundoTroco),
      p_observacoes: observacoes || null,
    });

    if (error) {
      console.error("Erro ao abrir turno de caixa:", error);
      throw new Error(error.message);
    }

    await auditLogSupabaseService.logActivity(
      "PDV_CAIXA",
      "ABRIR_TURNO",
      data,
      `Abertura de caixa com fundo de troco R$ ${Number(fundoTroco).toFixed(2)}`
    );

    return data;
  },

  async fecharTurnoCego(turnoId: string, payload: FechamentoCegoPayload): Promise<FechamentoCegoResult> {
    const { data, error } = await (supabase.rpc as any)("fechar_turno_caixa_cego", {
      p_turno_id: turnoId,
      p_declarado_dinheiro: Number(payload.declaradoDinheiro),
      p_declarado_pix: Number(payload.declaradoPix || 0),
      p_declarado_cartao_debito: Number(payload.declaradoCartaoDebito || 0),
      p_declarado_cartao_credito: Number(payload.declaradoCartaoCredito || 0),
      p_declarado_outros: Number(payload.declaradoOutros || 0),
      p_motivo_divergencia: payload.motivoDivergencia || null,
    });

    if (error) {
      console.error("Erro no fechamento cego de caixa:", error);
      throw new Error(error.message);
    }

    await auditLogSupabaseService.logActivity(
      "PDV_CAIXA",
      "FECHAMENTO_CEGO",
      turnoId,
      `Fechamento cego declarado. Status: ${data.status}`
    );

    return {
      turnoId: data.turno_id,
      status: data.status,
      temDivergencia: data.tem_divergencia !== undefined ? Boolean(data.tem_divergencia) : false,
      diferencaDinheiro: data.diferenca_dinheiro !== undefined ? Number(data.diferenca_dinheiro) : 0,
      diferencaGeral: data.diferenca_geral !== undefined ? Number(data.diferenca_geral) : 0,
      totalDeclaradoGeral: Number(data.total_declarado_geral),
    };
  },

  async aprovarConciliacao(turnoId: string, observacoes?: string): Promise<boolean> {
    const { data, error } = await (supabase.rpc as any)("aprovar_conciliacao_caixa", {
      p_turno_id: turnoId,
      p_observacoes: observacoes || null,
    });

    if (error) {
      console.error("Erro ao homologar divergência de caixa:", error);
      throw new Error(error.message);
    }

    await auditLogSupabaseService.logActivity(
      "PDV_CAIXA",
      "APROVAR_CONCILIACAO",
      turnoId,
      `Conciliação e divergência de turno aprovadas pelo supervisor: ${observacoes || "Sem observações"}`
    );

    return Boolean(data);
  },

  // =========================================================================
  // MOVIMENTAÇÕES DE CAIXA (SUPRIMENTO / SANGRIA)
  // =========================================================================
  async getMovimentacoesTurno(turnoId: string): Promise<CaixaMovimentacao[]> {
    const { data, error } = await (supabase.from("caixa_movimentacoes") as any)
      .select("*")
      .eq("turno_id", turnoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar movimentações do turno:", error);
      throw new Error(error.message);
    }

    return (data || []).map(toCamelCaixaMovimentacao).filter(Boolean) as CaixaMovimentacao[];
  },

  async lancarSuprimento(turnoId: string, valor: number, motivo: string, idempotencyKey?: string): Promise<string> {
    const { data, error } = await (supabase.rpc as any)("lancar_caixa_movimentacao", {
      p_turno_id: turnoId,
      p_tipo: "SUPRIMENTO",
      p_forma_pagamento: "DINHEIRO",
      p_valor: Number(valor),
      p_motivo: motivo.trim(),
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      console.error("Erro ao lançar suprimento:", error);
      throw new Error(error.message);
    }

    await auditLogSupabaseService.logActivity(
      "PDV_CAIXA",
      "SUPRIMENTO",
      turnoId,
      `Suprimento de caixa R$ ${Number(valor).toFixed(2)}: ${motivo}`
    );

    return data;
  },

  async lancarSangria(
    turnoId: string,
    valor: number,
    motivo: string,
    idempotencyKey?: string,
    autorizadorId?: string
  ): Promise<string> {
    const { data, error } = await (supabase.rpc as any)("lancar_caixa_movimentacao", {
      p_turno_id: turnoId,
      p_tipo: "SANGRIA",
      p_forma_pagamento: "DINHEIRO",
      p_valor: Number(valor),
      p_motivo: motivo.trim(),
      p_idempotency_key: idempotencyKey || null,
      p_autorizador_id: autorizadorId || null,
    });

    if (error) {
      console.error("Erro ao lançar sangria:", error);
      throw new Error(error.message);
    }

    await auditLogSupabaseService.logActivity(
      "PDV_CAIXA",
      "SANGRIA",
      turnoId,
      `Sangria de caixa R$ ${Number(valor).toFixed(2)}: ${motivo}`
    );

    return data;
  },

  async getSaldoDinheiroDisponivel(turnoId: string): Promise<number> {
    const { data, error } = await (supabase.rpc as any)("get_caixa_saldo_dinheiro", {
      p_turno_id: turnoId,
    });

    if (error) {
      console.error("Erro ao consultar saldo em dinheiro do caixa:", error);
      throw new Error(error.message);
    }

    return Number(data || 0);
  },
};
