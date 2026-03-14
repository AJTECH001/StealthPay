import React from 'react';
import StatusBadge from '../StatusBadge';
import { LinkButton } from '../ui/LinkButton';
import { CopyButton } from '../ui/CopyButton';
import { type Invoice } from '../../services/api';
import { buildPaymentUrl } from '../../services/stealthpay';

interface InvoiceTableProps {
    invoices: Invoice[];
    loading: boolean;
    search: string;
    currentPage: number;
    itemsPerPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    onSettle: (invoice: Invoice) => void;
    settlingId: string | null;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
    invoices,
    loading,
    search,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    onSettle,
    settlingId
}) => {
    const filteredInvoices = invoices.filter(inv => 
        !search || inv.invoice_hash.toLowerCase().includes(search.toLowerCase()) || (inv.memo && inv.memo.toLowerCase().includes(search.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10 text-left">
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Invoice Hash</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Amount</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">Memo</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {(loading && invoices.length === 0) ? (
                        <tr><td colSpan={5} className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div></td></tr>
                    ) : filteredInvoices.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-12 text-gray-500 italic">{search ? 'No invoices match your search.' : 'No invoices found.'}</td></tr>
                    ) : (
                        paginatedInvoices.map((inv, i) => {
                            const paymentLink = buildPaymentUrl(
                                window.location.origin,
                                inv.merchant_address,
                                String(inv.amount),
                                inv.salt || inv.invoice_hash,
                                inv.token_type
                            );

                            return (
                                <tr
                                    key={inv.invoice_hash}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-300">{inv.invoice_hash.slice(0, 10)}...{inv.invoice_hash.slice(-6)}</span>
                                            <CopyButton text={inv.invoice_hash} title="Copy Invoice Hash" className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-white">{inv.amount}</span>
                                            <span className="text-[10px] text-gray-500 uppercase">{inv.token_type === 1 ? 'USDCx' : 'Credits'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <StatusBadge status={inv.status as any} />
                                    </td>
                                    <td className="py-4 px-6 text-left">
                                        <span className="text-sm text-gray-400 truncate max-w-[150px] block" title={inv.memo}>{inv.memo || '-'}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex gap-2 justify-end w-full">
                                            <LinkButton url={paymentLink} />

                                            {inv.status === 'PENDING' && (
                                                <button
                                                    onClick={() => onSettle(inv)}
                                                    disabled={settlingId === inv.invoice_hash}
                                                    className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded border border-white/20 hover:border-white/50 transition-all text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {settlingId === inv.invoice_hash ? (
                                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        "Mark Settle"
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                                        ? 'bg-white text-black font-bold shadow-lg shadow-white/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};
