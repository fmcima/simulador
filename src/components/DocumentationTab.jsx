import React, { useState, useMemo } from 'react';
import { Search, Book, ChevronRight, ChevronDown, Menu, Activity, Droplet, DollarSign, Wrench, TrendingUp, Calculator, FileText, Anchor } from 'lucide-react';

const DocumentationTab = () => {
    const [activeSectionId, setActiveSectionId] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const scrollToSection = (id) => {
        setActiveSectionId(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const manualData = [
        {
            id: 'overview',
            title: '1. Visão Geral',
            icon: <Activity className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        O simulador é uma ferramenta de avaliação econômica determinística para projetos de exploração e produção (E&P) de óleo e gás.
                        Ele estima o fluxo de caixa livre descontado ao longo da vida útil do projeto, calculando indicadores chave como <strong>VPL</strong>, <strong>TIR</strong> e <strong>Payback</strong>.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Objetivo</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            Fornecer transparência total sobre como os resultados econômicos são gerados, permitindo sensibilidade e análise de cenários.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'inputs',
            title: '2. Entradas de Dados',
            icon: <FileText className="w-4 h-4" />,
            subsections: [
                {
                    id: 'dashboard',
                    title: '2.1. Dashboard (Visão Geral)',
                    content: (
                        <div className="space-y-4">
                            <p className="text-slate-600 dark:text-slate-300">
                                Nessa tela, o usuário pode rodar uma simulação simplificada, ajustando dados macro.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-400 marker:text-blue-500">
                                <li>
                                    <strong className="text-slate-800 dark:text-slate-200">Investimento (CAPEX):</strong>
                                    <span className="block mt-1 ml-2 text-xs">Montante Total e Perfil de Desembolso.</span>
                                </li>
                                <li>
                                    <strong className="text-slate-800 dark:text-slate-200">Produção & Preço:</strong>
                                    <span className="block mt-1 ml-2 text-xs">Estratégia Brent (Flat vs Curva), Produção Pico e Declínio.</span>
                                </li>
                                <li>
                                    <strong className="text-slate-800 dark:text-slate-200">Premissas Financeiras:</strong>
                                    <span className="block mt-1 ml-2 text-xs">TMA, Duração e Inflação.</span>
                                </li>
                            </ul>
                        </div>
                    )
                },
                {
                    id: 'production',
                    title: '2.2. Aba Produção',
                    content: (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-600 dark:text-slate-300">Permite o refino geológico e de engenharia de reservatório.</p>

                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Parametrização da Curva</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                                        <div className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-1">Modo Simplificado</div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Seleção de perfis típicos (Pré-Sal, Pós-Sal). Ajuste manual de Pico, Platô e Declínio Nominal.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                                        <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-1">Modo Detalhado</div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Controle granular por <strong>Tipo de Campo</strong> (Tupi, Mero, Jubarte) e <strong>Completação</strong> (Convencional vs Inteligente). Ajuste fino do Fator Hiperbólico.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Propriedades dos Fluidos</h4>
                                <ul className="space-y-2">
                                    <li className="text-xs text-slate-600 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-200">API do Óleo:</strong> Ajusta o preço do Brent em ±0.4% para cada grau de diferença do API 30.
                                    </li>
                                    <li className="text-xs text-slate-600 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-200">GOR:</strong> Razão Gás-Óleo &gt; 200 gera custos extras de reinjeção.
                                    </li>
                                    <li className="text-xs text-slate-600 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-200">Capacidade de Líquidos:</strong> Limita a produção de óleo conforme o BSW aumenta:
                                        <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded ml-1">Q_oleo ≤ Cap × (1 - BSW)</code>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'opex',
                    title: '2.3. Aba Custos (OPEX)',
                    content: (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Detalhamento dos custos operacionais via Modos Simplificado (% da Receita) ou Detalhado (Itemizado).
                            </p>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300">
                                    Cálculo de Workover (Intervenção)
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-center my-2">
                                        <code className="text-sm bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded text-orange-600 dark:text-orange-400 font-mono">
                                            Custo = N_poços × λ × (C_mob + Diária × Dias)
                                        </code>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                            <div className="text-[10px] text-slate-400">λ (Freq)</div>
                                            <div className="font-bold text-xs">0.15/ano</div>
                                        </div>
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                            <div className="text-[10px] text-slate-400">C_mob</div>
                                            <div className="font-bold text-xs">$20 MM</div>
                                        </div>
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                            <div className="text-[10px] text-slate-400">Diária</div>
                                            <div className="font-bold text-xs">$800k</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'capex',
                    title: '2.4. Aba CAPEX',
                    content: (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                    <h5 className="font-bold text-blue-600 dark:text-blue-400 text-sm mb-2 flex items-center gap-2">
                                        <Anchor className="w-4 h-4" /> FPSO
                                    </h5>
                                    <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                                        <li><strong>Casco:</strong> Conversão (Barato) vs Newbuild (Caro/Longevo).</li>
                                        <li><strong>Topsides:</strong> Custo por Tonelada definido pela Complexidade (CO2).</li>
                                        <li><strong>Integração:</strong> Brasil (Premium) vs Ásia.</li>
                                    </ul>
                                </div>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                    <h5 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-2 flex items-center gap-2">
                                        <Wrench className="w-4 h-4" /> Poços
                                    </h5>
                                    <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                                        <li><strong>Config:</strong> Nº Produtores/Injetores, Tipo (Pré/Pós).</li>
                                        <li><strong>Cronograma:</strong> Dias de Perfuração/Completação + Curva Aprendizado.</li>
                                        <li><strong>Tech:</strong> Poços Inteligentes e Fibra Óptica (FOH).</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800">
                                <h5 className="font-bold text-purple-700 dark:text-purple-300 text-xs mb-1">Split de Custos & Repetro</h5>
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                    A divisão entre Plataforma, Poços e Subsea é crucial para o cálculo fiscal, pois cada categoria tem regras de isenção diferentes.
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'tax',
                    title: '2.5 e 2.6. Mercado e Tributos',
                    content: (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2">Cenários de Mercado</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Curvas <strong>Otimista</strong> (Bull) e <strong>Transição Energética</strong> (Bear) disponíveis para sensibilidade.
                                </p>
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2">Regimes Tributários</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                        <div className="font-bold text-xs">Concessão</div>
                                        <div className="text-[10px] text-slate-500">Royalties + Part. Especial</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                        <div className="font-bold text-xs">Partilha</div>
                                        <div className="text-[10px] text-slate-500">Custo em Óleo + Profit Oil</div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2">Depreciação</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                    Métodos Linear, Acelerada e <strong>UOP (Unidades Produzidas)</strong>.
                                </p>
                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs font-mono text-center text-slate-600 dark:text-slate-400">
                                    Deprec_t = Saldo × (Prod_t / Reservas)
                                </div>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            id: 'calculation',
            title: '3. Motor de Cálculo',
            icon: <Calculator className="w-4 h-4" />,
            content: (
                <div className="space-y-6 text-sm">
                    <p className="text-slate-600 dark:text-slate-300">O cálculo é realizado ano a ano (t=0 a t=n).</p>

                    <div className="space-y-4">
                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.1. Curva de Produção (Arps)</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ramp-up, Platô e Declínio Hiperbólico.</p>
                            <div className="flex justify-center my-4">
                                <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                    <span className="italic font-bold">q(t)</span>
                                    <span>=</span>
                                    <div className="flex flex-col items-center">
                                        <span className="border-b border-slate-400 dark:border-slate-500 w-full text-center pb-1 mb-1">
                                            q<sub>max</sub>
                                        </span>
                                        <span className="text-center">
                                            (1 + b · D<sub>i</sub> · t)<sup>1/b</sup>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong className="font-serif">q(t)</strong>: Vazão no tempo t.</li>
                                    <li><strong className="font-serif">q<sub>max</sub></strong>: Vazão máxima (Platô).</li>
                                    <li><strong className="font-serif">b</strong>: Fator Hiperbólico (0 a 1).</li>
                                    <li><strong className="font-serif">D<sub>i</sub></strong>: Declínio Nominal Inicial (% a.a.).</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.2. Restrição de Líquidos e BSW</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">A água aumenta conforme uma curva logística ("S-Curve"). O óleo é "expulso" pela água quando atinge a capacidade da planta.</p>
                            <div className="space-y-4 my-4">
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                        <span className="italic font-bold">BSW(t)</span>
                                        <span>=</span>
                                        <div className="flex flex-col items-center">
                                            <span className="border-b border-slate-400 dark:border-slate-500 w-full text-center pb-1 mb-1">
                                                BSW<sub>max</sub>
                                            </span>
                                            <span className="text-center">
                                                1 + e<sup>-k · (t - t<sub>infl</sub>)</sup>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                        <span className="italic font-bold">Q<sub>oleo</sub>(t)</span>
                                        <span>=</span>
                                        <span>Min</span>
                                        <span className="text-2xl">(</span>
                                        <span className="italic">Q<sub>potencial</sub>, Cap<sub>liq</sub> · (1 - BSW(t))</span>
                                        <span className="text-2xl">)</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="font-serif">BSW<sub>max</sub></strong>: BSW máximo permitido (limite físico).</li>
                                        <li><strong className="font-serif">k</strong>: Velocidade de crescimento da água.</li>
                                        <li><strong className="font-serif">t<sub>infl</sub></strong>: Ano de inflexão (quando a água acelera).</li>
                                        <li><strong className="font-serif">Q<sub>potencial</sub></strong>: Produção téorica sem restrição.</li>
                                        <li><strong className="font-serif">Cap<sub>liq</sub></strong>: Capacidade de processamento de líquidos da planta.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.3. Receita Bruta</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Volume de óleo multiplicado pelo preço corrigido pela qualidade (API).</p>
                            <div className="flex flex-col items-center my-4 gap-4">
                                <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                    <span className="italic font-bold">RB(t)</span>
                                    <span>=</span>
                                    <span className="italic">Q<sub>oleo</sub>(t)</span>
                                    <span>·</span>
                                    <span>(</span>
                                    <span className="italic">P<sub>Brent</sub>(t) + ∆<sub>API</sub></span>
                                    <span>)</span>
                                    <span>·</span>
                                    <span>365</span>
                                </div>
                                <div className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="font-serif">Q<sub>oleo</sub></strong>: Vazão diária de óleo (bbl/d).</li>
                                        <li><strong className="font-serif">P<sub>Brent</sub></strong>: Preço do Brent no ano t ($/bbl).</li>
                                        <li><strong className="font-serif">∆<sub>API</sub></strong>: Ajuste de qualidade (Premium ou Desconto).</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.4. Deduções Governamentais (Gov Take)</h5>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Royalties:</span>
                                    <div className="flex justify-center my-2">
                                        <div className="flex items-center gap-3 font-serif text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                            <span className="italic font-bold">ROY(t)</span>
                                            <span>=</span>
                                            <span className="italic">RB(t)</span>
                                            <span>·</span>
                                            <span>%Royalty</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Participação Especial (PE):</span>
                                    <p className="text-[10px] text-slate-500 mb-1">Aplicada trimestralmente sobre a Receita Líquida Fiscal.</p>
                                    <div className="flex justify-center my-2">
                                        <div className="flex items-center gap-3 font-serif text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                            <span className="italic font-bold">PE(t)</span>
                                            <span>=</span>
                                            <span>(</span>
                                            <span className="italic">RB(t) - Deduções</span>
                                            <span>)</span>
                                            <span>·</span>
                                            <span>Alíquota<sub>Prog</sub></span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 mt-2">
                                        <strong className="block mb-1 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li><strong className="font-serif">%Royalty</strong>: Geralmente 10% ou 15% da Receita Bruta.</li>
                                            <li><strong className="font-serif">Deduções</strong>: OPEX, Depreciação e Royalties pagos.</li>
                                            <li><strong className="font-serif">Alíquota<sub>Prog</sub></strong>: Tabela progressiva da ANP baseada em produção/profundidade.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.5. CAPEX Efetivo e Repetro</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">O custo final inclui impostos não recuperáveis ("Gross Up"), mitigados pelo Repetro.</p>
                            <div className="flex flex-col items-center my-4 gap-4">
                                <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                    <span className="italic font-bold">CAPEX<sub>Final</sub></span>
                                    <span>=</span>
                                    <span className="italic">CAPEX<sub>Base</sub></span>
                                    <span>·</span>
                                    <span>(</span>
                                    <span>1 + ∑</span>
                                    <span className="text-sm">(</span>
                                    <span className="italic text-sm">%Item · (1 - %Repetro) · Taxa</span>
                                    <span className="text-sm">)</span>
                                    <span>)</span>
                                </div>
                                <div className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="font-serif">CAPEX<sub>Base</sub></strong>: Custo de mercado sem impostos.</li>
                                        <li><strong className="font-serif">%Item</strong>: Peso do item no custo total (ex: 40% Hull).</li>
                                        <li><strong className="font-serif">%Repetro</strong>: Percentual do item coberto pelo benefício fiscal (0% a 100%).</li>
                                        <li><strong className="font-serif">Taxa</strong>: Carga tributária sem benefício (aprox. 40-45%).</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.6. Depreciação</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Define o abatimento fiscal do investimento. Três métodos suportados:</p>
                            <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1 mb-2">
                                <li><strong>Linear:</strong> Valor / Anos (ex: 10 anos).</li>
                                <li><strong>Acelerada:</strong> Prazo reduzido (ex: 5 anos). Aumenta VPL.</li>
                                <li><strong>UOP (Unidades Produzidas):</strong> Proporcional à produção.</li>
                            </ul>
                            <div className="flex flex-col items-center my-4 gap-4">
                                <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                    <span className="italic font-bold">Deprec<sub>UOP</sub>(t)</span>
                                    <span>=</span>
                                    <span className="italic">Saldo(t-1)</span>
                                    <span>·</span>
                                    <div className="flex flex-col items-center">
                                        <span className="border-b border-slate-400 dark:border-slate-500 w-full text-center pb-1 mb-1">
                                            Prod(t)
                                        </span>
                                        <span className="text-center italic">
                                            Reservas(t-1)
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="font-serif">Saldo(t-1)</strong>: Valor não depreciado do ativo no início do ano.</li>
                                        <li><strong className="font-serif">Prod(t)</strong>: Produção acumulada no ano.</li>
                                        <li><strong className="font-serif">Reservas(t-1)</strong>: Reservas remanescentes no início do ano.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.7. Imposto de Renda e CSLL</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Incide sobre o Lucro Real (34%). Permite compensar prejuízos passados (trava de 30%).</p>
                            <div className="space-y-4 my-4">
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                        <span className="italic font-bold">LucroReal</span>
                                        <span>=</span>
                                        <span className="italic">RB - Roy - PE - OPEX - Deprec</span>
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-3 font-serif text-lg bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                        <span className="italic font-bold">Impostos</span>
                                        <span>=</span>
                                        <span>(</span>
                                        <span className="italic">LucroReal - Compensação</span>
                                        <span>)</span>
                                        <span>·</span>
                                        <span>34%</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="font-serif">Compensação</strong>: Uso de prejuízos fiscais acumulados (limitado a 30% do Lucro Real).</li>
                                        <li><strong className="font-serif">34%</strong>: Soma das alíquotas de IRPJ (25%) e CSLL (9%).</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100">3.8. Fluxo de Caixa Livre (FCF)</h5>
                            <div className="flex flex-col items-center my-4 gap-4">
                                <div className="flex items-center gap-3 font-serif text-lg bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800">
                                    <span className="italic font-bold text-blue-800 dark:text-blue-300">FCF</span>
                                    <span className="text-blue-800 dark:text-blue-300">=</span>
                                    <span className="italic text-slate-600 dark:text-slate-400">(Receita - GovTake)</span>
                                    <span className="text-slate-400">-</span>
                                    <span className="italic text-red-600 dark:text-red-400">OPEX</span>
                                    <span className="text-slate-400">-</span>
                                    <span className="italic text-red-600 dark:text-red-400">Impostos</span>
                                    <span className="text-slate-400">-</span>
                                    <span className="italic text-orange-600 dark:text-orange-400">Investimentos</span>
                                </div>
                                <div className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    <strong className="block mb-2 text-slate-700 dark:text-slate-300">Variáveis:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="font-serif">GovTake</strong>: Royalties + Participação Especial (governo).</li>
                                        <li><strong className="font-serif">Investimentos</strong>: CAPEX + Abandono (descomissionamento).</li>
                                    </ul>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )
        },
        {
            id: 'indicators',
            title: '4. Indicadores Econômicos',
            icon: <TrendingUp className="w-4 h-4" />,
            content: (
                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        { label: 'VPL', desc: 'Valor Presente Líquido. Se > 0, cria valor.', color: 'text-blue-600' },
                        { label: 'TIR', desc: 'Taxa Interna de Retorno. Velocidade da rentabilidade.', color: 'text-emerald-600' },
                        { label: 'Spread', desc: 'TIR - TMA. Margem de segurança.', color: 'text-purple-600' },
                        { label: 'VPL / IA', desc: 'Eficiência. Quantos $ retornam por $ investido.', color: 'text-indigo-600' },
                        { label: 'Payback', desc: 'Tempo para recuperar o investimento inicial.', color: 'text-orange-600' },
                        { label: 'Breakeven', desc: 'Preço do Brent para VPL = 0 (Resiliência).', color: 'text-slate-600' },
                    ].map((item) => (
                        <div key={item.label} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className={`font-bold ${item.color} mb-1`}>{item.label}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</div>
                        </div>
                    ))}
                </div>
            )
        }
    ];

    // Filter content based on search
    const filteredData = useMemo(() => {
        if (!searchTerm) return manualData;
        const lowerTerm = searchTerm.toLowerCase();

        return manualData.map(section => {
            const matchesTitle = section.title.toLowerCase().includes(lowerTerm);
            const matchesSub = section.subsections?.some(sub => sub.title.toLowerCase().includes(lowerTerm));

            // If main section matches, return all. If subsection matches, return expanded section.
            if (matchesTitle || matchesSub) return { ...section, expanded: true };
            return null;
        }).filter(Boolean);
    }, [searchTerm]);

    return (
        <div className="flex h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 mx-4 mb-4 shadow-sm">
            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Book className="w-5 h-5 text-blue-600" />
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 overflow-hidden whitespace-nowrap">Manual</h2>
                </div>

                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredData.map(section => (
                        <div key={section.id}>
                            <button
                                onClick={() => scrollToSection(section.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSectionId === section.id || (section.subsections && section.subsections.some(s => s.id === activeSectionId)) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {section.icon}
                                <span className="truncate text-left flex-1">{section.title}</span>
                                {section.subsections && <ChevronDown className="w-3 h-3 opacity-50" />}
                            </button>

                            {/* Subsections Links */}
                            {section.subsections && (activeSectionId === section.id || section.subsections.some(s => s.id === activeSectionId)) && (
                                <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                                    {section.subsections.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => scrollToSection(sub.id)}
                                            className={`w-full text-left text-xs py-1.5 px-2 rounded-md transition-colors ${activeSectionId === sub.id ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            {sub.title.split('. ')[1] || sub.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950/50 relative">
                {/* Mobile Toggle */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute top-4 left-4 z-10 p-2 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 md:hidden"
                >
                    <Menu className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-12 pb-20">
                        {filteredData.map(section => (
                            <div key={section.id} id={section.id} className="scroll-mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                                        {React.cloneElement(section.icon, { className: "w-6 h-6" })}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{section.title}</h2>
                                </div>

                                {/* Main Section Content */}
                                {section.content && (
                                    <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
                                        {section.content}
                                    </div>
                                )}

                                {/* Subsections Cards */}
                                {section.subsections && (
                                    <div className="grid gap-6">
                                        {section.subsections.map(sub => (
                                            <div key={sub.id} id={sub.id} className={`bg-white dark:bg-slate-900 rounded-xl border transition-all duration-300 ${activeSectionId === sub.id ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                                                <button
                                                    onClick={() => setActiveSectionId(sub.id === activeSectionId ? '' : sub.id)}
                                                    className="w-full flex justify-between items-center p-5 text-left"
                                                >
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{sub.title}</h3>
                                                    <div className={`p-1 rounded-full transition-transform duration-300 ${activeSectionId === sub.id ? 'rotate-180 bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                </button>

                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeSectionId === sub.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/50">
                                                        <div className="pt-4 text-slate-600 dark:text-slate-300 leading-relaxed space-y-4">
                                                            {sub.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Footer */}
                        <div className="pt-10 mt-10 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                            <p>Simulador de Projetos de Investimento &copy; 2026</p>
                            <p>Documentação dinâmica atualizada em tempo real.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentationTab;
