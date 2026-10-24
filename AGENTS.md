# Instruções para agentes — SOMA Conecta

Siga a guideline abaixo **sempre que for feita uma implementação** neste projeto.

# Guideline — Eficiência de Tokens e Implementações Complexas

## Objetivo
Minimizar o consumo de tokens durante atividades de desenvolvimento, preservando a qualidade, segurança e correção das implementações.

## Regras obrigatórias

1. **Análise direcionada:** localize os componentes relacionados à tarefa antes de ler arquivos. Evite explorar o projeto inteiro sem necessidade.

2. **Contexto mínimo:** utilize somente arquivos, métodos e dependências relevantes para a implementação.

3. **Planejamento objetivo:** para tarefas complexas, defina um plano curto e execute as etapas sem repetir análises já concluídas.

4. **RTK (Rust Token Killer):** utilize o RTK para reduzir a saída de comandos executados no terminal, sempre que estiver instalado e o comando for compatível. Priorize sua utilização em operações Git, buscas, testes, builds e análise de logs. Preserve mensagens de erro e informações essenciais para diagnóstico.

5. **Caveman:** aplique o Caveman como estratégia de comunicação e execução concisa, utilizando instruções diretas, respostas mínimas e evitando explicações desnecessárias. Caso exista uma ferramenta ou configuração específica chamada Caveman no ambiente, utilize-a conforme sua documentação.

6. **Uso combinado de RTK e Caveman:** durante implementações pesadas, utilize ambos de forma complementar:
   - RTK para compactar saídas de ferramentas e comandos.
   - Caveman para reduzir a verbosidade das interações e manter o foco na execução.
   - Evite sacrificar informações críticas apenas para economizar tokens.

7. **Leituras eficientes:** não releia arquivos já analisados, exceto quando houver alterações relevantes.

8. **Implementação incremental:** divida funcionalidades complexas em etapas menores e independentes quando possível.

9. **Alterações mínimas:** não realize refatorações ou modificações fora do escopo solicitado.

10. **Validação direcionada:** execute inicialmente testes específicos e amplie a cobertura conforme o impacto da alteração.

11. **Gerenciamento de contexto:** mantenha resumos compactos das decisões, arquivos modificados e pendências durante tarefas extensas.

12. **Respostas objetivas:** evite reproduzir códigos completos, explicações extensas e resumos repetitivos.

## Fluxo obrigatório

**Localizar → Planejar → Implementar → Validar → Resumir**

Durante todas as etapas, priorize RTK para otimização das saídas do terminal e Caveman para comunicação concisa, quando disponíveis e aplicáveis.

## Formato da resposta final

- **Arquivos alterados:** relação objetiva.
- **Implementação:** resumo das alterações.
- **Validação:** testes realizados e resultados.
- **Pendências:** somente questões não resolvidas.

## Princípio fundamental

Consuma o mínimo de tokens necessário para realizar a implementação corretamente. Utilize RTK e Caveman como recursos de otimização, sem comprometer a qualidade, a segurança ou a confiabilidade do código.
