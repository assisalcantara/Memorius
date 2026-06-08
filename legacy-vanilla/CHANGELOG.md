# Changelog

Todas as alterações importantes do projeto LegacyFlow.

## [Unreleased]

### 2026-01-31
- Feito: Substituição da geração de PDF baseada em bibliotecas por uma geração nativa via nova janela HTML + `window.print()`.
- Feito: Inserção de cabeçalho dinâmico no relatório de atendimento (logo + dados da empresa), puxando `configEmpresa` e `configLogomarca` do `localStorage`.
- Feito: Criada página de `Configurações` (`configuracoes.html`) com abas Empresa / Logomarca / Contas Bancárias.
- Feito: Criados `css/configuracoes.css` e `js/configuracoes.js` com persistência em localStorage.
- Feito: Botão `Imprimir Orçamento` passa a iniciar desabilitado e é habilitado apenas após salvar atendimento.
- Feito: Estilo do botão desabilitado atualizado (cinza) em `css/atendimento.css`.
- Feito: Removidos campos `Saldo Inicial` e `Data de Abertura` do cadastro de contas.
- Feito: Ajustes de layout e scroll na `right-section` (100vh + overflow-y).
- Feito: Logs de debug adicionados para facilitar diagnóstico.

### 2026-01-27
- (resumo das implementações anteriores...)


## Notas
- A mudança para `window.print()` resolve problemas de PDFs em branco e paginação duplicada.
- Testes recomendados: Chrome/Edge/Firefox para garantir consistência de impressão.
