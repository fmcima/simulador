import React from 'react';
import { BookOpen } from 'lucide-react';

const ReferencesTable = () => {
    const data = [
        {
            category: "Regime Fiscal",
            concept: "Regime de Concessão",
            implementation: "Royalties (até 10%) + Participação Especial (calculada sobre receita líquida trimestral progressiva).",
            source: "Lei nº 9.478/1997 (Lei do Petróleo); Decreto nº 2.705/1998 (Cálculo de Royalties e PE)."
        },
        {
            category: "Regime Fiscal",
            concept: "Regime de Partilha",
            implementation: "Royalties (15%) + Custo em Óleo (limite) + Partilha do Excedente em Óleo (Profit Oil) com a União.",
            source: "Lei nº 12.351/2010 (Regime de Partilha de Produção no Polígono do Pré-Sal e áreas estratégicas)."
        },
        {
            category: "Regime Fiscal",
            concept: "Cessão Onerosa",
            implementation: "Royalties (10%) + IRPJ/CSLL. Não há PE nem Partilha de Óleo na modelagem simplificada original, mas volumes excedentes entram em Partilha.",
            source: "Lei nº 12.276/2010 (Cessão Onerosa da União à Petrobras)."
        },
        {
            category: "Incentivos",
            concept: "Repetro-Sped",
            implementation: "Suspensão/Isenção de tributos federais (II, IPI, PIS, COFINS) na importação de bens. Reduz a carga tributária efetiva do CAPEX.",
            source: "Lei nº 13.586/2017; IN RFB nº 1.781/2017 (Regulamentação do Repetro-Sped)."
        },
        {
            category: "Tributos Corporativos",
            concept: "IRPJ + CSLL",
            implementation: "Alíquota combinada padrão de 34% (25% IRPJ + 9% CSLL) sobre o Lucro Real.",
            source: "Lei nº 9.249/1995 (IRPJ/CSLL); Leis subsequentes definindo alíquotas."
        },
        {
            category: "Tributos Corporativos",
            concept: "Prejuízo Fiscal (Tax Loss Carryforward)",
            implementation: "Acumulação de prejuízos para compensação em lucros futuros, limitado a 30% do lucro tributável do ano.",
            source: "Lei nº 8.981/1995 (Art. 42 / Art. 58); Lei nº 9.065/1995 (Trava de 30%)."
        },
        {
            category: "Depreciação",
            concept: "Depreciação Acelerada",
            implementation: "Depreciação integral ou acelerada para bens incentivados (efeito diferimento fiscal).",
            source: "Lei nº 13.586/2017 (Art. 1º, § 5º); IN RFB 1700/2017."
        },
        {
            category: "Depreciação",
            concept: "Método Linear / UOP",
            implementation: "Depreciação linear (5-10 anos) ou por Unidades Produzidas (UOP).",
            source: "Práticas Contábeis BR GAAP / IFRS (CPC 27) e Regulamento do Imposto de Renda (RIR/2018)."
        },
        {
            category: "Curvas de Produção",
            concept: "Pré-Sal (Offshore)",
            implementation: "Alta produtividade, ramp-up rápido, platô estendido (~4 anos), declínio moderado (8-10%).",
            source: "Modelagem Típica (Engenharia de Reservatórios) baseada em campos análogos (Tupi, Búzios). Fonte: Dados públicos da ANP."
        },
        {
            category: "Curvas de Produção",
            concept: "Pós-Sal (Offshore)",
            implementation: "Produtividade média, declínio mais acentuado (~12%) devido à maturidade.",
            source: "Modelagem Típica baseada em históricos da Bacia de Campos (Marlim, Roncador). Fonte: Dados públicos da ANP / Boletins de Produção."
        },
        {
            category: "Curvas de Produção",
            concept: "Onshore",
            implementation: "Volumes menores, ramp-up curto, vida útil longa com declínio lento (~6%).",
            source: "Modelagem Típica baseada em campos terrestres (Bacias Potiguar, Recôncavo). Fonte: Dados públicos da ANP."
        },
        {
            category: "Custos Operacionais (OPEX)",
            concept: "OPEX Fixo",
            implementation: "Custo anual de aluguel de sonda, pessoal, logística e manutenção de rotina. Representa ~90% do OPEX em projetos de alta complexidade offshore.",
            source: "Benchmarking de Projetos Offshore (Bacia de Santos/Campos). Relatórios de Operadoras (Petrobras, Equinor)."
        },
        {
            category: "Custos Operacionais (OPEX)",
            concept: "OPEX Variável",
            implementation: "Custos consumíveis (químicos, tratamento de água, energia) estimados por barril produzido.",
            source: "Relatórios de Consultorias Especializadas (ex: Wood Mackenzie, Rystad Energy, S&P Global) para FPSOs em águas ultra-profundas."
        },
        {
            category: "Custos Operacionais (OPEX)",
            concept: "Workover",
            implementation: "Provisão anual para intervenção pesada em poços e sistemas submarinos.",
            source: "Boletins de Mercado de Sondas (ex: Bassoe Offshore, Fearnleys) e Histórico de Operações na Bacia de Campos."
        },
        {
            category: "Estimativa de CAPEX",
            concept: "Custo Base do FPSO",
            implementation: "Custo estimado de $10.000-15.000 por bpd de capacidade para o FPSO (casco + topsides + instalação). Valor base de $12.000/bpd utilizado.",
            source: "Rystad Energy - Global FPSO Cost Analysis (2023); Wood Mackenzie - Deepwater Cost Benchmarking; Relatórios de Projeto da Petrobras (Sépia, Atapu, Mero)."
        },
        {
            category: "Estimativa de CAPEX",
            concept: "Distribuição de CAPEX (Split)",
            implementation: "Rateio típico para projetos offshore: Plataforma/FPSO (~45%), Poços de Desenvolvimento (~35%), Sistema Submarino (~20%).",
            source: "Wood Mackenzie - Deepwater Project Economics; ANP - Planos de Desenvolvimento; Benchmarking de Projetos Pré-Sal (Tupi, Búzios, Lula)."
        },
        {
            category: "Estimativa de CAPEX",
            concept: "Ajustes de Complexidade (API/GOR)",
            implementation: "Óleo pesado (<25º API) adiciona +15% ao custo do FPSO (aquecimento, separadores). GOR alto (>250 m³/m³) adiciona +20-30% (tratamento e reinjeção de gás).",
            source: "Estudos de Viabilidade de FPSOs (SBM Offshore, Modec, BW Offshore); Relatórios Técnicos de Engenharia de Processos."
        },
        {
            category: "Confiabilidade",
            concept: "OREDA Handbook (Offshore Reliability Data)",
            implementation: "failure_rate_lambda (Taxas de falha de ICVs e Packers)",
            source: "OREDA Joint Industry Project (Handbook 2015/2020)."
        },
        {
            category: "Confiabilidade",
            concept: "ISO 14224",
            implementation: "Classificação de falhas críticas (requer sonda) vs. degradadas",
            source: "ISO 14224: Petroleum and natural gas industries — Collection and exchange of reliability and maintenance data."
        },
        {
            category: "Mercado & Custos",
            concept: "S&P Global / Westwood / Fearnley",
            implementation: "rig_daily_rate, mob_cost (Cenário de mercado aquecido 2025-27)",
            source: "Relatórios de Mercado de Sondas e Embarcações Offshore (2024-2025)."
        },
        {
            category: "Mercado & Custos",
            concept: "Rystad Energy / Plano Petrobras",
            implementation: "Benchmarks de OPEX e estratégia de contratação",
            source: "Rystad Energy UCube; Planejamento Estratégico Petrobras 2024-2028."
        },
        {
            category: "Reservatório",
            concept: "Arps, J.J. (1945)",
            implementation: "Algoritmo base da curva de declínio (nominal_decline, b_factor)",
            source: "Arps, J.J. 'Analysis of Decline Curves', Trans. AIME (1945); Fetkovich, M.J. 'Decline Curve Analysis Using Type Curves' (1980)."
        },
        {
            category: "Reservatório",
            concept: "OTC Brazil / IPTC Papers",
            implementation: "Comportamento de bsw_growth_rate e breakthrough_time em carbonatos",
            source: "OTC-29837-MS (Mero Field Development); IPTC-19567-MS (Búzios Field Reservoir Characterization); SPE-174408-MS (Santos Basin Carbonates)."
        },
        {
            category: "Produtividade",
            concept: "Manuais Técnicos (SLB / Halliburton)",
            implementation: "productivity_multiplier (Skin effect: Open Hole vs. Cased Hole)",
            source: "Schlumberger 'Well Evaluation Conference' (WEC) Brazil; Halliburton 'RedBook' Cementing & Completion tables; SPE Production & Operations."
        },
        {
            category: "Facilidades",
            concept: "Dados Públicos ANP (Mero, Búzios)",
            implementation: "fpso_liquid_limit_ratio (Correlação Líquido vs. Óleo ~1.35x)",
            source: "Boletim da Produção de Petróleo e Gás Natural (BPPGN) - ANP; Dados dinâmicos do SGIP (Sistema de Gestão de Informações de Produção) - Painel Dinâmico."
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Referências Legais e Premissas</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Fontes de dados, legislações e práticas de mercado utilizadas nos cálculos.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Categoria</th>
                                    <th className="p-4 whitespace-nowrap">Regra / Conceito</th>
                                    <th className="p-4 min-w-[300px]">Implementação no Simulador</th>
                                    <th className="p-4 min-w-[300px]">Fonte de Referência / Base Legal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {data.map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap align-top">{row.category}</td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap align-top">{row.concept}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 align-top">{row.implementation}</td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-xs font-mono align-top leading-relaxed">{row.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferencesTable;
