# Daily Logs - LegacyFlow

Este arquivo registra as ações diárias feitas no códigobase para consulta rápida.

## 2026-01-31
- 09:10 - Revisão e solução final para geração de PDF: abandonado `html2pdf.js` e `html2canvas` em favor de nova janela + `window.print()` (arquivo alterado: `js/atendimento.js`).
- 09:25 - Inserido cabeçalho dinâmico no relatório (logo + dados da empresa) lendo `configEmpresa` e `configLogomarca` do `localStorage`.
- 09:40 - Criada página `configuracoes.html` com abas Empresa / Logomarca / Contas Bancárias e arquivos associados (`css/configuracoes.css`, `js/configuracoes.js`).
- 10:05 - Habilitação/Desabilitação do botão `Imprimir Orçamento` implementada: desabilitado ao abrir formulário, habilitado após salvar (adicionados logs `console.log`).
- 10:20 - Estilizado botão desabilitado (cinza) em `css/atendimento.css`.
- 10:40 - Removidos campos `Saldo Inicial` e `Data de Abertura` do cadastro de contas em `configuracoes.html` e `js/configuracoes.js`.
- 11:00 - Ajustes de scroll e altura (`height:100vh` e `overflow-y:auto`) para `.right-section` no CSS.
- 11:15 - Adicionados links de menu `Configurações` na sidebar de todas as páginas principais (dashboard, atendimento, clientes, contratos, funcionarios, planos).

## Como usar este arquivo
- Consulte `CHANGELOG.md` para resumo por versão/data.
- Consulte `DAILY_LOGS.md` para passos detalhados e timestamps.

