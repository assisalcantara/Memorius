/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import {
  OrcamentoFunerario,
  OrcamentoFunerarioItem,
  CriarOrcamentoPayload,
  OrcamentoTipoAceite,
} from "@/types";

function toCamelOrcamento(row: any): OrcamentoFunerario {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    atendimentoId: row.atendimento_id,
    clienteId: row.cliente_id,
    contratoId: row.contrato_id,
    numeroOrcamento: row.numero_orcamento ? Number(row.numero_orcamento) : undefined,
    status: row.status,
    temCoberturaPlano: Boolean(row.tem_cobertura_plano),
    planoNome: row.plano_nome,
    diasCarenciaPlano: row.dias_carencia_plano ? Number(row.dias_carencia_plano) : 0,
    diasDesdeAdesao: row.dias_desde_adesao !== null ? Number(row.dias_desde_adesao) : null,
    emCarencia: Boolean(row.em_carencia),
    totalBruto: row.total_bruto ? Number(row.total_bruto) : 0,
    totalCoberto: row.total_coberto ? Number(row.total_coberto) : 0,
    totalAdicionalParticular: row.total_adicional_particular ? Number(row.total_adicional_particular) : 0,
    totalDesconto: row.total_desconto ? Number(row.total_desconto) : 0,
    totalLiquidoCliente: row.total_liquido_cliente ? Number(row.total_liquido_cliente) : 0,
    descontoAutorizadoPor: row.desconto_autorizado_por,
    descontoMotivo: row.desconto_motivo,
    tipoAceite: row.tipo_aceite,
    responsavelAceiteNome: row.responsavel_aceite_nome,
    responsavelAceiteDocumento: row.responsavel_aceite_documento,
    tokenAssinaturaRemota: row.token_assinatura_remota,
    dataEnvio: row.data_envio,
    dataAprovacao: row.data_aprovacao,
    dataRejeicaoCancelamento: row.data_rejeicao_cancelamento,
    motivoRejeicaoCancelamento: row.motivo_rejeicao_cancelamento,
    snapshotAprovacao: row.snapshot_aprovacao,
    aprovadoPor: row.aprovado_por,
    observacoes: row.observacoes,
    idempotencyKey: row.idempotency_key,
    itens: Array.isArray(row.orcamento_funerario_itens) ? row.orcamento_funerario_itens.map(toCamelItem) : [],
    clienteNome: row.clientes?.nome,
    atendimentoInfo: row.atendimentos,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelItem(row: any): OrcamentoFunerarioItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orcamentoId: row.orcamento_id,
    produtoId: row.produto_id,
    produtoNome: row.produtos_servicos?.nome,
    quantidade: row.quantidade ? Number(row.quantidade) : 0,
    precoTabela: row.preco_tabela ? Number(row.preco_tabela) : 0,
    itemCobertoPlano: Boolean(row.item_coberto_plano),
    valorCoberto: row.valor_coberto ? Number(row.valor_coberto) : 0,
    valorParticular: row.valor_particular ? Number(row.valor_particular) : 0,
    desconto: row.desconto ? Number(row.desconto) : 0,
    subtotalCliente: row.subtotal_cliente ? Number(row.subtotal_cliente) : 0,
    observacao: row.observacao,
    createdAt: row.created_at,
  };
}

export const orcamentosFunerariosSupabaseService = {
  /**
   * Cria um orçamento funerário avaliando carência e cobertura contratual
   */
  async criarOrcamento(payload: CriarOrcamentoPayload): Promise<{
    orcamentoId: string;
    status: string;
    temCoberturaPlano: boolean;
    emCarencia: boolean;
    totalBruto: number;
    totalCoberto: number;
    totalParticular: number;
    totalDesconto: number;
    totalLiquidoCliente: number;
  }> {
    const { data, error } = await (supabase.rpc as any)("criar_orcamento_funerario", {
      p_atendimento_id: payload.atendimentoId || null,
      p_cliente_id: payload.clienteId || null,
      p_contrato_id: payload.contratoId || null,
      p_itens: payload.itens,
      p_desconto_valor: payload.descontoValor ?? 0,
      p_desconto_motivo: payload.descontoMotivo || null,
      p_observacoes: payload.observacoes || null,
      p_idempotency_key: payload.idempotencyKey || null,
    });

    if (error) {
      console.error("[orcamentosService] criarOrcamento error:", error);
      throw new Error(error.message || "Falha ao gerar orçamento funerário.");
    }

    return {
      orcamentoId: (data as any).orcamento_id,
      status: (data as any).status,
      temCoberturaPlano: Boolean((data as any).tem_cobertura_plano),
      emCarencia: Boolean((data as any).em_carencia),
      totalBruto: Number((data as any).total_bruto),
      totalCoberto: Number((data as any).total_coberto),
      totalParticular: Number((data as any).total_particular),
      totalDesconto: Number((data as any).total_desconto),
      totalLiquidoCliente: Number((data as any).total_liquido_cliente),
    };
  },

  /**
   * Envia o orçamento e gera token para aceite presencial ou assinatura remota por link
   */
  async enviarOrcamento(params: {
    orcamentoId: string;
    tipoAceite?: OrcamentoTipoAceite;
    responsavelNome?: string;
    responsavelDocumento?: string;
  }): Promise<{
    orcamentoId: string;
    status: string;
    tokenAssinatura: string;
    tipoAceite: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("enviar_orcamento_funerario", {
      p_orcamento_id: params.orcamentoId,
      p_tipo_aceite: params.tipoAceite || "PRESENCIAL",
      p_responsavel_nome: params.responsavelNome || null,
      p_responsavel_documento: params.responsavelDocumento || null,
    });

    if (error) {
      console.error("[orcamentosService] enviarOrcamento error:", error);
      throw new Error(error.message || "Falha ao enviar orçamento funerário.");
    }

    return {
      orcamentoId: (data as any).orcamento_id,
      status: (data as any).status,
      tokenAssinatura: (data as any).token_assinatura,
      tipoAceite: (data as any).tipo_aceite,
    };
  },

  /**
   * Aprova formalmente o orçamento e congela snapshot imutável dos itens e valores
   */
  async aprovarOrcamento(params: {
    orcamentoId: string;
    responsavelNome: string;
    responsavelDocumento: string;
    tipoAceite?: OrcamentoTipoAceite;
  }): Promise<{
    orcamentoId: string;
    status: string;
    totalLiquidoCliente: number;
    dataAprovacao: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("aprovar_orcamento_funerario", {
      p_orcamento_id: params.orcamentoId,
      p_responsavel_aceite_nome: params.responsavelNome,
      p_responsavel_aceite_documento: params.responsavelDocumento,
      p_tipo_aceite: params.tipoAceite || "PRESENCIAL",
    });

    if (error) {
      console.error("[orcamentosService] aprovarOrcamento error:", error);
      throw new Error(error.message || "Falha ao aprovar orçamento funerário.");
    }

    return {
      orcamentoId: (data as any).orcamento_id,
      status: (data as any).status,
      totalLiquidoCliente: Number((data as any).total_liquido_cliente),
      dataAprovacao: (data as any).data_aprovacao,
    };
  },

  /**
   * Rejeita ou cancela o orçamento com justificativa auditável
   */
  async rejeitarCancelarOrcamento(
    orcamentoId: string,
    novoStatus: "REJEITADO" | "CANCELADO",
    motivo: string
  ): Promise<{
    orcamentoId: string;
    status: string;
    motivo: string;
  }> {
    const { data, error } = await (supabase.rpc as any)("rejeitar_cancelar_orcamento_funerario", {
      p_orcamento_id: orcamentoId,
      p_novo_status: novoStatus,
      p_motivo: motivo,
    });

    if (error) {
      console.error("[orcamentosService] rejeitarCancelarOrcamento error:", error);
      throw new Error(error.message || "Falha ao atualizar orçamento funerário.");
    }

    return {
      orcamentoId: (data as any).orcamento_id,
      status: (data as any).status,
      motivo: (data as any).motivo,
    };
  },

  /**
   * Obtém detalhes de um orçamento funerário com seus itens e dados relacionados
   */
  async getById(orcamentoId: string): Promise<OrcamentoFunerario | null> {
    const { data, error } = await (supabase.from("orcamentos_funerarios") as any)
      .select(`
        *,
        clientes:cliente_id (nome, cpf, telefone),
        atendimentos:atendimento_id (id, cliente_nome, tipo, responsavel, local),
        orcamento_funerario_itens (
          *,
          produtos_servicos (nome, tipo, codigo)
        )
      `)
      .eq("id", orcamentoId)
      .maybeSingle();

    if (error) {
      console.error("[orcamentosService] getById error:", error);
      return null;
    }

    return data ? toCamelOrcamento(data) : null;
  },

  /**
   * Lista orçamentos de um atendimento específico
   */
  async getByAtendimento(atendimentoId: string): Promise<OrcamentoFunerario[]> {
    const { data, error } = await (supabase.from("orcamentos_funerarios") as any)
      .select(`
        *,
        clientes:cliente_id (nome),
        orcamento_funerario_itens (
          *,
          produtos_servicos (nome)
        )
      `)
      .eq("atendimento_id", atendimentoId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[orcamentosService] getByAtendimento error:", error);
      return [];
    }

    return (data || []).map(toCamelOrcamento);
  },
};
