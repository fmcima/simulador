import React from 'react';
import { Download } from 'lucide-react';

const formatMoney = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value / 1000000);
};

const CashFlowTable = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Cabeçalhos das colunas
    const columns = [
        { key: 'year', label: 'Ano', align: 'center' },
        { key: 'productionVolume', label: 'Produção (kbpd)', align: 'right', format: (v) => v.toFixed(1) },
        { key: 'brentPrice', label: 'Brent ($/bbl)', align: 'right', format: (v) => v.toFixed(2) },
        { key: 'revenue', label: 'Receita Bruta ($MM)', align: 'right', format: formatMoney, color: 'text-emerald-700' },
        { key: 'capex', label: 'CAPEX ($MM)', align: 'right', format: formatMoney, color: 'text-red-600' },
        { key: 'capexTax', label: 'Imp. CAPEX ($MM)', align: 'right', format: formatMoney, color: (v) => v < 0 ? 'text-red-500' : 'text-slate-400' },
        { key: 'opex', label: 'OPEX ($MM)', align: 'right', format: formatMoney, color: 'text-orange-600' },
        { key: 'taxes', label: 'Tributos ($MM)', align: 'right', format: formatMoney, color: 'text-purple-600' },
        { key: 'freeCashFlow', label: 'FCL ($MM)', align: 'right', format: formatMoney, bold: true, color: (v) => v >= 0 ? 'text-blue-700' : 'text-red-600' },
        { key: 'accumulatedCashFlow', label: 'Acumulado ($MM)', align: 'right', format: formatMoney, bold: true },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Demonstrativo de Fluxo de Caixa</h2>
                    <p className="text-sm text-slate-500">Detalhamento anual dos principais componentes financeiros.</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <Download size={16} /> Exportar CSV
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={`p-4 whitespace-nowrap text-${col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left'}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row) => (
                            <tr key={row.year} className={`hover:bg-blue-50/50 transition-colors ${row.isDecomYear ? 'bg-orange-50/30' : ''}`}>
                                {columns.map((col) => {
                                    const value = row[col.key];
                                    // CAPEX, OPEX, Taxes vêm negativos do backend para o gráfico, mas na tabela é usual mostrar positivo como "saída" ou manter o sinal. 
                                    // Vamos manter a lógica visual: se a label diz "CAPEX", entendemos que é custo. Mas o backend manda negativo.
                                    // Para "Receita", vem positivo.
                                    // Para evitar confusão, vamos exibir valor absoluto para as colunas de custo se quisermos, OU obedecer o sinal.
                                    // Dado que o gráfico de cascata usa negativo, aqui talvez seja melhor mostrar o "Valor" do componente.
                                    // Mas 'freeCashFlow' é onet.

                                    // Decisão: Exibir como está nos dados (com sinal), exceto talvez CAPEX/OPEX que visualmente costumam ser positivos em tabelas de "Custo". 
                                    // Mas para consistência matemática (FCL = Soma), deixar o sinal é mais seguro.
                                    // O usuário verá -100 no Capex.

                                    let displayValue = value;
                                    let textColor = typeof col.color === 'function' ? col.color(value) : col.color || 'text-slate-700';

                                    if (col.format) displayValue = col.format(value);

                                    return (
                                        <td key={`${row.year}-${col.key}`} className={`p-3 whitespace-nowrap text-${col.align || 'left'}`}>
                                            <span className={`${col.bold ? 'font-bold' : 'font-medium'} ${textColor}`}>
                                                {displayValue}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CashFlowTable;
