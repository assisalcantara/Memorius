/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import {
  PdvVenda,
  PdvVendaItem,
  PdvPagamento,
  CriarVendaPayload,
  CaixaFormaPagamento
} from "@/types";

function toCamelVenda(row: any): PdvVenda {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    turnoId: row.turno_id,
    caixaId: row.caixa_id,
    operadorId: row.operador_id,
    clienteId: row.cliente_id,
    numeroVenda: row.numero_venda ? Number(row.numero_venda) : undefined,
    status: row.status,
    subtotal: row.subtotal ? Number(row.subtotal) : 0,
    descontoValor: row.desconto_valor ? Number(row.desconto_valor) : 0,
    descontoPercentual: row.desconto_percentual ? Number(row.desconto_percentual) : 0,
    descontoAutorizadoPor: row.desconto_autorizado_por,
    descontoMotivo: row.desconto_motivo,
    totalLiquido: row.total_liquido ? Number(row.total_liquido) : 0,
    totalPago: row.total_pago ? Number(row.total_pago) : 0,
    troco: row.troco ? Number(row.troco) : 0,
    estoqueBaixado: Boolean(row.estoque_baixado),
    dataFinalizacao: row.data_finalizacao,
    canceladoPor: row.cancelado_por,
    canceladoEm: row.cancelado_em,
    motivoCancelamento: row.motivo_cancelamento,
    observacoes: row.observacoes,
    idempotencyKey: row.idempotency_key,
    itens: Array.isArray(row.pdv_venda_itens) ? row.pdv_venda_itens.map(toCamelItem) : [],
    pagamentos: Array.isArray(row.pdv_pagamentos) ? row.pdv_pagamentos.map(toCamelPagamento) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelItem(row: any): PdvVendaItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    vendaId: row.venda_id,
    produtoId: row.produto_id,
    produtoNome: row.produtos_servicos?.nome,
    quantidade: row.quantidade ? Number(row.quantidade) : 0,
    precoUnitario: row.preco_unitario ? Number(row.preco_unitario) : 0,
    custoUnitario: row.custo_unitario ? Number(row.custo_unitario) : 0,
    desconto: row.desconto ? Number(row.desconto) : 0,
    subtotal: row.subtotal ? Number(row.subtotal) : 0,
    createdAt: row.created_at,
  };
}

function toCamelPagamento(row: any): PdvPagamento {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    vendaId: row.venda_id,
    formaPagamento: row.forma_pagamento,
    valor: row.valor ? Number(row.valor) : 0,
    valorRecebido: row.valor_recebido ? Number(row.valor_recebido) : null,
    troco: row.troco ? Number(row.troco) : 0,
    status: row.status,
    gatewayProvider: row.gateway_provider,
    gatewayPaymentId: row.gateway_payment_id,
    gatewayStatus: row.gateway_status,
    pixQrCode: row.pix_qr_code,
    pixCopyPaste: row.pix_copy_paste,
    caixaMovimentacaoId: row.caixa_movimentacao_id,
    dataConfirmacao: row.data_confirmacao,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const pdvVendasSupabaseService = {
  /**
   * Cria uma venda no PDV com validação de itens, cálculo de totais e política de desconto
   */
  async criarVenda(payload: CriarVendaPayload): Promise<{
    vendaId: string;
    subtotal: number;
    desconto: number;
    totalLiquido: number;
    status: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("criar_pdv_venda", {
      p_turno_id: payload.turnoId,
      p_cliente_id: payload.clienteId || null,
      p_itens: payload.itens,
      p_desconto_valor: payload.descontoValor ?? 0,
      p_desconto_autorizado_por: payload.descontoAutorizadoPor || null,
      p_desconto_motivo: payload.descontoMotivo || null,
      p_observacoes: payload.observacoes || null,
      p_idempotency_key: payload.idempotencyKey || null,
    });

    if (error) {
      console.error("[pdvVendasService] criarVenda error:", error);
      throw new Error(error.message || "Falha ao criar venda no PDV.");
    }

    return {
      vendaId: (data as any).venda_id,
      subtotal: Number((data as any).subtotal),
      desconto: Number((data as any).desconto),
      totalLiquido: Number((data as any).total_liquido),
      status: (data as any).status,
    };
  },

  /**
   * Registra um pagamento (Dinheiro, PIX, Cartões) na venda
   */
  async adicionarPagamento(params: {
    vendaId: string;
    formaPagamento: CaixaFormaPagamento;
    valor: number;
    valorRecebido?: number;
    gatewayPaymentId?: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
    idempotencyKey?: string;
  }): Promise<{
    pagamentoId: string;
    status: string;
    troco: number;
    caixaMovimentacaoId?: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("adicionar_pagamento_pdv", {
      p_venda_id: params.vendaId,
      p_forma_pagamento: params.formaPagamento,
      p_valor: params.valor,
      p_valor_recebido: params.valorRecebido ?? null,
      p_gateway_payment_id: params.gatewayPaymentId || null,
      p_pix_qr_code: params.pixQrCode || null,
      p_pix_copy_paste: params.pixCopyPaste || null,
      p_idempotency_key: params.idempotencyKey || null,
    });

    if (error) {
      console.error("[pdvVendasService] adicionarPagamento error:", error);
      throw new Error(error.message || "Falha ao registrar pagamento.");
    }

    return {
      pagamentoId: (data as any).pagamento_id,
      status: (data as any).status,
      troco: Number((data as any).troco || 0),
      caixaMovimentacaoId: (data as any).caixa_movimentacao_id,
    };
  },

  /**
   * Finaliza a venda e realiza baixa atômica de estoque dos produtos controlados
   */
  async finalizarVenda(vendaId: string): Promise<{
    vendaId: string;
    numeroVenda: number;
    status: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("finalizar_pdv_venda", {
      p_venda_id: vendaId,
    });

    if (error) {
      console.error("[pdvVendasService] finalizarVenda error:", error);
      throw new Error(error.message || "Falha ao finalizar venda.");
    }

    return {
      vendaId: (data as any).venda_id,
      numeroVenda: Number((data as any).numero_venda),
      status: (data as any).status,
    };
  },

  /**
   * Cancela ou estorna uma venda com autorização gerencial e devolução de estoque/caixa
   */
  async cancelarEstornarVenda(
    vendaId: string,
    motivo: string,
    autorizadoPor?: string
  ): Promise<{
    vendaId: string;
    status: string;
    motivo: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("cancelar_estornar_pdv_venda", {
      p_venda_id: vendaId,
      p_motivo: motivo,
      p_autorizado_por: autorizadoPor || null,
    });

    if (error) {
      console.error("[pdvVendasService] cancelarEstornarVenda error:", error);
      throw new Error(error.message || "Falha ao cancelar/estornar venda.");
    }

    return {
      vendaId: (data as any).venda_id,
      status: (data as any).status,
      motivo: (data as any).motivo,
    };
  },

  /**
   * Obtém detalhes completos de uma venda com seus itens e pagamentos
   */
  async getById(vendaId: string): Promise<PdvVenda | null> {
    const { data, error } = await (supabase.from("pdv_vendas") as any)
      .select(`
        *,
        pdv_venda_itens (
          *,
          produtos_servicos ( nome )
        ),
        pdv_pagamentos ( * )
      `)
      .eq("id", vendaId)
      .maybeSingle();

    if (error) {
      console.error("[pdvVendasService] getById error:", error);
      return null;
    }

    return data ? toCamelVenda(data) : null;
  },

  /**
   * Lista vendas de um turno específico
   */
  async getByTurno(turnoId: string): Promise<PdvVenda[]> {
    const { data, error } = await (supabase.from("pdv_vendas") as any)
      .select(`
        *,
        pdv_venda_itens (
          *,
          produtos_servicos ( nome )
        ),
        pdv_pagamentos ( * )
      `)
      .eq("turno_id", turnoId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[pdvVendasService] getByTurno error:", error);
      return [];
    }

    return (data || []).map(toCamelVenda);
  },
};
