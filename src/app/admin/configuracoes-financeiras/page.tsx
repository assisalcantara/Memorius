"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { asaasSaasService } from "@/services/asaas-saas.service";
import { useToast } from "@/context/ToastContext";
import { SaasGatewayConfig } from "@/types";

export default function FinanceConfigsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [ambiente, setAmbiente] = useState<"SANDBOX" | "PRODUCAO">("SANDBOX");
  const [apiKey, setApiKey] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [savedConfig, setSavedConfig] = useState<SaasGatewayConfig | null>(null);

  // Webhook URL display
  const webhookBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${webhookBaseUrl}/api/webhooks/asaas?token=********`;

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await asaasSaasService.getConfig();
        if (config) {
          setSavedConfig(config);
          setAmbiente(config.ambiente);
          setApiKey(config.apiKey);
          setAtivo(config.ativo);
        }
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(`Erro ao carregar configurações: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("A API Key ASAAS é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      await asaasSaasService.saveConfig({
        provider: "ASAAS",
        ambiente,
        apiKey,
        ativo
      });
      toast.success("Configuração do ASAAS salva com sucesso!");
      
      // Reload config
      const updated = await asaasSaasService.getConfig();
      if (updated) {
        setSavedConfig(updated);
        setApiKey(updated.apiKey);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("Insira a API Key para testar.");
      return;
    }

    setTesting(true);
    try {
      const result = await asaasSaasService.testConnection(ambiente, apiKey);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Erro ao testar conexão: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        Carregando configurações...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "800px" }}>
      <PageTitle title="Configurações Financeiras" icon="⚙️" />

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <Card title="Integração ASAAS SaaS" icon="💳">
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155" }}>
                Ambiente de Execução
              </label>
              <select
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value as "SANDBOX" | "PRODUCAO")}
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  background: "white",
                  width: "100%"
                }}
              >
                <option value="SANDBOX">Sandbox (Homologação / Testes)</option>
                <option value="PRODUCAO">Produção (Operações Reais)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155" }}>
                API Key ASAAS
              </label>
              <input
                type="text"
                placeholder={savedConfig?.apiKey ? "Preservar chave salva atual" : "Insira o token de API da sua conta ASAAS"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  width: "100%"
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Nunca exposta no frontend. Se você carregar e apenas salvar sem modificar a chave mascarada, a chave atual salva no banco de dados será mantida intacta.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
              />
              <label htmlFor="ativo" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                Gateway Ativo (Habilitado para gerar cobranças)
              </label>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? "Testando..." : "Testar Conexão"}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Webhook de Baixa Automática" icon="🔗">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5 }}>
              Configure o webhook abaixo no painel administrativo do seu ASAAS para permitir que as faturas SaaS do LegacyFlow sejam marcadas automaticamente como pagas, vencidas ou canceladas em tempo real.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155" }}>
                URL de Envio do Webhook
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    background: "#f1f5f9",
                    color: "#475569",
                    flex: 1
                  }}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("Webhook copiado!");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.85rem",
              color: "#475569",
              lineHeight: 1.6
            }}>
              <strong>Instruções de Configuração no ASAAS:</strong>
              <ol style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li>Acesse o menu Configurações &gt; Integrações no painel do ASAAS.</li>
                <li>Configure a URL do webhook apontando para o endereço acima.</li>
                <li>Defina o Token do webhook para bater com a variável <code>ASAAS_WEBHOOK_TOKEN</code> do seu arquivo <code>.env.local</code>.</li>
                <li>Ative os eventos: <code>Faturamento Criado</code>, <code>Faturamento Recebido</code>, <code>Faturamento Vencido</code>, <code>Faturamento Removido</code>.</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
