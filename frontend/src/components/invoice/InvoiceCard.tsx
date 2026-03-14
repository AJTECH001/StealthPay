import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { type Invoice } from '../../services/api';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { buildPaymentUrl } from '../../services/stealthpay';

interface InvoiceCardProps {
    invoice: Invoice;
    onReset: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoice,
    onReset
}) => {
    const [copied, setCopied] = React.useState(false);
    const [copiedHash, setCopiedHash] = React.useState(false);
    const [copiedSalt, setCopiedSalt] = React.useState(false);

    const paymentLink = buildPaymentUrl(
        window.location.origin,
        invoice.merchant_address,
        String(invoice.amount),
        invoice.salt || invoice.invoice_hash,
        invoice.token_type
    );

    const handleCopy = () => {
        navigator.clipboard.writeText(paymentLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <GlassCard className="text-center p-8 bg-gradient-to-b from-white/[0.05] to-black/40 border-white/10">
            <h3 className="mb-6 text-3xl font-serif italic text-white">
                Invoice Ready!
            </h3>

            <div className="flex justify-center mb-8">
                <div className="p-4 bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                    <QRCodeSVG
                        value={paymentLink}
                        size={180}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/aleo.svg",
                          x: undefined,
                          y: undefined,
                          height: 28,
                          width: 28,
                          excavate: true,
                        }}
                    />
                </div>
            </div>

            <div className="mb-8">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2 text-left ml-1">Payment Link</label>
                <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-[10px] text-gray-300 truncate text-left flex items-center">
                        {paymentLink}
                    </div>
                    <Button
                        variant={copied ? "secondary" : "secondary"}
                        onClick={handleCopy}
                        className="px-4 text-[10px] uppercase tracking-widest border border-white/10"
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-left">
                <div
                    onClick={() => {
                        navigator.clipboard.writeText(invoice.invoice_hash);
                        setCopiedHash(true);
                        setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-white/20 transition-colors group cursor-pointer active:scale-95"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hash</span>
                        {copiedHash ? (
                            <span className="text-[10px] text-white font-bold">Copied!</span>
                        ) : (
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-white/60 truncate block text-[10px] group-hover:text-white transition-colors" title={invoice.invoice_hash}>
                        {invoice.invoice_hash.slice(0, 10)}...{invoice.invoice_hash.slice(-6)}
                    </span>
                </div>
                <div
                    onClick={() => {
                        if (invoice.salt) {
                            navigator.clipboard.writeText(invoice.salt);
                            setCopiedSalt(true);
                            setTimeout(() => setCopiedSalt(false), 2000);
                        }
                    }}
                    className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-white/20 transition-colors group cursor-pointer active:scale-95"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Salt</span>
                        {copiedSalt ? (
                            <span className="text-[10px] text-white font-bold">Copied!</span>
                        ) : (
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-white/60 truncate block text-[10px] group-hover:text-white transition-colors" title={invoice.salt}>
                        {invoice.salt ? `${invoice.salt.slice(0, 10)}...` : 'N/A'}
                    </span>
                </div>
            </div>

            <p className="text-gray-500 text-[10px] text-center mb-8 italic">
                💡 Payers can use this link to pay privately using StealthPay.
            </p>

            <Button
                variant="ghost"
                className="w-full text-xs uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10"
                onClick={onReset}
            >
                Create Another Invoice
            </Button>
        </GlassCard>
    );
};
