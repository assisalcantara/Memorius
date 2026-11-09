export interface Cliente {
  id?: string | number;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  sexo: string;
  nomePai?: string;
  nomeMae?: string;
  naturalidade?: string;
  estadoCivil?: string;
  nomeConjuge?: string;
  profissao?: string;
  localTrabalho?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  status: string;
  dataCadastro: string;
  gatewayCustomerId?: string;
  gatewayProvider?: string;
  gatewaySyncAt?: string;
}

export interface Plano {
  id: string | number;
  nome: string;
  diasCarencia?: string | number;
  nMeses?: string | number;
  limiteDependentes?: string | number;
  valorMensal?: string | number;
  descricao?: string;
  coberturaBasica?: string;
  coberturaAdicional?: string;
  status?: string;
  dataCadastro?: string;
}

export interface Funcionario {
  id?: string | number;
  foto?: string; // base64 or file path
  nome: string;
  grupo?: string;
  email?: string;
  cpf: string;
  funcao?: string;
  rg?: string;
  telefoneCelular?: string;
  whatsapp: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  bairro?: string;
  uf?: string;
  dataNascimento?: string;
  dataAdmissao?: string;
  status: string;
  banco?: string;
  agencia?: string;
  contaCorrente?: string;
  pix?: string;
  observacoes?: string;
}

export interface Agregado {
  id?: string | number;
  contratoId: string | number;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  parentesco?: string;
  liberacao?: string;
}

export interface Contrato {
  id?: string | number;
  numeroContrato: string;
  clienteId: string | number;
  clienteNome: string;
  planoId: string | number;
  planoNome: string;
  dataInicio: string;
  status: string;
  agregados?: Agregado[];
}

export interface Mensalidade {
  id?: string | number;
  contratoId: string | number;
  numeroContrato: string;
  clienteNome: string;
  planoNome: string;
  competencia: string; // ex: "06/2026"
  dataVencimento: string;
  valor: string | number;
  status: "EM_ABERTO" | "PAGO" | "CANCELADO";
  dataPagamento?: string;
  valorRecebido?: string | number;
  observacao?: string;
  gatewayProvider?: string;
  gatewayPaymentId?: string;
  gatewayCustomerId?: string;
  gatewayInvoiceUrl?: string;
  gatewayBankSlipUrl?: string;
  gatewayPixQrCode?: string;
  gatewayPixCopyPaste?: string;
  gatewayStatus?: string;
  gatewayMethod?: string;
  gatewayCreatedAt?: string;
  gatewayPaidAt?: string;
}

export interface Atendimento {
  id?: string | number;
  contratoId: string | number;
  clienteNome: string;
  planoNome: string;
  data: string;
  hora: string;
  local: string;
  tipo: "TITULAR" | "DEPENDENTE";
  responsavel: string;
  telefone: string;
  observacoes?: string;
  status: string; // ex: "Aberto", "Finalizado"
  operador: string;
}

export interface EmpresaConfig {
  id?: string;
  tenant_id?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  site?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  logoUrl?: string;
  corPrimaria?: string;
  corSecundaria?: string;
}

export interface AuditLog {
  id?: string;
  tenant_id?: string;
  user_id?: string | null;
  user_name?: string | null;
  role_name?: string | null;
  modulo: string;
  acao: string;
  registro_id?: string | null;
  descricao?: string | null;
  ip?: string | null;
  created_at?: string;
}

export interface Profile {
  id?: string;
  tenant_id?: string | null;
  nome: string | null;
  email: string | null;
  role?: string | null;
  role_id: string | null;
  role_name?: string | null;
  ativo: boolean;
  status: 'ATIVO' | 'INATIVO' | 'CONVIDADO';
  created_at?: string;
}

export interface SaasPlan {
  id: string;
  nome: string;
  descricao?: string;
  valorMensal?: number;
  valorAnual?: number;
  limiteUsuarios?: number;
  limiteClientes?: number;
  limiteContratos?: number;
  limiteStorageMb?: number;
  trialDias?: number;
  ativo: boolean;
  destaque: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadSaas {
  id: string;
  nomeEmpresa: string;
  responsavel?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  uf?: string;
  origem?: string;
  interessePlano?: string;
  observacoes?: string;
  status: 'NOVO' | 'CONTATO_REALIZADO' | 'PROPOSTA_ENVIADA' | 'NEGOCIACAO' | 'FECHADO' | 'PERDIDO';
  createdAt?: string;
  updatedAt?: string;
}

export interface PropostaSaas {
  id: string;
  leadId: string;
  leadNomeEmpresa?: string;
  titulo: string;
  descricao?: string;
  valorProposto?: number;
  planoSaasId?: string;
  planoNome?: string;
  validade?: string;
  status: 'RASCUNHO' | 'ENVIADA' | 'NEGOCIACAO' | 'APROVADA' | 'RECUSADA' | 'EXPIRADA';
  observacoes?: string;
  convertedTenantId?: string;
  convertedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  tenantEmpresa?: string;
  saasPlanId: string;
  saasPlanNome?: string;
  status: 'ATIVO' | 'TRIAL' | 'SUSPENSO' | 'CANCELADO';
  ciclo: 'MENSAL' | 'ANUAL';
  valor: number;
  dataInicio: string;
  dataVencimento: string;
  dataCancelamento?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaaSInvoice {
  id: string;
  subscriptionId?: string | null;
  tenantId: string;
  tenantEmpresa?: string;
  descricao?: string;
  valor: number;
  competencia: string;
  vencimento: string;
  pagamentoEm?: string | null;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  observacoes?: string;
  asaasCustomerId?: string | null;
  asaasPaymentId?: string | null;
  asaasInvoiceUrl?: string | null;
  asaasStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaasGatewayConfig {
  id?: string;
  provider: string;
  ambiente: 'SANDBOX' | 'PRODUCAO';
  apiKey: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractTemplate {
  id?: string;
  tenantId?: string; // We can use camelCase in TS, but wait, the database has tenant_id. Let's support both or match database style. Let's use tenantId and tenant_id, or just what matches standard models in the project.
  tenant_id?: string;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GatewayConfig {
  id?: string;
  tenantId: string;
  provider: string;
  environment: 'SANDBOX' | 'PRODUCAO';
  apiKey: string;
  webhookSecret?: string | null;
  enabled: boolean;
  lastTestAt?: string | null;
  lastTestStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cobranca {
  id?: string;
  tenantId: string;
  mensalidadeId: string;
  clienteId: string;
  gatewayProvider: string;
  gatewayCustomerId?: string | null;
  gatewayPaymentId?: string | null;
  gatewayMethod?: string | null;
  gatewayStatus?: string | null;
  valor: number;
  descricao?: string | null;
  vencimento: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
}

// =========================================================================
// PDV Integrado — Fase 1: Catálogo de Produtos, Serviços e Estoque
// =========================================================================

export type ItemTipo = "PRODUTO" | "SERVICO";
export type CategoriaTipo = "PRODUTO" | "SERVICO" | "AMBOS";
export type MovimentacaoTipo = "ENTRADA" | "SAIDA" | "AJUSTE" | "PERDA" | "DEVOLUCAO";
export type MovimentacaoOrigem = "MANUAL" | "COMPRA" | "PDV_VENDA" | "PDV_CANCELAMENTO" | "ATENDIMENTO_OS" | "INVENTARIO";

export interface ItemCategoria {
  id?: string;
  tenantId: string;
  nome: string;
  descricao?: string;
  tipo: CategoriaTipo;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProdutoServico {
  id?: string;
  tenantId: string;
  categoriaId?: string | null;
  codigo?: string | null;
  codigoBarras?: string | null;
  nome: string;
  descricao?: string | null;
  tipo: ItemTipo;
  unidadeMedida: string;
  precoVenda: number;
  precoCusto: number;
  custoMedio: number;
  controlaEstoque: boolean;
  permiteEstoqueNegativo: boolean;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueMaximo?: number | null;
  ativo: boolean;
  categoriaNome?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstoqueMovimentacao {
  id?: string;
  tenantId: string;
  produtoId: string;
  tipoMovimentacao: MovimentacaoTipo;
  origem: MovimentacaoOrigem;
  quantidade: number;
  custoUnitario: number;
  valorTotal: number;
  saldoAnterior: number;
  saldoPosterior: number;
  documentoRef?: string | null;
  motivo?: string | null;
  idempotencyKey?: string | null;
  operadorId?: string | null;
  operadorNome?: string | null;
  produtoNome?: string;
  createdAt?: string;
}

// =========================================================================
// PDV Integrado — Fase 2: Caixa por Operador e Fechamento Cego
// =========================================================================

export type CaixaTurnoStatus = "ABERTO" | "EM_CONCILIACAO" | "FECHADO";
export type CaixaMovimentacaoTipo = "ABERTURA" | "SUPRIMENTO" | "SANGRIA" | "VENDA" | "ESTORNO";
export type CaixaFormaPagamento = "DINHEIRO" | "PIX" | "CARTAO_DEBITO" | "CARTAO_CREDITO" | "BOLETO" | "OUTROS";

export interface CaixaFisico {
  id?: string;
  tenantId: string;
  nome: string;
  identificadorPdv?: string | null;
  descricao?: string | null;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaixaTurno {
  id?: string;
  tenantId: string;
  caixaId: string;
  operadorId: string;
  status: CaixaTurnoStatus;
  dataAbertura: string;
  fundoTroco: number;
  observacoesAbertura?: string | null;
  dataFechamento?: string | null;
  
  // Declaração do Operador (Fechamento Cego)
  totalDeclaradoDinheiro?: number | null;
  totalDeclaradoPix?: number | null;
  totalDeclaradoCartaoDebito?: number | null;
  totalDeclaradoCartaoCredito?: number | null;
  totalDeclaradoOutros?: number | null;
  totalDeclaradoGeral?: number | null;
  
  // Apuração do Sistema (Apenas gerência ou pós-fechamento)
  totalSistemaDinheiro?: number | null;
  totalSistemaPix?: number | null;
  totalSistemaCartaoDebito?: number | null;
  totalSistemaCartaoCredito?: number | null;
  totalSistemaOutros?: number | null;
  totalSistemaGeral?: number | null;
  
  diferencaDinheiro?: number | null;
  diferencaGeral?: number | null;
  temDivergencia: boolean;
  motivoDivergencia?: string | null;
  
  // Homologação de Supervisor
  supervisorAprovadorId?: string | null;
  supervisorAprovadorNome?: string | null;
  dataAprovacao?: string | null;
  observacoesSupervisor?: string | null;
  
  caixaNome?: string;
  operadorNome?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaixaMovimentacao {
  id?: string;
  tenantId: string;
  turnoId: string;
  tipo: CaixaMovimentacaoTipo;
  formaPagamento: CaixaFormaPagamento;
  valor: number;
  motivo: string;
  documentoRef?: string | null;
  idempotencyKey?: string | null;
  operadorId?: string | null;
  operadorNome?: string | null;
  autorizadorId?: string | null;
  autorizadorNome?: string | null;
  createdAt?: string;
}

export interface FechamentoCegoPayload {
  declaradoDinheiro: number;
  declaradoPix?: number;
  declaradoCartaoDebito?: number;
  declaradoCartaoCredito?: number;
  declaradoOutros?: number;
  motivoDivergencia?: string;
}

export interface FechamentoCegoResult {
  turnoId: string;
  status: CaixaTurnoStatus;
  temDivergencia: boolean;
  diferencaDinheiro: number;
  diferencaGeral: number;
  totalDeclaradoGeral: number;
}

// =========================================================================
// SPRINT 37: VENDAS E PAGAMENTOS DO PDV
// =========================================================================

export type PdvVendaStatus = "ABERTA" | "AGUARDANDO_PAGAMENTO" | "CONCLUIDA" | "CANCELADA";
export type PdvPagamentoStatus = "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "ESTORNADO";

export interface PdvVendaItem {
  id?: string;
  tenantId?: string;
  vendaId?: string;
  produtoId: string;
  produtoNome?: string;
  quantidade: number;
  precoUnitario: number;
  custoUnitario?: number;
  desconto?: number;
  subtotal: number;
  createdAt?: string;
}

export interface PdvPagamento {
  id?: string;
  tenantId?: string;
  vendaId: string;
  formaPagamento: CaixaFormaPagamento;
  valor: number;
  valorRecebido?: number | null;
  troco?: number;
  status: PdvPagamentoStatus;
  gatewayProvider?: string;
  gatewayPaymentId?: string | null;
  gatewayStatus?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  caixaMovimentacaoId?: string | null;
  dataConfirmacao?: string | null;
  idempotencyKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PdvVenda {
  id?: string;
  tenantId: string;
  turnoId: string;
  caixaId: string;
  operadorId: string;
  clienteId?: string | null;
  numeroVenda?: number;
  status: PdvVendaStatus;
  subtotal: number;
  descontoValor: number;
  descontoPercentual?: number;
  descontoAutorizadoPor?: string | null;
  descontoMotivo?: string | null;
  totalLiquido: number;
  totalPago: number;
  troco: number;
  estoqueBaixado: boolean;
  dataFinalizacao?: string | null;
  canceladoPor?: string | null;
  canceladoEm?: string | null;
  motivoCancelamento?: string | null;
  observacoes?: string | null;
  idempotencyKey?: string | null;
  itens?: PdvVendaItem[];
  pagamentos?: PdvPagamento[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CriarVendaPayload {
  turnoId: string;
  clienteId?: string | null;
  itens: {
    produtoId: string;
    quantidade: number;
    desconto?: number;
  }[];
  descontoValor?: number;
  descontoAutorizadoPor?: string | null;
  descontoMotivo?: string | null;
  observacoes?: string | null;
  idempotencyKey?: string | null;
}

// =========================================================================
// SPRINT 38: ORÇAMENTOS FUNERÁRIOS INTEGRADOS
// =========================================================================

export type OrcamentoFunerarioStatus = "RASCUNHO" | "ENVIADO" | "APROVADO" | "REJEITADO" | "CANCELADO";
export type OrcamentoTipoAceite = "PRESENCIAL" | "ELETRONICO_LINK" | "PROCURACAO" | "OUTRO";

export interface OrcamentoFunerarioItem {
  id?: string;
  tenantId?: string;
  orcamentoId?: string;
  produtoId: string;
  produtoNome?: string;
  quantidade: number;
  precoTabela: number;
  itemCobertoPlano: boolean;
  valorCoberto: number;
  valorParticular: number;
  desconto?: number;
  subtotalCliente: number;
  observacao?: string | null;
  createdAt?: string;
}

export interface OrcamentoFunerario {
  id?: string;
  tenantId: string;
  atendimentoId?: string | null;
  clienteId?: string | null;
  contratoId?: string | null;
  numeroOrcamento?: number;
  status: OrcamentoFunerarioStatus;
  
  // Cobertura e Carência
  temCoberturaPlano: boolean;
  planoNome?: string | null;
  diasCarenciaPlano: number;
  diasDesdeAdesao?: number | null;
  emCarencia: boolean;
  
  // Totais Separados
  totalBruto: number;
  totalCoberto: number;
  totalAdicionalParticular: number;
  totalDesconto: number;
  totalLiquidoCliente: number;
  
  descontoAutorizadoPor?: string | null;
  descontoMotivo?: string | null;
  
  // Aceite e Assinatura
  tipoAceite?: OrcamentoTipoAceite | null;
  responsavelAceiteNome?: string | null;
  responsavelAceiteDocumento?: string | null;
  tokenAssinaturaRemota?: string | null;
  dataEnvio?: string | null;
  dataAprovacao?: string | null;
  dataRejeicaoCancelamento?: string | null;
  motivoRejeicaoCancelamento?: string | null;
  
  // Snapshot
  snapshotAprovacao?: any | null;
  aprovadoPor?: string | null;
  
  observacoes?: string | null;
  idempotencyKey?: string | null;
  
  // Relacionamentos expandidos
  itens?: OrcamentoFunerarioItem[];
  clienteNome?: string;
  atendimentoInfo?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CriarOrcamentoPayload {
  atendimentoId?: string | null;
  clienteId?: string | null;
  contratoId?: string | null;
  itens: {
    produtoId: string;
    quantidade: number;
    itemCobertoPlano?: boolean;
    desconto?: number;
    observacao?: string;
  }[];
  descontoValor?: number;
  descontoMotivo?: string | null;
  observacoes?: string | null;
  idempotencyKey?: string | null;
}





