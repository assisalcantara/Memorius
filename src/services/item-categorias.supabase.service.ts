/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { ItemCategoria } from "@/types";

function toCamel(db: any): ItemCategoria | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    nome: db.nome,
    descricao: db.descricao,
    tipo: db.tipo,
    ativo: db.ativo,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toSnake(ui: Partial<ItemCategoria>): any {
  if (!ui) return null;
  const payload: any = {};
  if (ui.tenantId !== undefined) payload.tenant_id = ui.tenantId;
  if (ui.nome !== undefined) payload.nome = ui.nome.trim();
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.tipo !== undefined) payload.tipo = ui.tipo;
  if (ui.ativo !== undefined) payload.ativo = ui.ativo;
  return payload;
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

export const itemCategoriasSupabaseService = {
  async getAll(): Promise<ItemCategoria[]> {
    const tenantId = getActiveTenantId();
    let query = (supabase.from("item_categorias") as any)
      .select("*")
      .order("nome", { ascending: true });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao listar categorias:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((c: ItemCategoria | null): c is ItemCategoria => c !== null);
  },

  async create(categoria: Partial<ItemCategoria>): Promise<ItemCategoria | null> {
    const tenantId = categoria.tenantId || getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não identificado para criar categoria.");
    }

    const payload = toSnake({ ...categoria, tenantId });
    const { data, error } = await (supabase.from("item_categorias") as any)
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao cadastrar categoria:", error);
      throw error;
    }

    return toCamel(data);
  },

  async update(id: string, categoria: Partial<ItemCategoria>): Promise<ItemCategoria | null> {
    const payload = toSnake(categoria);
    const { data, error } = await (supabase.from("item_categorias") as any)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao atualizar categoria:", error);
      throw error;
    }

    return toCamel(data);
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await (supabase.from("item_categorias") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir categoria:", error);
      throw error;
    }

    return true;
  },
};
