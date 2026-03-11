import React from 'react';
import { motion } from 'framer-motion';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export const USDCxInfo: React.FC = () => {
    return (
        <section className="relative z-10 pt-12 pb-20 overflow-hidden w-full max-w-7xl mx-auto px-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-neutral-900/40 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="w-full">
                {/* HERO SECTION */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="text-center mb-6"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                        Power your payments with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">USDCx</span>
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                        USDCx is a wrapped representation of USDC on the Aleo Network, bringing zero-knowledge privacy to stablecoin transactions. Get funded directly from Ethereum.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            className="flex items-center justify-center h-12 px-8 rounded-lg font-medium text-blue-400 hover:text-white hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
                            onClick={() => window.open('https://usdcx.aleo.dev/', '_blank')}
                        >
                            Mint USDCx on Aleo
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <button
                            className="flex items-center justify-center h-12 px-8 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
                            onClick={() => window.open('https://faucet.circle.com/', '_blank')}
                        >
                            Get Sepolia USDC
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                    </div>
                </motion.div>

                {/* FOOTER / DISCLAIMER */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="text-center border-t border-white/5 pt-6 mt-8"
                >
                    <p className="text-xs text-gray-500 max-w-4xl mx-auto leading-relaxed">
                        USDCx is a wrapped representation of USDC on the Aleo Network. Users may deposit USDC to receive USDCx on Aleo. USDC is issued by Circle. Transactions involving USDCx on non-Aleo chains are not private by default and do not benefit from Aleo's zero-knowledge cryptography or privacy-preserving features.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};
