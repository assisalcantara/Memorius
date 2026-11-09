/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { ProdutoServico, EstoqueMovimentacao } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamelProduto(db: any): ProdutoServico | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    categoriaId: db.categoria_id,
    codigo: db.codigo,
    codigoBarras: db.codigo_barras,
    nome: db.nome,
    descricao: db.descricao,
    tipo: db.tipo,
    unidadeMedida: db.unidade_medida || "UN",
    precoVenda: db.preco_venda ? Number(db.preco_venda) : 0,
    precoCusto: db.preco_custo ? Number(db.preco_custo) : 0,
    custoMedio: db.custo_medio ? Number(db.custo_medio) : 0,
    controlaEstoque: db.controla_estoque ?? true,
    permiteEstoqueNegativo: db.permite_estoque_negativo ?? false,
    estoqueAtual: db.estoque_atual ? Number(db.estoque_atual) : 0,
    estoqueMinimo: db.estoque_minimo ? Number(db.estoque_minimo) : 0,
    estoqueMaximo: db.estoque_maximo ? Number(db.estoque_maximo) : null,
    ativo: db.ativo ?? true,
    categoriaNome: db.item_categorias?.nome,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toSnakeProduto(ui: Partial<ProdutoServico>, isUpdate = false): any {
  if (!ui) return null;
  const payload: any = {};
  if (ui.tenantId !== undefined) payload.tenant_id = ui.tenantId;
  if (ui.categoriaId !== undefined) payload.categoria_id = ui.categoriaId || null;
  if (ui.codigo !== undefined) payload.codigo = ui.codigo?.trim() || null;
  if (ui.codigoBarras !== undefined) payload.codigo_barras = ui.codigoBarras?.trim() || null;
  if (ui.nome !== undefined) payload.nome = ui.nome.trim();
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.tipo !== undefined) payload.tipo = ui.tipo;
  if (ui.unidadeMedida !== undefined) payload.unidade_medida = ui.unidadeMedida;
  if (ui.precoVenda !== undefined) payload.preco_venda = Number(ui.precoVenda);
  if (ui.precoCusto !== undefined) payload.preco_custo = Number(ui.precoCusto);
  if (ui.controlaEstoque !== undefined) payload.controla_estoque = ui.controlaEstoque;
  if (ui.permiteEstoqueNegativo !== undefined) payload.permite_estoque_negativo = ui.permiteEstoqueNegativo;
  if (ui.estoqueMinimo !== undefined) payload.estoque_minimo = Number(ui.estoqueMinimo);
  if (ui.estoqueMaximo !== undefined) payload.estoque_maximo = ui.estoqueMaximo ? Number(ui.estoqueMaximo) : null;
  if (ui.ativo !== undefined) payload.ativo = ui.ativo;

  // No INSERT inicial, permite definir estoque_atual e custo_medio inicial
  // No UPDATE, esses campos são bloqueados e gerenciados exclusivamente pelo Kardex / Trigger
  if (!isUpdate) {
    if (ui.custoMedio !== undefined) payload.custo_medio = Number(ui.custoMedio);
    if (ui.estoqueAtual !== undefined) payload.estoque_atual = Number(ui.estoqueAtual);
  }

  return payload;
}

function toCamelMovimentacao(db: any): EstoqueMovimentacao | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    produtoId: db.produto_id,
    tipoMovimentacao: db.tipo_movimentacao,
    origem: db.origem,
    quantidade: db.quantidade ? Number(db.quantidade) : 0,
    custoUnitario: db.custo_unitario ? Number(db.custo_unitario) : 0,
    valorTotal: db.valor_total ? Number(db.valor_total) : 0,
    saldoAnterior: db.saldo_anterior ? Number(db.saldo_anterior) : 0,
    saldoPosterior: db.saldo_posterior ? Number(db.saldo_posterior) : 0,
    documentoRef: db.documento_ref,
    motivo: db.motivo,
    idempotencyKey: db.idempotency_key,
    operadorId: db.operador_id,
    operadorNome: db.operador_nome,
    produtoNome: db.produtos_servicos?.nome,
    createdAt: db.created_at,
  };
}

function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storedUser = window.localStorage.getItem("legacyflow_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.tenant_id || null;
    }
  } catch {}
  return null;
}

function getActiveUser(): { id?: string; nome?: string } {
  if (typeof window === "undefined") return {};
  try {
    const storedUser = window.localStorage.getItem("legacyflow_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return { id: user.id, nome: user.nome || user.email };
    }
  } catch {}
  return {};
}

export const produtosEstoqueSupabaseService = {
  async getAll(): Promise<ProdutoServico[]> {
    const tenantId = getActiveTenantId();
    let query = (supabase.from("produtos_servicos") as any)
      .select("*, item_categorias(nome)")
      .order("nome", { ascending: true });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao listar produtos e serviços:", error);
      return [];
    }

    return (data || []).map(toCamelProduto).filter((p: ProdutoServico | null): p is ProdutoServico => p !== null);
  },

  async getById(id: string): Promise<ProdutoServico | null> {
    const { data, error } = await (supabase.from("produtos_servicos") as any)
      .select("*, item_categorias(nome)")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return toCamelProduto(data);
  },

  async findByBarcodeOrCode(term: string): Promise<ProdutoServico | null> {
    const tenantId = getActiveTenantId();
    const cleanTerm = term.trim();
    if (!cleanTerm) return null;

    let query = (supabase.from("produtos_servicos") as any)
      .select("*, item_categorias(nome)")
      .eq("ativo", true)
      .or(`codigo_barras.eq.${cleanTerm},codigo.eq.${cleanTerm}`);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return toCamelProduto(data);
  },

  async create(produto: Partial<ProdutoServico>): Promise<ProdutoServico | null> {
    const tenantId = produto.tenantId || getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não identificado para criar produto.");
    }

    const payload = toSnakeProduto({ ...produto, tenantId });
    const { data, error } = await (supabase.from("produtos_servicos") as any)
      .insert([payload])
      .select("*, item_categorias(nome)")
      .single();

    if (error) {
      console.error("Erro ao cadastrar produto/serviço:", error);
      throw error;
    }

    const created = toCamelProduto(data);
    if (created?.id) {
      await auditLogSupabaseService.logActivity(
        "PRODUTOS_ESTOQUE",
        "CREATE_PRODUTO",
        created.id,
        `Cadastrado ${created.tipo}: ${created.nome} (Preço: R$ ${created.precoVenda})`
      );
    }

    return created;
  },

  async update(id: string, produto: Partial<ProdutoServico>): Promise<ProdutoServico | null> {
    const payload = toSnakeProduto(produto, true);
    const { data, error } = await (supabase.from("produtos_servicos") as any)
      .update(payload)
      .eq("id", id)
      .select("*, item_categorias(nome)")
      .single();

    if (error) {
      console.error("Erro ao atualizar produto/serviço:", error);
      throw error;
    }

    const updated = toCamelProduto(data);
    if (updated?.id) {
      await auditLogSupabaseService.logActivity(
        "PRODUTOS_ESTOQUE",
        "UPDATE_PRODUTO",
        updated.id,
        `Atualizado ${updated.tipo}: ${updated.nome}`
      );
    }

    return updated;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await (supabase.from("produtos_servicos") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir produto/serviço:", error);
      throw error;
    }

    return true;
  },

  // =========================================================================
  // MOVIMENTAÇÕES DE ESTOQUE (ENTRADA, SAÍDA, AJUSTE, INVENTÁRIO)
  // =========================================================================

  async registrarMovimentacao(mov: {
    produtoId: string;
    tipoMovimentacao: "ENTRADA" | "SAIDA" | "AJUSTE" | "PERDA" | "DEVOLUCAO";
    origem?: "MANUAL" | "COMPRA" | "PDV_VENDA" | "PDV_CANCELAMENTO" | "ATENDIMENTO_OS" | "INVENTARIO";
    quantidade: number;
    custoUnitario?: number;
    documentoRef?: string;
    motivo?: string;
    idempotencyKey?: string;
  }): Promise<EstoqueMovimentacao | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não identificado para registrar movimentação de estoque.");
    }

    const user = getActiveUser();
    const custoUnitario = mov.custoUnitario ? Number(mov.custoUnitario) : 0;
    const valorTotal = Number((mov.quantidade * custoUnitario).toFixed(2));

    const payload = {
      tenant_id: tenantId,
      produto_id: mov.produtoId,
      tipo_movimentacao: mov.tipoMovimentacao,
      origem: mov.origem || "MANUAL",
      quantidade: Number(mov.quantidade),
      custo_unitario: custoUnitario,
      valor_total: valorTotal,
      documento_ref: mov.documentoRef || null,
      motivo: mov.motivo || null,
      idempotency_key: mov.idempotencyKey || null,
      operador_id: user.id || null,
      operador_nome: user.nome || null,
    };

    const { data, error } = await (supabase.from("estoque_movimentacoes") as any)
      .insert([payload])
      .select("*, produtos_servicos(nome)")
      .single();

    if (error) {
      console.error("Erro ao registrar movimentação de estoque:", error);
      throw error;
    }

    const created = toCamelMovimentacao(data);
    if (created?.id) {
      await auditLogSupabaseService.logActivity(
        "ESTOQUE",
        `MOV_${mov.tipoMovimentacao}`,
        created.id,
        `${mov.tipoMovimentacao} de ${mov.quantidade} un no produto ID: ${mov.produtoId}. Saldo resultante: ${created.saldoPosterior}`
      );
    }

    return created;
  },

  async getMovimentacoesByProduto(produtoId: string): Promise<EstoqueMovimentacao[]> {
    const { data, error } = await (supabase.from("estoque_movimentacoes") as any)
      .select("*, produtos_servicos(nome)")
      .eq("produto_id", produtoId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar movimentações do produto:", error);
      return [];
    }

    return (data || []).map(toCamelMovimentacao).filter((m: EstoqueMovimentacao | null): m is EstoqueMovimentacao => m !== null);
  },

  async getExtratoMovimentacoes(limit = 100): Promise<EstoqueMovimentacao[]> {
    const tenantId = getActiveTenantId();
    let query = (supabase.from("estoque_movimentacoes") as any)
      .select("*, produtos_servicos(nome)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar extrato de movimentações:", error);
      return [];
    }

    return (data || []).map(toCamelMovimentacao).filter((m: EstoqueMovimentacao | null): m is EstoqueMovimentacao => m !== null);
  },
};
