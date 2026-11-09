/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/context/ToastContext";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";
import { contractTemplatesSupabaseService } from "@/services/contract-templates.supabase.service";
import { gatewayConfigSupabaseService } from "@/services/gateway-config.supabase.service";
import { EmpresaConfig, ContractTemplate, GatewayConfig } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalConfirm";
import {
  Settings,
  Building2,
  MapPin,
  Phone,
  Palette,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Trash2,
  Edit,
  Zap,
  Tag,
  Save,
  RotateCcw,
  Mail,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Clock,
} from "@/components/icons/AdminIcons";

type TabType = "DADOS" | "ENDERECO" | "CONTATOS" | "IDENTIDADE" | "CONTRATOS" | "GATEWAY";

interface ExtendedEmpresaConfig extends EmpresaConfig {
  responsavel?: string;
}

export default function ConfiguracoesPage() {
  const { tenant } = useTenant();
  const { roleName } = usePermission();
  const toast = useToast();

  const canEdit = roleName === "ADMIN" || roleName === "GERENTE";
  const [activeTab, setActiveTab] = useState<TabType>("DADOS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [originalData, setOriginalData] = useState<ExtendedEmpresaConfig | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ExtendedEmpresaConfig>({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    celular: "",
    email: "",
    site: "",
    logoUrl: "",
    corPrimaria: "#008C66",
    corSecundaria: "#F5BD22",
    responsavel: "",
  });

  const isDirty = originalData
    ? JSON.stringify(formData) !== JSON.stringify(originalData) || logoFile !== null
    : false;

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await empresaConfigSupabaseService.getConfig();
        if (config) {
          const initial = {
            ...config,
            responsavel: tenant.responsavel || "",
          };
          setFormData(initial);
          setOriginalData(initial);
        } else {
          const initial = {
            razaoSocial: tenant.empresa || "",
            nomeFantasia: tenant.empresa || "",
            cnpj: "",
            logradouro: "",
            numero: "",
            bairro: "",
            cidade: "",
            estado: "",
            cep: "",
            telefone: "",
            celular: "",
            email: "",
            site: "",
            logoUrl: "",
            corPrimaria: "#008C66",
            corSecundaria: "#F5BD22",
            responsavel: tenant.responsavel || "",
          };
          setFormData(initial);
          setOriginalData(initial);
        }
      } catch (err: any) {
        toast.error("Erro ao carregar configurações: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [tenant, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
              toast.success("Endereço preenchido automaticamente pelo CEP.");
            }
          })
          .catch((err) => console.error("Erro ao buscar CEP:", err));
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      let finalLogoUrl = formData.logoUrl;

      if (logoFile && tenant.tenantId) {
        setUploading(true);
        const publicUrl = await empresaConfigSupabaseService.uploadLogo(logoFile, tenant.tenantId);
        if (publicUrl) {
          finalLogoUrl = publicUrl;
        }
        setUploading(false);
      }

      if (tenant.tenantId && formData.responsavel !== originalData?.responsavel) {
        const { supabase } = await import("@/lib/supabase/client");
        await (supabase.from("tenants") as any)
          .update({ responsavel: formData.responsavel })
          .eq("id", tenant.tenantId);
      }

      const configPayload = { ...formData } as any;
      delete configPayload.responsavel;
      const payload = {
        ...configPayload,
        logoUrl: finalLogoUrl,
      };

      const saved = await empresaConfigSupabaseService.saveConfig(payload);
      if (saved) {
        const updated = {
          ...saved,
          responsavel: formData.responsavel,
        };
        setFormData(updated);
        setOriginalData(updated);
        setLogoFile(null);
        toast.success("Configurações salvas com sucesso!");

        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 700);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    const objectUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setFormData((prev) => ({ ...prev, logoUrl: objectUrl }));
    e.target.value = "";

    toast.success("Logomarca carregada. Lembre-se de salvar as alterações para persistir.");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-semibold">Carregando configurações institucionais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: "#F7F9FC", minHeight: "100%", paddingBottom: isDirty ? "110px" : "2.5rem" }}>
      {/* CABEÇALHO INSTITUCIONAL MEMORIUS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 rounded-full bg-[#F5BD22] shrink-0" />
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F0] flex items-center justify-center text-[#008C66] shrink-0 shadow-sm">
            <Settings size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Configurações da Empresa
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Gerencie dados cadastrais, endereço, canais de contato, identidade visual e integrações financeiras.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              type="submit"
              form="config-form"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-98 disabled:opacity-50 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          )}
        </div>
      </div>

      {/* AVISO MODO LEITURA (SE PERFIL RESTRITO) */}
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3 text-xs md:text-sm">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <div>
            <strong>Modo Somente Leitura:</strong> Seu perfil ({roleName}) possui autorização exclusiva para visualização das configurações do tenant.
          </div>
        </div>
      )}

      {/* NAVEGADOR DE ABAS INSTITUCIONAL */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: "DADOS", label: "Dados Gerais", icon: Building2 },
            { id: "ENDERECO", label: "Endereço", icon: MapPin },
            { id: "CONTATOS", label: "Contatos", icon: Phone },
            { id: "IDENTIDADE", label: "Identidade Visual", icon: Palette },
            { id: "CONTRATOS", label: "Modelos de Contratos", icon: FileText },
            { id: "GATEWAY", label: "Gateway ASAAS", icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#008C66] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.9} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === "CONTRATOS" ? (
        <ContractTemplatesTab roleName={roleName} />
      ) : activeTab === "GATEWAY" ? (
        <GatewayConfigTab canEdit={canEdit} />
      ) : (
        <form id="config-form" onSubmit={handleSave}>
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 space-y-6">
            {/* SEÇÃO 1: DADOS GERAIS */}
            {activeTab === "DADOS" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Building2 size={18} className="text-[#008C66]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Dados Corporativos e Cadastrais
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Razão Social *
                    </label>
                    <input
                      name="razaoSocial"
                      value={formData.razaoSocial || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Razão Social completa"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nome Fantasia *
                    </label>
                    <input
                      name="nomeFantasia"
                      value={formData.nomeFantasia || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Nome Fantasia da empresa / funerária"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      CNPJ *
                    </label>
                    <input
                      name="cnpj"
                      value={formData.cnpj || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="00.000.000/0001-00"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nome do Responsável / Titular
                    </label>
                    <input
                      name="responsavel"
                      value={formData.responsavel || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Nome do administrador responsável"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Telefone Principal
                    </label>
                    <input
                      name="telefone"
                      value={formData.telefone || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="(00) 0000-0000"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 2: ENDEREÇO */}
            {activeTab === "ENDERECO" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <MapPin size={18} className="text-[#008C66]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Localização e Endereço Oficial
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="sm:col-span-2 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      CEP (Busca Automática)
                    </label>
                    <input
                      name="cep"
                      value={formData.cep || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Logradouro (Rua / Avenida)
                    </label>
                    <input
                      name="logradouro"
                      value={formData.logradouro || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Rua, Avenida, Praça..."
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Número
                    </label>
                    <input
                      name="numero"
                      value={formData.numero || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Nº ou S/N"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Bairro
                    </label>
                    <input
                      name="bairro"
                      value={formData.bairro || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Bairro"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cidade
                    </label>
                    <input
                      name="cidade"
                      value={formData.cidade || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="Cidade"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Estado (UF)
                    </label>
                    <input
                      name="estado"
                      value={formData.estado || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="UF (Ex: SP)"
                      maxLength={2}
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50 uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 3: CONTATOS */}
            {activeTab === "CONTATOS" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Phone size={18} className="text-[#008C66]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Canais de Comunicação e Atendimento
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Telefone Fixo
                    </label>
                    <input
                      name="telefone"
                      value={formData.telefone || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="(00) 0000-0000"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Celular / WhatsApp
                    </label>
                    <input
                      name="celular"
                      value={formData.celular || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="(00) 90000-0000"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      E-mail Institucional / Comercial
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="contato@funeraria.com.br"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Website Oficial
                    </label>
                    <input
                      name="site"
                      value={formData.site || ""}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      placeholder="www.funeraria.com.br"
                      className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 4: IDENTIDADE VISUAL */}
            {activeTab === "IDENTIDADE" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Palette size={18} className="text-[#008C66]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Identidade Institucional e Cores
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Logomarca */}
                  <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Logomarca da Empresa
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sua logo será aplicada nos cabeçalhos, contratos timbrados e relatórios oficiais.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                      <div className="w-28 h-28 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden">
                        {formData.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={formData.logoUrl}
                            alt="Logo preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-slate-400">
                            <Building2 size={28} className="mx-auto mb-1 opacity-50" />
                            <span className="text-[10px] font-semibold block">Sem Logomarca</span>
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="space-y-2 w-full sm:w-auto">
                          <label
                            htmlFor="logo-file-input"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#008C66] shadow-2xs transition-colors cursor-pointer w-full sm:w-auto"
                          >
                            <Upload size={14} />
                            {formData.logoUrl ? "Trocar Imagem" : "Carregar Logomarca"}
                          </label>
                          <input
                            id="logo-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />

                          {formData.logoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, logoUrl: "" }));
                                setLogoFile(null);
                              }}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer w-full sm:w-auto block"
                            >
                              <Trash2 size={14} />
                              Remover Logo
                            </button>
                          )}

                          {uploading && (
                            <span className="text-xs text-[#008C66] font-semibold block">
                              Enviando arquivo para o servidor...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cores */}
                  <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Cores Primária e Secundária
                    </h4>
                    <p className="text-xs text-slate-500">
                      Personalize a assinatura cromática do seu tenant nos relatórios e documentos.
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <label className="block text-xs font-semibold text-slate-600 mb-2">
                          Cor Primária
                        </label>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            name="corPrimaria"
                            value={formData.corPrimaria || "#008C66"}
                            onChange={handleInputChange}
                            disabled={!canEdit}
                            className="w-9 h-9 rounded-md border-0 p-0 cursor-pointer"
                          />
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {formData.corPrimaria}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <label className="block text-xs font-semibold text-slate-600 mb-2">
                          Cor Secundária
                        </label>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            name="corSecundaria"
                            value={formData.corSecundaria || "#F5BD22"}
                            onChange={handleInputChange}
                            disabled={!canEdit}
                            className="w-9 h-9 rounded-md border-0 p-0 cursor-pointer"
                          />
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {formData.corSecundaria}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview em Tempo Real */}
                  <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200/80 bg-white space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Pré-visualização do Layout com sua Identidade
                    </h4>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
                          style={{ backgroundColor: formData.corPrimaria || "#008C66" }}
                        >
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {formData.nomeFantasia || "Nome da sua Funerária"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Exemplo de cabeçalho timbrado oficial
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold shadow-2xs"
                          style={{
                            backgroundColor: formData.corSecundaria || "#F5BD22",
                            color: "#1E293B",
                          }}
                        >
                          Destaque Dourado
                        </span>
                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                          style={{ backgroundColor: formData.corPrimaria || "#008C66" }}
                        >
                          Botão Ativo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* BARRA FLUTUANTE DE ALTERAÇÕES PENDENTES */}
      {activeTab !== "CONTRATOS" && activeTab !== "GATEWAY" && isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-6 z-50 w-[calc(100%-2rem)] max-w-lg border border-slate-700/80 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#F5BD22] animate-pulse" />
            <span>Existem alterações não salvas.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (originalData) {
                  setFormData(originalData);
                  setLogoFile(null);
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button
              type="submit"
              form="config-form"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              {saving ? "Salvando..." : "Salvar Agora"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   ABA DE MODELOS DE CONTRATOS REFORMULADA (MEMORIUS)
   ========================================================================== */
function ContractTemplatesTab({ roleName }: { roleName: string }) {
  const toast = useToast();
  const canManage = roleName === "ADMIN";

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [ativo, setAtivo] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchTemplates = async () => {
      try {
        const data = await contractTemplatesSupabaseService.getAll();
        if (active) {
          setTemplates(data);
          setLoading(false);
        }
      } catch (e: any) {
        if (active) {
          toast.error("Erro ao carregar modelos: " + e.message);
          setLoading(false);
        }
      }
    };
    fetchTemplates();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (modalOpen) {
      const timer = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = editingTemplate ? editingTemplate.conteudo : "";
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [modalOpen, editingTemplate]);

  const reloadTemplates = async () => {
    setLoading(true);
    try {
      const data = await contractTemplatesSupabaseService.getAll();
      setTemplates(data);
    } catch (e: any) {
      toast.error("Erro ao carregar modelos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    if (!canManage) return;
    setEditingTemplate(null);
    setTitulo("");
    setConteudo("");
    setAtivo(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (template: ContractTemplate) => {
    if (!canManage) return;
    setEditingTemplate(template);
    setTitulo(template.titulo);
    setConteudo(template.conteudo);
    setAtivo(template.ativo);
    setModalOpen(true);
  };

  const handleFormatCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setConteudo(editorRef.current.innerHTML);
    }
  };

  const handleTagClick = (tag: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const node = document.createTextNode(tag);
        range.insertNode(node);

        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);

        setConteudo(editorRef.current.innerHTML);
        return;
      }
    }

    editorRef.current.innerHTML += tag;
    setConteudo(editorRef.current.innerHTML);
  };

  const handleToggleActive = async (template: ContractTemplate) => {
    if (!canManage || !template.id) return;
    try {
      await contractTemplatesSupabaseService.toggleActive(template.id, template.ativo);
      toast.success("Status do modelo atualizado!");
      reloadTemplates();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar status do modelo.");
    }
  };

  const handleDeleteClick = (id: string) => {
    if (!canManage) return;
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      try {
        await contractTemplatesSupabaseService.remove(confirmDeleteId);
        toast.success("Modelo de contrato excluído com sucesso!");
        setConfirmDeleteId(null);
        reloadTemplates();
      } catch (e: any) {
        toast.error(e.message || "Erro ao excluir modelo.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const isConteudoEmpty = !conteudo.replace(/<[^>]*>/g, "").trim();
    if (!titulo.trim() || isConteudoEmpty) {
      toast.error("Título e Conteúdo são obrigatórios.");
      return;
    }

    try {
      if (editingTemplate && editingTemplate.id) {
        await contractTemplatesSupabaseService.update(editingTemplate.id, {
          titulo,
          conteudo,
          ativo,
        });
        toast.success("Modelo de contrato atualizado com sucesso!");
      } else {
        await contractTemplatesSupabaseService.create({
          titulo,
          conteudo,
          ativo,
        });
        toast.success("Modelo de contrato criado com sucesso!");
      }
      setModalOpen(false);
      reloadTemplates();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar modelo de contrato.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[#008C66]" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Modelos de Contratos Parametrizáveis
            </h3>
            <p className="text-xs text-slate-500">
              Minutas contratuais pré-formatadas para impressão e adesão dos clientes.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs hover:brightness-105 transition-all cursor-pointer self-start sm:self-auto"
            style={{
              background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
            }}
          >
            Novo Modelo
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs font-medium">
          Carregando minutas cadastradas...
        </div>
      ) : templates.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Nenhum modelo cadastrado
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Cadastre os termos contratuais para que os atendentes possam emitir contratos assináveis.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs hover:brightness-105 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              Cadastrar Primeiro Modelo
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Título do Modelo</th>
                <th className="py-3 px-4">Situação</th>
                {canManage && <th className="py-3 px-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {template.titulo}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(template)}
                      disabled={!canManage}
                      className="cursor-pointer disabled:cursor-default"
                      title={canManage ? "Alternar status" : undefined}
                    >
                      {template.ativo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inativo
                        </span>
                      )}
                    </button>
                  </td>
                  {canManage && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(template)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-[#008C66] hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                          title="Editar modelo"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(template.id!)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Excluir modelo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE MODELO */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? "Editar Modelo de Contrato" : "Novo Modelo de Contrato"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título do Modelo *
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Contrato Padrão de Prestação de Serviços Funerários"
              required
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Conteúdo da Minuta *
            </label>

            {/* Barra de Formatação Textual */}
            <div className="flex items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-t-lg flex-wrap border-b-0">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("bold")}
                className="w-7 h-7 flex items-center justify-center font-bold text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Negrito"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("italic")}
                className="w-7 h-7 flex items-center justify-center italic text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Itálico"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("underline")}
                className="w-7 h-7 flex items-center justify-center underline text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Sublinhado"
              >
                U
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("justifyLeft")}
                className="px-2 h-7 flex items-center justify-center text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Esquerda"
              >
                Esq
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("justifyCenter")}
                className="px-2 h-7 flex items-center justify-center text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Centro"
              >
                Cent
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("justifyFull")}
                className="px-2 h-7 flex items-center justify-center text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Justificado"
              >
                Just
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatCommand("removeFormat")}
                className="px-2 h-7 flex items-center justify-center text-xs text-rose-600 bg-white border border-slate-200 rounded hover:bg-slate-100"
                title="Limpar formatação"
              >
                Limpar
              </button>
            </div>

            {/* Div Editável */}
            <div
              ref={editorRef}
              contentEditable={canManage}
              onInput={(e) => setConteudo(e.currentTarget.innerHTML)}
              className="min-h-[220px] max-h-[360px] overflow-y-auto p-3.5 bg-white border border-slate-200 rounded-b-lg text-slate-800 text-xs md:text-sm font-serif leading-relaxed text-justify outline-none focus:ring-1 focus:ring-[#008C66]"
            />
          </div>

          {/* Tags Dinâmicas */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">
              Tags Dinâmicas Disponíveis (clique para inserir no cursor):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: "{{nome_cliente}}", desc: "Nome completo do titular" },
                { tag: "{{cpf_cliente}}", desc: "CPF do titular" },
                { tag: "{{numero_contrato}}", desc: "Número do contrato" },
                { tag: "{{plano_nome}}", desc: "Nome do plano" },
                { tag: "{{valor_mensal}}", desc: "Valor da mensalidade" },
                { tag: "{{data_contrato}}", desc: "Data de adesão" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.tag}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTagClick(item.tag)}
                  title={item.desc}
                  className="px-2 py-1 text-[11px] font-mono font-semibold bg-white text-[#008C66] border border-slate-200 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  {item.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs hover:brightness-105 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              {editingTemplate ? "Salvar Alterações" : "Criar Modelo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <ModalConfirm
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Modelo de Contrato"
        message="Tem certeza que deseja excluir esta minuta contratual? Essa ação impedirá que novos contratos sejam impressos com este modelo."
        confirmText="Excluir Modelo"
        variant="danger"
      />
    </div>
  );
}

/* ==========================================================================
   ABA DE GATEWAY ASAAS REFORMULADA (MEMORIUS)
   ========================================================================== */
function GatewayConfigTab({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GatewayConfig | null>(null);

  const [environment, setEnvironment] = useState<"SANDBOX" | "PRODUCAO">("SANDBOX");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testAt, setTestAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadGatewayConfig() {
      try {
        const data = await gatewayConfigSupabaseService.getConfig();
        if (active) {
          if (data) {
            setConfig(data);
            setEnvironment(data.environment);
            setApiKey(data.apiKey || "");
            setWebhookSecret(data.webhookSecret || "");
            setEnabled(data.enabled);
            setTestStatus(data.lastTestStatus || null);
            setTestAt(data.lastTestAt || null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          toast.error("Erro ao carregar configurações do gateway: " + err.message);
          setLoading(false);
        }
      }
    }
    loadGatewayConfig();
    return () => {
      active = false;
    };
  }, [toast]);

  const handleTestConnection = async () => {
    if (testing) return;

    setTesting(true);
    try {
      const { asaasService } = await import("@/services/asaas.service");
      const res = await asaasService.testConnection();

      const statusText = res.success ? "Conectado" : "Falha na conexão";

      const updated = await gatewayConfigSupabaseService.updateTestStatus(statusText);
      if (updated) {
        setConfig(updated);
        setTestStatus(updated.lastTestStatus || null);
        setTestAt(updated.lastTestAt || null);
      }

      if (res.success) {
        toast.success("Gateway ASAAS autenticado com sucesso!");
      } else {
        toast.error(res.error || "Falha na conexão com o ASAAS.");
      }
    } catch (err: any) {
      toast.error("Erro inesperado ao testar conexão: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!apiKey) {
      toast.error("A API Key do ASAAS é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      const saved = await gatewayConfigSupabaseService.saveConfig({
        id: config?.id,
        provider: "ASAAS",
        environment,
        apiKey,
        webhookSecret,
        enabled,
      });

      if (saved) {
        setConfig(saved);
        toast.success("Configuração do gateway salva com sucesso!");
      }
    } catch (err: any) {
      toast.error("Erro ao salvar configuração: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-400 text-xs font-medium">
        Carregando parâmetros do gateway...
      </div>
    );
  }

  const isConnected = testStatus === "Conectado";

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
        <CreditCard size={18} className="text-[#008C66]" />
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Integração Financeira ASAAS (PIX e Boletos)
          </h3>
          <p className="text-xs text-slate-500">
            Parâmetros de comunicação bancária para geração de cobranças e conciliação automática.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Banner Informativo */}
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 flex items-start gap-3 text-xs md:text-sm">
          <ShieldCheck size={18} className="text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>Ambientes e Credenciais de Segurança:</strong>
            <p className="text-xs text-sky-700 leading-relaxed">
              Utilize o ambiente <strong>SANDBOX</strong> para validações sem movimentação bancária real. Selecione <strong>PRODUÇÃO</strong> somente com a API Key definitiva emitida na sua conta corporativa ASAAS.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Provedor Homologado
            </label>
            <input
              value="ASAAS Gateway"
              disabled
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ambiente de Execução *
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "SANDBOX" | "PRODUCAO")}
              disabled={!canEdit}
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50 font-semibold"
            >
              <option value="SANDBOX">SANDBOX (Ambiente de Testes)</option>
              <option value="PRODUCAO">PRODUÇÃO (Conta Real)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              API Key Privada do ASAAS *
            </label>
            <input
              type="password"
              placeholder="Digite a chave secreta da API ASAAS..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!canEdit}
              required
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50 font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Webhook Secret Token (Opcional)
            </label>
            <input
              type="password"
              placeholder="Digite o token de autenticação dos webhooks do ASAAS..."
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              disabled={!canEdit}
              className="w-full text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008C66]/20 focus:border-[#008C66] text-slate-700 bg-white disabled:bg-slate-50 font-mono"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                id="gateway-enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded text-[#008C66] focus:ring-[#008C66]"
              />
              <div>
                <span className="text-xs md:text-sm font-bold text-slate-800 block">
                  Habilitar Emissão Automática de Cobranças
                </span>
                <span className="text-[11px] text-slate-500">
                  Permite a geração de PIX e boletos bancários pelo módulo Financeiro e Cobranças.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Card de Status da Conexão */}
        {testStatus && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs md:text-sm ${
              isConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={20} className="text-rose-600 shrink-0" />
              )}
              <div>
                <div className="font-bold">
                  Status da Conexão: {testStatus} ({environment})
                </div>
                {testAt && (
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Último teste realizado em {new Date(testAt).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            </div>

            {config?.id && (
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Zap size={14} className="text-amber-500" />
                {testing ? "Testando..." : "Testar Novamente"}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {config?.id && !testStatus && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Zap size={14} className="text-amber-500" />
              {testing ? "Testando..." : "Testar Conexão"}
            </button>
          )}

          {canEdit && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold text-white shadow-xs hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
              }}
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
